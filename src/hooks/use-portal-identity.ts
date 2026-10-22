import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getPartnerViewSession } from "@/lib/portal-db";
import type { PartnerMemberRole } from "@/lib/partner";

export interface PortalIdentity {
  userId: string | null;
  email: string | null;
  isInternal: boolean;
  isAdmin: boolean;
  /** Member row exists and is active, but the organization is not active. */
  orgPaused: boolean;
  member: {
    id: string;
    organization_id: string;
    full_name: string;
    email: string;
    role: PartnerMemberRole;
    status: string;
    code: string | null;
    can_view_org_referrals?: boolean;
    organization: {
      id: string;
      name: string;
      slug: string;
      code: string | null;
      status: string;
      partner_type: string;
    } | null;
  } | null;
}

/** True only when the member is active AND their organization is active. */
export function hasPortalAccess(identity: PortalIdentity | null | undefined): boolean {
  const member = identity?.member;
  return Boolean(
    member && member.status === "active" && member.organization?.status === "active",
  );
}

/** Resolves the signed-in user's portal identity. Safe to call outside React. */
export async function fetchPortalIdentity(): Promise<PortalIdentity> {
  // While a Magenta Admin is in Partner View, the effective partner is the
  // identity the whole portal sees. The admin stays signed in underneath.
  const view = getPartnerViewSession();
  if (view) {
    return {
      userId: view.memberUserId,
      email: view.memberEmail,
      isInternal: false,
      isAdmin: false,
      orgPaused: view.organizationStatus !== "active",
      member: {
        id: view.memberId,
        organization_id: view.organizationId,
        full_name: view.memberName,
        email: view.memberEmail,
        role: view.role as PartnerMemberRole,
        status: "active",
        code: view.memberCode,
        can_view_org_referrals: view.canViewOrgReferrals,
        organization: {
          id: view.organizationId,
          name: view.organizationName,
          slug: view.organizationSlug,
          code: view.organizationCode,
          status: view.organizationStatus,
          partner_type: view.organizationType,
        },
      },
    };
  }

  // getSession() reads the persisted session without a network round trip, so a
  // brief outage or a rebuild mid-refresh cannot look like "signed out".
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? null;
  if (!user) {
    return {
      userId: null,
      email: null,
      isInternal: false,
      isAdmin: false,
      orgPaused: false,
      member: null,
    };
  }

  const [{ data: roles }, { data: member }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("partner_members")
      .select(
        "id, organization_id, full_name, email, role, status, code, can_view_org_referrals, organization:partner_organizations(id, name, slug, code, status, partner_type)",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const roleList = (roles ?? []).map((r) => r.role as string);
  const memberRow = (member as PortalIdentity["member"]) ?? null;
  return {
    userId: user.id,
    email: user.email ?? null,
    isInternal: roleList.includes("admin") || roleList.includes("rep"),
    isAdmin: roleList.includes("admin"),
    orgPaused: Boolean(memberRow && memberRow.organization?.status !== "active"),
    member: memberRow,
  };
}

/** Where this identity belongs after sign-in. */
export function portalHome(
  identity: PortalIdentity | null | undefined,
): "/dashboard" | "/portal" | "/pending-access" {
  if (identity?.isInternal) return "/dashboard";
  if (hasPortalAccess(identity)) return "/portal";
  return "/pending-access";
}

/**
 * Single source of truth for "who is this signed-in user?" across the portal.
 * Internal Magenta staff hold an app_role; external partners hold an active
 * partner_members row. The two are mutually exclusive in practice, and internal
 * always wins if both somehow exist.
 */
export function usePortalIdentity() {
  return useQuery<PortalIdentity>({
    queryKey: ["portal-identity", getPartnerViewSession()?.sessionId ?? "self", getPartnerViewSession()?.memberId],
    staleTime: 60_000,
    queryFn: fetchPortalIdentity,
  });
}

