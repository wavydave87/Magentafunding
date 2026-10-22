import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact KPI tile for the partner dashboard. Deliberately uses the same
 * card-elevated surface as the sales dashboard so the two modules read as one
 * product.
 */
export function PartnerKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "success" | "gold";
  loading?: boolean;
}) {
  const accent =
    tone === "brand"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "gold"
          ? "text-gold-foreground"
          : "text-foreground";

  return (
    <div className="card-elevated p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? (
          <Icon className={cn("h-4 w-4 shrink-0", accent)} aria-hidden="true" />
        ) : null}
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <p className={cn("mt-2 font-display text-2xl sm:text-3xl", accent)}>{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
