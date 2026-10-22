import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { partnerViewMutate } from "@/lib/partner-view.functions";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Self-serve team management for partner organization admins.
 *
 * Every handler resolves the caller's own membership through their RLS-scoped
 * client BEFORE the service-role client is loaded, so an org admin can only
 * ever create or change seats inside their own organization.
 */
const MEMBER_ROLES = [
  "organization_admin",
  "manager",
  "broker",
  "referral_rep",
  "viewer",
] as const;
export type TeamRole = (typeof MEMBER_ROLES)[number];

async function assertOrgAdmin(context: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await context.supabase
    .from("partner_members")
    .select("organization_id, role, status")
    .eq("user_id", context.userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "organization_admin") {
    throw new Error("Only an organization admin can manage your team.");
  }
  return data.organization_id as string;
}

/*
 * The legacy `inviteTeamMember` path is deliberately gone. It created a
 * password account directly and accepted any role, which let an org admin
 * mint an organization admin outside the approved flow. All invitations now
 * go through `partner-invitations.functions.ts`: hashed, expiring,
 * single-use tokens, standard roles only, audited.
 */

/** Change a seat's role or status inside the caller's own organization. */
export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { member_id: string; role?: TeamRole; status?: "active" | "inactive" }) => {
      if (!input?.member_id) throw new Error("A team member is required.");
      if (input.role && !MEMBER_ROLES.includes(input.role))
        throw new Error("Choose a valid role.");
      // Only Magenta can create or promote an organization admin.
      if (input.role === "organization_admin")
        throw new Error("Only Magenta can make someone an organization admin.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    if (getCookie("mg_partner_view")) {
      return partnerViewMutate({ data: { action: "update_team_member", payload: data as Record<string, string> } });
    }
    const organizationId = await assertOrgAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member } = await supabaseAdmin
      .from("partner_members")
      .select("id, organization_id, user_id, role")
      .eq("id", data.member_id)
      .maybeSingle();
    if (!member || member.organization_id !== organizationId) {
      throw new Error("That team member is not part of your organization.");
    }
    if (member.user_id === context.userId && (data.status === "inactive" || data.role)) {
      throw new Error("You can't change your own seat. Ask another organization admin.");
    }

    const patch: Record<string, string> = {};
    if (data.role) patch['role'] = data.role;
    if (data.status) patch['status'] = data.status;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("partner_members")
      .update(patch as never)
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Organization admins may correct their own organization's contact details.
 *
 * Partners have no UPDATE policy on `partner_organizations`, so this runs
 * through the service-role client AFTER the caller's own RLS-scoped client
 * proves they are an active organization admin. Only contact fields are
 * writable — name, type, status, commission rate and rep assignment stay
 * with Magenta. Every change is audited.
 */
export const updateOrganizationContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      primary_contact_name?: string | null;
      primary_contact_email?: string | null;
      phone?: string | null;
      website?: string | null;
    }) => {
      const email = input?.primary_contact_email?.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid contact email address.");
      return input ?? {};
    },
  )
  .handler(async ({ data, context }) => {
    if (getCookie("mg_partner_view")) {
      return partnerViewMutate({ data: { action: "update_organization_contact", payload: data } });
    }
    const organizationId = await assertOrgAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("partner_organizations")
      .select("primary_contact_name, primary_contact_email, phone, website")
      .eq("id", organizationId)
      .maybeSingle();

    const patch = {
      primary_contact_name: data.primary_contact_name?.trim() || null,
      primary_contact_email: data.primary_contact_email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
    };

    const { error } = await supabaseAdmin
      .from("partner_organizations")
      .update(patch)
      .eq("id", organizationId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("partner_admin_audit_log").insert({
      actor_user_id: context.userId,
      entity_type: "partner_organization",
      entity_id: organizationId,
      action: "update_contact",
      previous_value: before ?? null,
      new_value: patch,
      reason: "Organization admin updated contact details from portal settings.",
    });

    return { ok: true };
  });
