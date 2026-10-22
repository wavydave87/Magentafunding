import { Lock } from "lucide-react";

import { shortDate } from "@/lib/partner";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  visibility: "partner" | "internal";
  created_at: string;
}

/**
 * Partner-visible activity trail. Internal-visibility rows are only ever
 * fetched for Magenta staff — the RLS policy hides them from partners — and are
 * marked plainly when they do render.
 */
export function PartnerApplicationTimeline({
  events,
  loading,
}: {
  events: TimelineEvent[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened on this application yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 -left-[1.4rem] h-2.5 w-2.5 rounded-full ring-4 ring-card",
              event.visibility === "internal" ? "bg-gold" : "bg-primary",
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{event.title}</p>
            {event.visibility === "internal" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/45 bg-internal px-2 py-0.5 text-[11px] text-internal-foreground">
                <Lock className="h-3 w-3" aria-hidden="true" /> Internal Only
              </span>
            ) : null}
          </div>
          {event.description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
          ) : null}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {shortDate(event.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
