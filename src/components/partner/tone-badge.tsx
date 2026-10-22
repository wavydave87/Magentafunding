import type { LucideIcon } from "lucide-react";

import { TONE_CLASS, type ToneKey } from "@/lib/partner";
import { cn } from "@/lib/utils";

/** Generic status pill built from the shared Magenta tone tokens. */
export function ToneBadge({
  label,
  tone,
  icon: Icon,
  className,
}: {
  label: string;
  tone: ToneKey;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
