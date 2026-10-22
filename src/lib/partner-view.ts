/**
 * Shared types for Magenta Admin "Partner View".
 *
 * A Partner View session lets a Magenta administrator see the partner portal
 * exactly as one partner person sees it. The admin stays signed in as
 * themselves; the effective partner identity lives in a short-lived
 * server-side session and is the ONLY thing that answers portal queries while
 * the session is active.
 */

export type PartnerViewMode = "view" | "work";

export interface PartnerViewSession {
  sessionId: string;
  mode: PartnerViewMode;
  adminUserId: string;
  adminEmail: string | null;
  memberId: string;
  memberUserId: string;
  memberName: string;
  memberEmail: string;
  memberCode: string | null;
  role: string;
  canViewOrgReferrals: boolean;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationCode: string | null;
  organizationStatus: string;
  organizationType: string;
  returnPath: string;
  expiresAt: string;
}

/** How long a Partner View session lives before it must be restarted. */
export const PARTNER_VIEW_TTL_MINUTES = 30;

/** Writes a partner could never perform themselves stay in the internal workspace. */
export const MAGENTA_ONLY_MESSAGE =
  "That is a Magenta action. Exit Partner View to do it in the internal workspace.";
