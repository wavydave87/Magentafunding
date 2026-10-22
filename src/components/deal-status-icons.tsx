import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileX2,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/view-tracking";

type Tone = "active" | "danger" | "muted" | "success" | "warning";
type StatusKind = "accepted" | "bank" | "docs" | "expiry" | "revision" | "sent" | "views";

interface DealStatusIconsProps {
  sent: { count: number; last: string } | null;
  views: { views: number; devices: number; first: string | null; last: string | null } | null;
  accepted: boolean;
  docCount: number;
  bankRequired: boolean;
  bank: { count: number; last: string } | null;
  revisionRequested: boolean;
  daysUntilExpiration: number;
  onActivate?: (kind: StatusKind) => void;
}

interface StatusItem {
  kind: StatusKind;
  label: string;
  shortLabel?: string | undefined;
  tone: Tone;
  Icon: typeof Send;
  priority: number;
}

const toneClasses: Record<Tone, string> = {
  active: "border-selected-border bg-selected text-primary hover:bg-selected",
  danger: "border-coral bg-coral/10 text-coral hover:bg-coral/10",
  muted: "border-border bg-secondary/45 text-muted-foreground hover:bg-secondary",
  success: "border-selected-border bg-selected text-primary hover:bg-selected",
  warning: "border-gold bg-internal text-internal-foreground hover:bg-internal",
};

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function expiryLabel(days: number) {
  if (days < 0) return "Expired";
  if (days === 0) return "Expires Today";
  if (days === 1) return "Expires Tomorrow";
  return `Expires In ${days} Days`;
}

function buildItems({
  sent,
  views,
  accepted,
  docCount,
  bankRequired,
  bank,
  revisionRequested,
  daysUntilExpiration,
}: DealStatusIconsProps): StatusItem[] {
  const viewCount = views?.views ?? 0;
  const bankCount = bank?.count ?? 0;
  const urgentExpiry = daysUntilExpiration <= 3;

  const items: StatusItem[] = [
    {
      kind: "sent",
      label: sent
        ? `Sent ${plural(sent.count, "Time")} · ${timeAgo(sent.last)}`
        : "Not Sent Yet",
      shortLabel: sent?.count ? `${sent.count}×` : undefined,
      tone: sent ? "active" : "warning",
      Icon: Send,
      priority: sent ? 40 : 10,
    },
    {
      kind: "views",
      label: viewCount
        ? `Viewed ${plural(viewCount, "Time")} · ${views?.last ? timeAgo(views.last) : "Last View Unknown"}`
        : "Not Viewed Yet",
      shortLabel: viewCount ? String(viewCount) : undefined,
      tone: viewCount ? "active" : "muted",
      Icon: Eye,
      priority: viewCount ? 30 : 80,
    },
    {
      kind: "accepted",
      label: accepted ? "Offer Accepted" : "Not Accepted Yet",
      tone: accepted ? "success" : "muted",
      Icon: CheckCircle2,
      priority: accepted ? 20 : 90,
    },
    {
      kind: "docs",
      label: docCount ? `${plural(docCount, "Upload")} Received` : accepted ? "Accepted, Documents Missing" : "No Uploads Yet",
      shortLabel: docCount ? String(docCount) : undefined,
      tone: docCount ? "success" : accepted ? "warning" : "muted",
      Icon: docCount ? FileCheck2 : FileX2,
      priority: accepted && !docCount ? 15 : docCount ? 35 : 95,
    },
    {
      kind: "expiry",
      label: expiryLabel(daysUntilExpiration),
      shortLabel: daysUntilExpiration > 0 ? `${daysUntilExpiration}d` : undefined,
      tone: daysUntilExpiration < 0 ? "danger" : urgentExpiry ? "warning" : "muted",
      Icon: Clock3,
      priority: daysUntilExpiration < 0 ? 5 : urgentExpiry ? 25 : 100,
    },
  ];

  if (bankRequired) {
    items.push({
      kind: "bank",
      label: bankCount ? `Bank Verification Opened ${plural(bankCount, "Time")}` : "Bank Verification Pending",
      shortLabel: bankCount ? String(bankCount) : undefined,
      tone: bankCount ? "success" : accepted ? "warning" : "muted",
      Icon: bankCount ? ShieldCheck : ShieldAlert,
      priority: accepted && !bankCount ? 18 : bankCount ? 45 : 85,
    });
  }

  if (revisionRequested) {
    items.push({
      kind: "revision",
      label: "Revision Requested",
      tone: "warning",
      Icon: AlertTriangle,
      priority: 1,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function DealStatusIcons(props: DealStatusIconsProps) {
  const items = buildItems(props);
  const mobileItems = items.slice(0, 2);
  const mobileHidden = Math.max(0, items.length - mobileItems.length);

  const renderItem = (item: StatusItem, index: number, mode: "desktop" | "mobile") => {
    const Icon = item.Icon;
    const label = `Show ${item.label}`;
    return (
      <Button
        key={`${mode}-${item.kind}`}
        type="button"
        variant="outline"
        size="icon"
        title={item.label}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          props.onActivate?.(item.kind);
        }}
        className={cn(
          "h-8 min-h-11 w-8 min-w-11 rounded-md px-0 shadow-none md:min-h-8 md:min-w-8",
          "group/status gap-1 md:w-auto md:px-2",
          toneClasses[item.tone],
          mode === "desktop" ? "hidden sm:inline-flex" : "inline-flex sm:hidden",
          index > 4 && mode === "desktop" ? "lg:inline-flex sm:hidden" : "",
        )}
      >
        <Icon aria-hidden className="size-4" />
        {item.shortLabel ? <span className="hidden text-[11px] leading-none md:inline">{item.shortLabel}</span> : null}
      </Button>
    );
  };

  return (
    <span className="flex shrink-0 items-center gap-1" aria-label="Offer quick status">
      {items.map((item, index) => renderItem(item, index, "desktop"))}
      {mobileItems.map((item, index) => renderItem(item, index, "mobile"))}
      {mobileHidden > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={`${mobileHidden} More Status Updates`}
          aria-label={`${mobileHidden} More Status Updates`}
          onClick={(event) => {
            event.stopPropagation();
            props.onActivate?.("views");
          }}
          className="inline-flex h-8 min-h-11 w-8 min-w-11 rounded-md border-border bg-secondary/45 px-0 text-[11px] font-semibold text-muted-foreground shadow-none sm:hidden"
        >
          +{mobileHidden}
        </Button>
      ) : null}
    </span>
  );
}
