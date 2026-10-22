import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { usePortalIdentity } from "@/hooks/use-portal-identity";

/**
 * Client-side audience guard. This is UX only — the real isolation is the
 * organization-scoped RLS on every partner table, so a partner who forces an
 * internal URL still reads nothing.
 */
export function PortalGuard({
  audience,
  requireAdmin,
  children,
}: {
  audience: "internal" | "partner";
  /** Internal screens that only Magenta admins may open. */
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  const { data: identity, isLoading } = usePortalIdentity();

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="card-elevated mt-6 h-64 animate-pulse" />
      </AppShell>
    );
  }

  const isInternal = Boolean(identity?.isInternal);
  const isPartner = Boolean(identity?.member) && !isInternal;
  const hasPortal = isInternal || isPartner;
  const allowed =
    (audience === "internal" ? isInternal : isPartner || isInternal) &&
    (!requireAdmin || Boolean(identity?.isAdmin));

  if (allowed) return <>{children}</>;

  return (
    <AppShell>
      <div className="card-elevated mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl">Not Available For Your Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {!hasPortal
            ? "Your account hasn't been given access to a Magenta Portal workspace yet."
            : audience === "internal"
              ? "This area is for Magenta staff only."
              : "Your account isn't linked to a partner organization yet. Ask your Magenta rep to invite you."}
        </p>
        <Button asChild className="mt-5">
          <Link to={isPartner ? "/portal" : hasPortal ? "/dashboard" : "/pending-access"}>
            {hasPortal ? "Go To My Dashboard" : "Account Status"}
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}

