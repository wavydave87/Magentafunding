import { Link } from "@tanstack/react-router";

import {
  APPLICATION_STATUS,
  CLOSED_STAGES,
  PIPELINE_STAGES,
  TONE_CLASS,
  money,
  type ApplicationStatus,
} from "@/lib/partner";
import { cn } from "@/lib/utils";

export interface PipelineRow {
  status: ApplicationStatus;
  requested_amount: number | null;
  funded_amount: number | null;
}

/**
 * Horizontal pipeline strip. Each stage links straight into the applications
 * list pre-filtered to that status.
 */
export function PartnerPipeline({
  rows,
  loading,
}: {
  rows: PipelineRow[];
  loading?: boolean;
}) {
  const tally = (status: ApplicationStatus) => {
    const matching = rows.filter((r) => r.status === status);
    const value = matching.reduce(
      (sum, r) => sum + Number(r.funded_amount ?? r.requested_amount ?? 0),
      0,
    );
    return { count: matching.length, value };
  };

  const stage = (status: ApplicationStatus) => {
    const meta = APPLICATION_STATUS[status];
    const { count, value } = tally(status);
    return (
      <Link
        key={status}
        to="/portal/applications"
        search={{ status }}
        className={cn(
          "focus-ring min-w-[9.5rem] flex-1 rounded-lg border p-3 transition-shadow hover:shadow-card",
          count > 0 ? TONE_CLASS[meta.tone] : "border-border bg-card text-muted-foreground",
        )}
      >
        <p className="text-xs font-medium">{meta.label}</p>
        <p className="mt-1 font-display text-xl leading-none">
          {loading ? "—" : count}
        </p>
        <p className="mt-1 text-[11px] opacity-80">{loading ? "" : money(value)}</p>
      </Link>
    );
  };

  return (
    <section aria-label="Financing pipeline" className="card-elevated p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg">Pipeline</h2>
        <p className="text-xs text-muted-foreground">Select a stage to filter</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{PIPELINE_STAGES.map(stage)}</div>
      <div className="mt-2 flex flex-wrap gap-2">{CLOSED_STAGES.map(stage)}</div>
    </section>
  );
}
