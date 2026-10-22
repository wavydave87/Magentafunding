/**
 * Shared vocabulary for the Partner Portal module.
 *
 * Everything here is display metadata only — the database enums are the source
 * of truth. Status colour always travels with a label (and an icon at the badge
 * level) so colour is never the sole signal.
 */
import type { Database } from "@/integrations/supabase/types";

export type ApplicationStatus =
  Database["public"]["Enums"]["partner_application_status"];
export type PartnerOrgStatus = Database["public"]["Enums"]["partner_org_status"];
export type PartnerType = Database["public"]["Enums"]["partner_type"];
export type PartnerMemberRole = Database["public"]["Enums"]["partner_member_role"];
export type DocumentStatus = Database["public"]["Enums"]["partner_document_status"];

export type ToneKey =
  | "neutral"
  | "muted"
  | "plum"
  | "primary"
  | "gold"
  | "success"
  | "coral";

/** Badge surface classes built only from existing Magenta tokens. */
export const TONE_CLASS: Record<ToneKey, string> = {
  neutral: "border-border bg-card text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  plum: "border-plum/25 bg-plum/10 text-plum",
  primary: "border-primary/30 bg-accent text-accent-foreground",
  gold: "border-gold/45 bg-internal text-internal-foreground",
  success: "border-success/35 bg-success-soft text-success",
  coral: "border-coral/35 bg-coral/10 text-coral",
};

export const APPLICATION_STATUS: Record<
  ApplicationStatus,
  { label: string; tone: ToneKey; short: string }
> = {
  started: { label: "Started", tone: "neutral", short: "Draft in progress" },
  submitted: { label: "Submitted", tone: "plum", short: "Sent to Magenta" },
  missing_information: {
    label: "Missing Information",
    tone: "coral",
    short: "Action needed from you",
  },
  under_review: { label: "Under Review", tone: "primary", short: "With underwriting" },
  offer_available: { label: "Offer Available", tone: "gold", short: "An offer is ready" },
  approved: { label: "Approved", tone: "success", short: "Approved for funding" },
  contract_requested: {
    label: "Contract Requested",
    tone: "primary",
    short: "Contract being prepared",
  },
  contract_sent: { label: "Contract Sent", tone: "primary", short: "Awaiting signature" },
  contract_signed: { label: "Contract Signed", tone: "success", short: "Signed by merchant" },
  funded: { label: "Funded", tone: "success", short: "Funds disbursed" },
  declined: { label: "Declined", tone: "coral", short: "Not approved" },
  duplicate: { label: "Duplicate", tone: "muted", short: "Already on file" },
  offer_expired: { label: "Offer Expired", tone: "muted", short: "Offer window closed" },
};

/** Ordered pipeline stages shown on the partner dashboard. */
export const PIPELINE_STAGES: ApplicationStatus[] = [
  "started",
  "submitted",
  "missing_information",
  "under_review",
  "offer_available",
  "approved",
  "contract_sent",
  "contract_signed",
  "funded",
];

export const CLOSED_STAGES: ApplicationStatus[] = ["declined", "offer_expired"];

export const NEEDS_ATTENTION: ApplicationStatus[] = ["started", "missing_information"];
export const IN_REVIEW: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "offer_available",
  "contract_requested",
  "contract_sent",
];
export const APPROVED_GROUP: ApplicationStatus[] = ["approved", "contract_signed"];

export const ORG_STATUS: Record<PartnerOrgStatus, { label: string; tone: ToneKey }> = {
  pending: { label: "Pending", tone: "gold" },
  active: { label: "Active", tone: "success" },
  restricted: { label: "Restricted", tone: "coral" },
  suspended: { label: "Suspended", tone: "coral" },
  inactive: { label: "Inactive", tone: "muted" },
};

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  iso: "ISO",
  referral_partner: "Referral Partner",
  strategic_partner: "Strategic Partner",
};

export const MEMBER_ROLE_LABEL: Record<PartnerMemberRole, string> = {
  organization_admin: "Organization Admin",
  manager: "Manager",
  broker: "Broker",
  referral_rep: "Referral Rep",
  viewer: "Viewer",
};

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: ToneKey }> = {
  received: { label: "Received", tone: "plum" },
  processing: { label: "Processing", tone: "primary" },
  approved: { label: "Approved", tone: "success" },
  needs_attention: { label: "Needs Attention", tone: "coral" },
};

export const DOCUMENT_TYPES = [
  { value: "bank_statements", label: "Bank Statements" },
  { value: "identification", label: "Driver's License / Identification" },
  { value: "voided_check", label: "Voided Check" },
  { value: "other", label: "Other Requested Documents" },
] as const;

/** "$42,000" — matches the money formatting used across the offer tool. */
export { formatMoneyOrDash as money } from "./format";

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
