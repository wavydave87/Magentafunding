import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Partner provisioning. Every handler verifies the caller holds the internal
 * admin role through their own RLS-scoped client BEFORE the service-role
 * client is loaded — partners and reps can never reach these paths.
 */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only Magenta administrators can manage partner accounts.");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PARTNER_TYPES = ["iso", "referral_partner", "strategic_partner"] as const;
const MEMBER_ROLES = [
  "organization_admin",
  "manager",
  "broker",
  "referral_rep",
  "viewer",
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export interface NewOrganizationInput {
  name: string;
  legal_name?: string;
  partner_type: (typeof PARTNER_TYPES)[number];
  primary_contact_name?: string;
  primary_contact_email?: string;
  phone?: string;
  website?: string;
  assigned_rep_id?: string | null;
}

/** Create a partner organization. Admin only. */
export const createPartnerOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewOrganizationInput) => {
    if (!input?.name?.trim()) throw new Error("Organization name is required.");
    if (!PARTNER_TYPES.includes(input.partner_type))
      throw new Error("Choose a valid partner type.");
    if (input.primary_contact_email && !EMAIL.test(input.primary_contact_email))
      throw new Error("Primary contact email is not valid.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const base = slugify(data.name) || "partner";
    let slug = base;
    for (let attempt = 1; attempt < 20; attempt += 1) {
      const { data: clash } = await supabaseAdmin
        .from("partner_organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${attempt + 1}`;
    }

    const { data: org, error } = await supabaseAdmin
      .from("partner_organizations")
      .insert({
        name: data.name.trim(),
        legal_name: data.legal_name?.trim() || null,
        slug,
        partner_type: data.partner_type,
        status: "active",
        primary_contact_name: data.primary_contact_name?.trim() || null,
        primary_contact_email: data.primary_contact_email?.trim().toLowerCase() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        assigned_rep_id: data.assigned_rep_id || null,
      })
      .select("id, name, slug")
      .single();
    if (error) throw new Error(error.message);

    return org;
  });

export interface NewPartnerMemberInput {
  organization_id: string;
  email: string;
  full_name: string;
  role: (typeof MEMBER_ROLES)[number];
  password: string;
}

/**
 * Create (or link) a login and attach it to a partner organization.
 * Used for the organization's first admin and any later seats.
 */
export const createPartnerMemberAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewPartnerMemberInput) => {
    if (!input?.organization_id) throw new Error("An organization is required.");
    if (!EMAIL.test(input.email ?? "")) throw new Error("A valid email address is required.");
    if (!input.full_name?.trim()) throw new Error("Full name is required.");
    if (!MEMBER_ROLES.includes(input.role)) throw new Error("Choose a valid partner role.");
    if (!input.password || input.password.length < 8)
      throw new Error("Temporary password must be at least 8 characters.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();

    // Never hand a partner seat to someone who already holds an internal role.
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name.trim() },
    });

    let userId = created.data.user?.id ?? null;
    if (!userId) {
      if (!/already/i.test(created.error?.message ?? "")) {
        throw new Error(created.error?.message ?? "Could not create the account.");
      }
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (!userId) throw new Error("That email already exists but could not be located.");
    }

    const { data: internalRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if ((internalRoles ?? []).length > 0) {
      throw new Error("That account is a Magenta staff login and cannot become a partner user.");
    }

    const { data: existing } = await supabaseAdmin
      .from("partner_members")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const row = {
      organization_id: data.organization_id,
      user_id: userId,
      full_name: data.full_name.trim(),
      email,
      role: data.role,
      status: "active" as const,
    };

    const { error: memberError } = existing
      ? await supabaseAdmin.from("partner_members").update(row).eq("id", existing.id)
      : await supabaseAdmin.from("partner_members").insert(row);
    if (memberError) throw new Error(memberError.message);

    return { ok: true, user_id: userId, email };
  });

/** Change a partner member's role or status. Admin only. */
export const updatePartnerMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { member_id: string; role?: string; status?: "pending" | "active" | "inactive" }) => {
      if (!input?.member_id) throw new Error("A member is required.");
      if (input.role && !MEMBER_ROLES.includes(input.role as (typeof MEMBER_ROLES)[number]))
        throw new Error("Choose a valid partner role.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { role?: string; status?: string } = {};
    if (data.role) patch.role = data.role;
    if (data.status) patch.status = data.status;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("partner_members")
      .update(patch as never)
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
