import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** The one empty state used across every partner screen. */
export function PartnerEmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-elevated flex flex-col items-center px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
