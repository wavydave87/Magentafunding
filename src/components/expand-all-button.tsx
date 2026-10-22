import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Drives the Expand All / Collapse All control for a group of `DealTile`s.
 * Pass `signal` + `value` into every tile's `openSignal` / `openSignalValue`.
 */
export function useExpandAll() {
  const [state, setState] = useState({ signal: 0, value: true });
  return {
    signal: state.signal,
    value: state.value,
    allOpen: state.signal > 0 && state.value,
    toggle: () => setState((s) => ({ signal: s.signal + 1, value: !(s.signal > 0 && s.value) })),
  };
}

export function ExpandAllButton({
  allOpen,
  onToggle,
  className = "",
}: {
  allOpen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={allOpen}
      onClick={onToggle}
      className={`min-h-11 md:min-h-9 ${className}`}
    >
      {allOpen ? (
        <ChevronsDownUp className="size-4" aria-hidden />
      ) : (
        <ChevronsUpDown className="size-4" aria-hidden />
      )}
      {allOpen ? "Collapse All" : "Expand All"}
    </Button>
  );
}
