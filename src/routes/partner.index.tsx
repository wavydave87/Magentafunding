import { createFileRoute, redirect } from "@tanstack/react-router";

import { legacyPartnerTarget } from "@/lib/portal-routing";

/** Legacy `/partner` root now lives at `/portal`. */
export const Route = createFileRoute("/partner/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: legacyPartnerTarget(undefined, location.searchStr, location.hash),
      replace: true,
    });
  },
});
