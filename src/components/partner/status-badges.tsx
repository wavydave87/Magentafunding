import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  FileSignature,
  FileText,
  Hourglass,
  Inbox,
  PenLine,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  APPLICATION_STATUS,
  DOCUMENT_STATUS,
  ORG_STATUS,
  TONE_CLASS,
  type ApplicationStatus,
  type DocumentStatus,
  type PartnerOrgStatus,
} from "@/lib/partner";
import {
  PARTNER_FACING_STATUS,
  type PartnerFacingStatus,
} from "@/lib/partner-portal";
import { cn } from "@/lib/utils";

const APPLICATION_ICON: Record<ApplicationStatus, LucideIcon> = {
  started: PenLine,
  submitted: Inbox,
  missing_information: AlertTriangle,
  under_review: Hourglass,
  offer_available: Sparkles,
  approved: CheckCircle2,
  contract_requested: FileText,
  contract_sent: FileSignature,
  contract_signed: BadgeCheck,
  funded: Wallet,
  declined: Ban,
  duplicate: Copy,
  offer_expired: Clock,
};

function Pill({
  tone,
  label,
  Icon,
  className,
}: {
  tone: keyof typeof TONE_CLASS;
  label: string;
  Icon?: LucideIcon;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string | undefined;
}) {
  const meta = APPLICATION_STATUS[status];
  return (
    <Pill
      tone={meta.tone}
      label={meta.label}
      Icon={APPLICATION_ICON[status]}
      className={className}
    />
  );
}

export function PartnerStatusBadge({
  status,
  className,
}: {
  status: PartnerOrgStatus;
  className?: string | undefined;
}) {
  const meta = ORG_STATUS[status];
  return <Pill tone={meta.tone} label={meta.label} className={className} />;
}

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string | undefined;
}) {
  const meta = DOCUMENT_STATUS[status];
  return <Pill tone={meta.tone} label={meta.label} className={className} />;
}

const PARTNER_FACING_ICON: Record<PartnerFacingStatus, LucideIcon> = {
  referred: Inbox,
  application_started: PenLine,
  application_incomplete: AlertTriangle,
  application_submitted: Inbox,
  under_review: Hourglass,
  additional_information_needed: AlertTriangle,
  approved: CheckCircle2,
  declined: Ban,
  funded: Wallet,
  closed_withdrawn: Clock,
};

/** The simplified status a referral partner is allowed to see. */
export function PartnerFacingStatusBadge({ status }: { status: PartnerFacingStatus }) {
  const meta = PARTNER_FACING_STATUS[status];
  return <Pill tone={meta.tone} label={meta.label} Icon={PARTNER_FACING_ICON[status]} />;
}
