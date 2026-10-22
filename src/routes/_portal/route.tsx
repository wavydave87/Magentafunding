import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { fetchPortalIdentity, hasPortalAccess } from "@/hooks/use-portal-identity";
import { getPartnerView } from "@/lib/partner-view.functions";
import { setPartnerViewSession } from "@/lib/portal-db";
import type { PartnerViewSession } from "@/lib/partner-view";

/**
 * Partner workspace gate. Mirrors the integration-managed `_authenticated`
 * gate: the Supabase session lives in localStorage, so this subtree resolves
 * identity client-side before any partner data loads. Real isolation is the
 * entitlement-scoped row level security, not this redirect — a paused
 * organization also loses every partner read in the database.
 */
export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: async () => {
    // A Magenta Admin in Partner View reaches the portal through a short-lived
    // server-side session that supplies the effective partner. Resolving it
    // first means every query on the page is answered as that partner.
    let view: PartnerViewSession | null = null;
    try {
      view = (await getPartnerView()) as PartnerViewSession | null;
    } catch {
      view = null;
    }
    setPartnerViewSession(view);

    const identity = await fetchPortalIdentity();
    if (!identity.userId) throw redirect({ to: "/portal/login", replace: true });
    // Internal Magenta identity always wins over a partner membership.
    if (identity.isInternal) throw redirect({ to: "/dashboard", replace: true });
    // Covers an inactive member, a missing organization and a paused,
    // restricted, suspended or inactive organization — including a user who
    // was already signed in and opens a portal URL directly.
    if (!hasPortalAccess(identity)) {
      throw redirect({ to: "/pending-access", replace: true });
    }
    return { identity, partnerView: view };
  },
  component: PortalBoundary,
});

function PortalBoundary() {
  const { partnerView, identity } = Route.useRouteContext();
  const key = partnerView ? `${partnerView.sessionId}:${partnerView.memberId}:${partnerView.mode}` : `self:${identity.userId}`;
  return <PortalCache key={key} />;
}
function PortalCache() {
  // No internal or previous-partner query can enter this cache.
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><Outlet /></QueryClientProvider>;
}
