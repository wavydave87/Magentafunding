import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DealTileProps {
  id?: string;
  title: React.ReactNode;
  summary: React.ReactNode;
  headerActions?: (controls: { open: boolean; setOpen: (open: boolean) => void; bodyId: string }) => React.ReactNode;
  defaultOpen?: boolean;
  /** Increment to force every tile open/closed (Expand All / Collapse All). */
  openSignal?: number;
  /** Value applied when `openSignal` changes. */
  openSignalValue?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared collapsible tile for sales-side surfaces. Shows a compact summary
 * when collapsed and the full detail when expanded, with a chevron indicator
 * and full keyboard/ARIA support.
 */
export function DealTile({
  id,
  title,
  summary,
  headerActions,
  defaultOpen = true,
  openSignal = 0,
  openSignalValue = true,
  className = "",
  children,
}: DealTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  const lastSignal = useRef(openSignal);
  useEffect(() => {
    if (openSignal !== lastSignal.current) {
      lastSignal.current = openSignal;
      setOpen(openSignalValue);
    }
  }, [openSignal, openSignalValue]);
  const generatedId = useId();
  const tileId = id ?? generatedId;
  const bodyId = `${tileId}-body`;
  const actions = headerActions?.({ open, setOpen, bodyId });


  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={`card-elevated scroll-mt-24 p-5 ${className}`}
        aria-labelledby={tileId}
      >
        <div className="flex min-h-11 w-full flex-col gap-2 py-1 sm:flex-row sm:items-start md:min-h-9">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              className="focus-ring min-h-11 w-full min-w-0 rounded-[9px] text-left sm:flex-1 md:min-h-9"
            >
              <span className="min-w-0">
                <h2 id={tileId} className="text-lg text-plum">
                  {title}
                </h2>
                <span className="block text-[13px]">{summary}</span>
              </span>
            </button>
          </CollapsibleTrigger>
          <span className="ml-auto flex shrink-0 items-start gap-1">
            {actions}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                aria-label={open ? "Collapse Details" : "Expand Details"}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:min-h-8 md:min-w-8"
              >
                <ChevronDown
                  aria-hidden
                  className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
          </span>
        </div>
        <CollapsibleContent>
          <div id={bodyId} className="mt-4">
            {children}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
