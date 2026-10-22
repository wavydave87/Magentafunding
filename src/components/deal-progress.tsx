/**
 * Shared deal progress tracker.
 *
 * Five milestones, all derived from data the dashboard and deal page already
 * load, so there is no extra query cost. Each segment lights up on its own
 * merit (a deal can pick up documents without a logged send), and the caption
 * names the furthest milestone reached. A revision request is a tone change
 * plus caption rather than a stage, because a merchant can ask for changes at
 * any point after viewing.
 *
 * When a `dealId` is supplied each segment becomes a link that jumps to the
 * matching section of the deal page, so a rep can go straight from the signal
 * to the detail behind it.
 */

import { Link } from "@tanstack/react-router";

export interface DealProgressInput {
  sent?: boolean;
  viewed?: boolean;
  accepted?: boolean;
  docsReceived?: boolean;
  revisionRequested?: boolean;
}

const STAGE_LABELS = ["Built", "Sent", "Viewed", "Accepted", "Docs Received"] as const;

/** Deal-page anchor each milestone points at. */
const STAGE_HASHES = [
  "closing-checklist",
  "offer-delivery",
  "merchant-activity",
  "merchant-activity",
  "merchant-uploads",
] as const;

/** Per-milestone completion flags, in order. */
export function dealStages(input: DealProgressInput): boolean[] {
  return [true, !!input.sent, !!input.viewed, !!input.accepted, !!input.docsReceived];
}

/**
 * Current stage (1-5): the furthest milestone reached with every milestone
 * before it also complete. A deal that picked up documents without a logged
 * send is still "Draft" — the caption never claims progress the earlier
 * milestones don't support.
 */
export function dealStage(input: DealProgressInput): number {
  const stages = dealStages(input);
  let current = 1;
  for (let i = 1; i < stages.length; i += 1) {
    if (!stages[i]) break;
    current = i + 1;
  }
  return current;
}

export function DealProgress({
  className = "",
  dealId,
  ...input
}: DealProgressInput & { className?: string; dealId?: string }) {
  const stages = dealStages(input);
  const done = stages.filter(Boolean).length;
  const total = STAGE_LABELS.length;
  const current = dealStage(input);
  // Caption names the furthest milestone actually reached, so an accepted deal
  // never reads "Built" just because no send was logged.
  let furthest = 0;
  stages.forEach((complete, index) => {
    if (complete) furthest = index;
  });
  const label = input.revisionRequested ? "Revision Requested" : STAGE_LABELS[furthest]!;
  const tone = input.revisionRequested ? "bg-gold" : "bg-primary";
  const valueText = `${label} · ${done} of ${total} milestones complete`;



  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label="Deal progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={valueText}
        className="flex items-stretch gap-1"
      >
        {STAGE_LABELS.map((name, index) => {
          // Complete-and-in-sequence fills solid; complete but ahead of an
          // unmet milestone reads as an outline so the bar never implies the
          // steps behind it happened.
          const outOfOrder = stages[index] && index + 1 > current;
          const fill = stages[index]
            ? outOfOrder
              ? `${tone} opacity-40`
              : tone
            : "bg-border";
          const bar = `block h-1.5 w-full rounded-full ${fill}`;
          const label = outOfOrder ? `${name} (Out Of Order)` : name;
          if (!dealId) {
            return (
              <span key={name} className="flex flex-1 items-center">
                <span className={bar} />
              </span>
            );
          }
          return (
            <Link
              key={name}
              to="/deals/$dealId"
              params={{ dealId }}
              hash={STAGE_HASHES[index] ?? "merchant-activity"}
              aria-label={`Jump To ${label}`}
              title={label}
              className="focus-ring flex min-h-11 flex-1 items-center md:min-h-6"
            >
              <span className={bar} />
            </Link>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
        <span className="text-foreground">{label}</span> · {done} Of {total} Steps Done
        {current < furthest + 1 ? " · Send Not Logged" : ""}
      </p>


    </div>
  );
}
