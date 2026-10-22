/**
 * Partner invitations.
 *
 * Tokens are random 32-byte values shown exactly once in the invite link and
 * stored only as a SHA-256 hash. Every mutation resolves the caller's real
 * identity first: Magenta admins may invite into any organization, partner
 * organization admins only into their own and only into non-admin partner
 * roles. Acceptance reuses the existing Supabase auth identity model.
 */
import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roles an organization admin may hand out. Never organization_admin. */
export const ORG_ADMIN_ASSIGNABLE_ROLES = ["referral_rep", "broker", "viewer"] as const;
export const ALL_INVITE_ROLES = [
  "organization_admin",
  "manager",
  "broker",
  "referral_rep",
  "viewer",
] as const;
export type InviteRole = (typeof ALL_INVITE_ROLES)[number];

const INVITE_TTL_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function freshToken() {
  const token = randomBytes(32).toString("hex");
  return { token, token_hash: hashToken(token) };
}

function expiry() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
}

interface Caller {
  supabase: any;
  userId: string;
}

interface Authority {
  isMagentaAdmin: boolean;
  organizationId: string | null;
  actorName: string;
}

/** Who is asking, and what may they do? Resolved through the caller's own client. */
async function resolveAuthority(context: Caller): Promise<Authority> {
  // Never let the real administrator's broader invitation permissions answer
  // a request made while a Partner View cookie exists.
  if (getCookie("mg_partner_view")) throw new Error("Invitation management is not yet available in Partner View. Exit to use the internal workspace.");
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { data: member } = await context.supabase
    .from("partner_members")
    .select("organization_id, role, status, full_name")
    .eq("user_id", context.userId)
    .eq("status", "active")
    .maybeSingle();

  const isOrgAdmin = member?.role === "organization_admin";
  if (!isAdmin && !isOrgAdmin) {
    throw new Error("Only Magenta admins and organization admins can manage invitations.");
  }
  return {
    isMagentaAdmin: Boolean(isAdmin),
    organizationId: isOrgAdmin ? (member?.organization_id as string) : null,
    actorName: (member?.full_name as string) ?? "Magenta",
  };
}

function assertRoleAllowed(authority: Authority, role: InviteRole) {
  if (authority.isMagentaAdmin) return;
  if (!(ORG_ADMIN_ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    throw new Error(
      "Organization admins can invite partner users only. Ask Magenta to add another organization admin.",
    );
  }
}

function assertOrgAllowed(authority: Authority, organizationId: string) {
  if (authority.isMagentaAdmin) return;
  if (authority.organizationId !== organizationId) {
    throw new Error("You can only invite people into your own organization.");
  }
}

async function audit(
  admin: any,
  entry: {
    actor_user_id: string;
    entity_id: string;
    action: string;
    new_value?: unknown;
    previous_value?: unknown;
    reason?: string;
  },
) {
  await admin.from("partner_admin_audit_log").insert({
    actor_user_id: entry.actor_user_id,
    entity_type: "partner_invitation",
    entity_id: entry.entity_id,
    action: entry.action,
    new_value: (entry.new_value ?? null) as never,
    previous_value: (entry.previous_value ?? null) as never,
    reason: entry.reason ?? null,
  });
}

export interface CreateInvitationInput {
  organization_id?: string;
  email: string;
  full_name: string;
  role: InviteRole;
}

export interface InvitationResult {
  id: string;
  email: string;
  /** The single-use link. Shown once; never stored in plain text. */
  invite_url: string;
  expires_at: string;
}

/** Create a pending invitation and return its one-time link. */
export const createPartnerInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateInvitationInput) => {
    if (!EMAIL.test(input?.email ?? "")) throw new Error("A valid email address is required.");
    if (!input.full_name?.trim()) throw new Error("A name is required.");
    if (!(ALL_INVITE_ROLES as readonly string[]).includes(input.role))
      throw new Error("Choose a valid role.");
    return input;
  })
  .handler(async ({ data, context }): Promise<InvitationResult> => {
    const authority = await resolveAuthority(context);
    const organizationId = data.organization_id ?? authority.organizationId;
    if (!organizationId) throw new Error("An organization is required.");
    assertOrgAllowed(authority, organizationId);
    assertRoleAllowed(authority, data.role);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // Expire anything stale before checking for a live duplicate.
    await supabaseAdmin
      .from("partner_invitations")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const { data: live } = await supabaseAdmin
      .from("partner_invitations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("invited_email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (live) {
      throw new Error("There's already a live invitation for that email. Resend it instead.");
    }

    const { data: existingMember } = await supabaseAdmin
      .from("partner_members")
      .select("id, organization_id, status")
      .eq("email", email)
      .maybeSingle();
    if (existingMember && existingMember.organization_id !== organizationId) {
      throw new Error("That person already belongs to another partner organization.");
    }

    const { token, token_hash } = freshToken();
    const { data: row, error } = await supabaseAdmin
      .from("partner_invitations")
      .insert({
        organization_id: organizationId,
        invited_email: email,
        full_name: data.full_name.trim(),
        intended_role: data.role,
        invited_by: context.userId,
        token_hash,
        expires_at: expiry(),
      })
      .select("id, expires_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(supabaseAdmin, {
      actor_user_id: context.userId,
      entity_id: row.id,
      action: "invitation_created",
      new_value: { email, role: data.role, organization_id: organizationId },
    });

    return {
      id: row.id,
      email,
      invite_url: `/portal/invite/${token}`,
      expires_at: row.expires_at,
    };
  });

/** Issue a fresh token for a pending invitation; the old link stops working. */
export const resendPartnerInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { invitation_id: string }) => {
    if (!input?.invitation_id) throw new Error("An invitation is required.");
    return input;
  })
  .handler(async ({ data, context }): Promise<InvitationResult> => {
    const authority = await resolveAuthority(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invitation } = await supabaseAdmin
      .from("partner_invitations")
      .select("id, organization_id, invited_email, status, resend_count, intended_role")
      .eq("id", data.invitation_id)
      .maybeSingle();
    if (!invitation) throw new Error("That invitation no longer exists.");
    assertOrgAllowed(authority, invitation.organization_id);
    if (invitation.status === "accepted") throw new Error("That invitation was already accepted.");

    const { token, token_hash } = freshToken();
    const { data: row, error } = await supabaseAdmin
      .from("partner_invitations")
      .update({
        token_hash,
        status: "pending",
        expires_at: expiry(),
        revoked_at: null,
        resend_count: (invitation.resend_count ?? 0) + 1,
      })
      .eq("id", invitation.id)
      .select("id, expires_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(supabaseAdmin, {
      actor_user_id: context.userId,
      entity_id: invitation.id,
      action: "invitation_resent",
      new_value: { email: invitation.invited_email },
    });

    return {
      id: row.id,
      email: invitation.invited_email,
      invite_url: `/portal/invite/${token}`,
      expires_at: row.expires_at,
    };
  });

/** Kill a pending invitation. The link stops working immediately. */
export const revokePartnerInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { invitation_id: string }) => {
    if (!input?.invitation_id) throw new Error("An invitation is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const authority = await resolveAuthority(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invitation } = await supabaseAdmin
      .from("partner_invitations")
      .select("id, organization_id, status, invited_email")
      .eq("id", data.invitation_id)
      .maybeSingle();
    if (!invitation) throw new Error("That invitation no longer exists.");
    assertOrgAllowed(authority, invitation.organization_id);
    if (invitation.status === "accepted") throw new Error("That invitation was already accepted.");

    const { error } = await supabaseAdmin
      .from("partner_invitations")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        // Rotate the hash so the outstanding link can never be replayed.
        token_hash: freshToken().token_hash,
      })
      .eq("id", invitation.id);
    if (error) throw new Error(error.message);

    await audit(supabaseAdmin, {
      actor_user_id: context.userId,
      entity_id: invitation.id,
      action: "invitation_revoked",
      new_value: { email: invitation.invited_email },
    });
    return { ok: true };
  });

export interface InvitationPreview {
  state: "valid" | "expired" | "revoked" | "accepted" | "unknown";
  full_name: string | null;
  email: string | null;
  organization_name: string | null;
  role: InviteRole | null;
  /** True when this email already has a Magenta Portal sign-in. */
  has_account: boolean;
}

/** Public: describe an invitation from its token without exposing anything else. */
export const lookupPartnerInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    if (!input?.token) throw new Error("An invitation token is required.");
    return input;
  })
  .handler(async ({ data }): Promise<InvitationPreview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("partner_invitations")
      .select(
        "id, invited_email, full_name, intended_role, status, expires_at, organization:partner_organizations(name)",
      )
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();

    const blank: InvitationPreview = {
      state: "unknown",
      full_name: null,
      email: null,
      organization_name: null,
      role: null,
      has_account: false,
    };
    if (!row) return blank;

    const expired = new Date(row.expires_at).getTime() < Date.now();
    const state: InvitationPreview["state"] =
      row.status === "accepted"
        ? "accepted"
        : row.status === "revoked"
          ? "revoked"
          : row.status === "expired" || expired
            ? "expired"
            : "valid";

    let hasAccount = false;
    if (state === "valid") {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      hasAccount = Boolean(
        list?.users.some((u) => u.email?.toLowerCase() === row.invited_email.toLowerCase()),
      );
    }

    return {
      state,
      full_name: row.full_name,
      email: state === "valid" ? row.invited_email : null,
      organization_name:
        (row.organization as { name: string } | null)?.name ?? null,
      role: row.intended_role as InviteRole,
      has_account: hasAccount,
    };
  });

export interface AcceptInvitationInput {
  token: string;
  full_name: string;
  password?: string;
  accepted_terms: boolean;
}

/** Public: consume an invitation, provisioning or activating the partner seat. */
export const acceptPartnerInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: AcceptInvitationInput) => {
    if (!input?.token) throw new Error("An invitation token is required.");
    if (!input.full_name?.trim()) throw new Error("Please confirm your name.");
    if (!input.accepted_terms) throw new Error("Please accept the partner terms to continue.");
    if (input.password && input.password.length < 8)
      throw new Error("Your password must be at least 8 characters.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation } = await supabaseAdmin
      .from("partner_invitations")
      .select("id, organization_id, invited_email, intended_role, status, expires_at, invited_by")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();

    if (!invitation || invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid. Ask for a new one.");
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("partner_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired. Ask for a new one.");
    }

    const email = invitation.invited_email.toLowerCase();
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = list?.users.find((u) => u.email?.toLowerCase() === email) ?? null;

    let userId = existingUser?.id ?? null;
    let createdAccount = false;

    if (!userId) {
      if (!data.password) throw new Error("Choose a password to finish setting up your account.");
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name.trim() },
      });
      if (!created.data.user) {
        throw new Error(created.error?.message ?? "Could not create your account.");
      }
      userId = created.data.user.id;
      createdAccount = true;
    } else if (data.password) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
      createdAccount = true;
    }

    // An invitation can never grant an internal Magenta role.
    const { data: internalRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if ((internalRoles ?? []).length > 0) {
      throw new Error("That email belongs to a Magenta staff account and cannot join a partner team.");
    }

    const { data: existingMember } = await supabaseAdmin
      .from("partner_members")
      .select("id, organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember && existingMember.organization_id !== invitation.organization_id) {
      throw new Error("That account already belongs to another partner organization.");
    }

    const seat = {
      organization_id: invitation.organization_id,
      user_id: userId,
      full_name: data.full_name.trim(),
      email,
      role: invitation.intended_role,
      status: "active" as const,
    };

    // The member trigger assigns the permanent referral code on insert.
    const { error: seatError } = existingMember
      ? await supabaseAdmin
          .from("partner_members")
          .update(seat as never)
          .eq("id", existingMember.id)
      : await supabaseAdmin.from("partner_members").insert(seat as never);
    if (seatError) throw new Error(seatError.message);

    await supabaseAdmin
      .from("partner_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        token_hash: freshToken().token_hash,
      })
      .eq("id", invitation.id);

    await audit(supabaseAdmin, {
      actor_user_id: userId,
      entity_id: invitation.id,
      action: "invitation_accepted",
      new_value: { email, organization_id: invitation.organization_id },
    });

    return { ok: true, email, can_sign_in: createdAccount };
  });
