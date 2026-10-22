import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logoAsset from "@/assets/magenta-logo-full.png.asset.json";
import iconAsset from "@/assets/magenta-icon.png.asset.json";

/**
 * Persistent brand banner used on both the sales surfaces and the public
 * merchant offer. Sticks to the top while scrolling and closes with the
 * four-colour brand rule so it reads as intentional chrome.
 */
export function BrandHeader({
  right,
  to,
}: {
  right?: ReactNode;
  /** Omit for the merchant surface, where the logo should not be a link. */
  to?: string;
}) {
  const logo = (
    <img
      src={logoAsset.url}
      alt="Magenta — Invest in Possible"
      className="h-10 w-auto sm:h-11"
    />
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:py-4">
        {to ? (
          <Link to={to} className="focus-ring shrink-0 rounded">
            {logo}
          </Link>
        ) : (
          <span className="shrink-0">{logo}</span>
        )}
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      <div className="h-[3px] bg-rule-gradient" />
    </header>
  );
}


export function BrandFooter({ note }: { note?: string }) {
  return (
    <footer className="mt-16 border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
        <img src={iconAsset.url} alt="Magenta" className="h-8 w-8 opacity-80" />
        <p className="text-xs text-muted-foreground">
          {note ?? "Magenta · Invest in Possible."}
        </p>
      </div>
    </footer>
  );
}

export { logoAsset, iconAsset };
