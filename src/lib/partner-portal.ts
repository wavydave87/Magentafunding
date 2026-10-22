/**
 * Phase 2 vocabulary for the Magenta Portal partner modules (referrals,
 * commissions, team, resources, training, support, notifications).
 *
 * Display metadata only — the database enums remain the source of truth, and
 * every tone travels with a label so colour is never the sole signal.
 */
import type { Database } from "@/integrations/supabase/types";
import type { ToneKey } from "@/lib/partner";

export type CommissionStatus = Database["public"]["Enums"]["partner_commission_status"];
export type TicketStatus = Database["public"]["Enums"]["partner_ticket_status"];
export type ResourceKind = Database["public"]["Enums"]["partner_resource_kind"];
export type ModuleKind = Database["public"]["Enums"]["partner_module_kind"];

export const COMMISSION_STATUS: Record<CommissionStatus, { label: string; tone: ToneKey }> = {
  pending: { label: "Pending", tone: "gold" },
  approved: { label: "Approved", tone: "primary" },
  scheduled: { label: "Scheduled", tone: "plum" },
  paid: { label: "Paid", tone: "success" },
  held: { label: "On Hold", tone: "coral" },
  adjusted: { label: "Adjusted", tone: "gold" },
  void: { label: "Void", tone: "muted" },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: ToneKey }> = {
  open: { label: "Open", tone: "plum" },
  awaiting_partner: { label: "Awaiting You", tone: "coral" },
  awaiting_magenta: { label: "With Magenta", tone: "primary" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "muted" },
};

export const TICKET_CATEGORIES = [
  "General",
  "Application Help",
  "Underwriting",
  "Commissions",
  "Portal / Technical",
  "Account & Access",
] as const;

export const LIBRARY_CATEGORIES = [
  "General",
  "Marketing",
  "Underwriting Guidelines",
  "Forms & Templates",
  "Product",
  "Compliance",
] as const;

export const MODULE_KIND_LABEL: Record<ModuleKind, string> = {
  video: "Video",
  document: "Document",
  link: "Link",
};

/** Public referral URL for an organization, with optional member attribution. */
export function referralUrl(slug: string, memberId?: string | null): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/apply/${slug}${memberId ? `?ref=${memberId}` : ""}`;
}

/** "$1,240.50" — commissions keep cents, unlike funded volume. */
export { formatMoneyPrecise as currency } from "./format";

export function percent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toFixed(2).replace(/\.00$/, "")}%`;
}

/** Stable per-browser id used to de-duplicate referral link visits. */
export function visitorId(): string {
  const key = "magenta-visitor-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Partner-facing referral statuses.
 *
 * Deliberately simpler than Magenta's internal underwriting pipeline: partners
 * see where their merchant stands, never how the deal is being priced.
 */
export type PartnerFacingStatus = Database["public"]["Enums"]["partner_facing_status"];

export const PARTNER_FACING_STATUS: Record<
  PartnerFacingStatus,
  { label: string; tone: ToneKey; short: string }
> = {
  referred: { label: "Referred", tone: "neutral", short: "Link shared, not started yet" },
  application_started: {
    label: "Application Started",
    tone: "plum",
    short: "The merchant is filling it in",
  },
  application_incomplete: {
    label: "Application Incomplete",
    tone: "coral",
    short: "Stalled — a nudge would help",
  },
  application_submitted: {
    label: "Application Submitted",
    tone: "primary",
    short: "Received by Magenta",
  },
  under_review: { label: "Under Review", tone: "primary", short: "With the Magenta team" },
  additional_information_needed: {
    label: "Additional Information Needed",
    tone: "coral",
    short: "Magenta needs more from the merchant",
  },
  approved: { label: "Approved", tone: "success", short: "Approved for funding" },
  declined: { label: "Declined", tone: "coral", short: "Not approved" },
  funded: { label: "Funded", tone: "success", short: "Funds disbursed" },
  closed_withdrawn: { label: "Closed", tone: "muted", short: "No longer active" },
};

/** Ordered stages for the partner funnel. */
export const PARTNER_FUNNEL: PartnerFacingStatus[] = [
  "referred",
  "application_started",
  "application_submitted",
  "under_review",
  "approved",
  "funded",
];
