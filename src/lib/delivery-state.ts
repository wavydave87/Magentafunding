/**
 * One derived delivery state for a deal, shared by every surface.
 *
 * Before this existed, two independent notions of "sent" disagreed: the
 * `deals.status` column (set manually) and `deal_sends` rows (set by the Send
 * Offer dialog). A card could show a `Sent` badge next to "Draft · Not Sent
 * Yet". Everything now derives from the same signals, in one place.
 */

export type DeliveryState =
  | "draft"
  | "sent"
  | "opened"
  | "accepted"
  | "revision_requested"
  | "expired";

export interface DeliverySignals {
  /** `deals.status`, used only for the manual "expired" / "sent" hints. */
  status?: string | null;
  /** A logged `deal_sends` row exists. */
  sentAt?: string | null;
  /** First `deal_views` timestamp. */
  firstViewedAt?: string | null;
  acceptedAt?: string | null;
  revisionRequested?: boolean;
  docsReceived?: boolean;
}

export interface Delivery {
  state: DeliveryState;
  /** Title-cased badge label. */
  label: string;
  /** Tailwind classes for the badge tone. */
  tone: string;
  /** One-line plain-language delivery story for the activity block. */
  line: string;
}

const TONES: Record<DeliveryState, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  opened: "bg-secondary text-secondary-foreground",
  accepted: "bg-primary text-primary-foreground",
  revision_requested: "bg-gold text-gold-foreground",
  expired: "bg-secondary text-muted-foreground",
};

const LABELS: Record<DeliveryState, string> = {
  draft: "Draft",
  sent: "Sent",
  opened: "Opened",
  accepted: "Accepted",
  revision_requested: "Revision Requested",
  expired: "Expired",
};

/** Furthest truthful delivery state, most significant signal winning. */
export function deliveryState(signals: DeliverySignals): DeliveryState {
  if (signals.revisionRequested) return "revision_requested";
  if (signals.acceptedAt) return "accepted";
  if (signals.firstViewedAt) return "opened";
  if (signals.sentAt || signals.status === "sent") return "sent";
  if (signals.status === "expired") return "expired";
  return "draft";
}

/**
 * Human delivery story. `ago` is injected so callers can share the app's
 * existing relative-time formatter without this module importing it.
 */
export function deliveryLine(
  signals: DeliverySignals,
  ago: (iso?: string | null) => string,
): string {
  const state = deliveryState(signals);
  if (state === "draft") return "Draft · Not Sent Yet";
  const sentPart = signals.sentAt
    ? `Sent ${ago(signals.sentAt)}`
    : "Marked Sent (No Delivery Logged)";
  if (state === "accepted") {
    return `${sentPart} · Accepted ${ago(signals.acceptedAt)}`;
  }
  if (state === "revision_requested") {
    return `${sentPart} · Revision Requested`;
  }
  if (signals.firstViewedAt) {
    return `${sentPart} · First Opened ${ago(signals.firstViewedAt)}`;
  }
  return `${sentPart} · Not Opened Yet`;
}

export function delivery(
  signals: DeliverySignals,
  ago: (iso?: string | null) => string,
): Delivery {
  const state = deliveryState(signals);
  return {
    state,
    label: LABELS[state],
    tone: TONES[state],
    line: deliveryLine(signals, ago),
  };
}
