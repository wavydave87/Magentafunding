import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getPartnerView } from "@/lib/partner-view.functions";
import { getPartnerViewSession, setPartnerViewSession } from "@/lib/portal-db";
import type { PartnerViewSession } from "@/lib/partner-view";

/**
 * Resolves the Magenta Admin's Partner View session, if any. The result also
 * flips the portal's data door over to the server-side effective-identity
 * layer, so the pages themselves need no impersonation logic.
 */
export function usePartnerView() {
  const query = useQuery<PartnerViewSession | null>({
    queryKey: ["partner-view-session"],
    staleTime: 0,
    initialData: () => getPartnerViewSession(),
    refetchInterval: 15_000,
    retry: false,
    queryFn: async () => {
      try {
        return (await getPartnerView()) as PartnerViewSession | null;
      } catch (error) {
        throw error;
      }
    },
  });

  const active = Boolean(query.data);
  useEffect(() => {
    // The portal route gate resolves the session before any portal query
    // runs; this only keeps the shared state in step afterwards.
    if (query.data === undefined) return;
    const previous = getPartnerViewSession();
    if (previous && !query.data) {
      // Fail closed: never render a portal page with the administrator's client.
      window.location.replace(previous.returnPath);
      return;
    }
    if (previous && query.data && previous.mode !== query.data.mode) {
      window.location.reload();
      return;
    }
    setPartnerViewSession(query.data);
  }, [active, query.data?.sessionId]);

  return query;
}
