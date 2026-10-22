import { createFileRoute, redirect } from "@tanstack/react-router";

import { legacyPartnerTarget } from "@/lib/portal-routing";

/** Legacy `/partner/*` links (old notifications, bookmarks) now live at `/portal/*`. */
export const Route = createFileRoute("/partner/$")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      href: legacyPartnerTarget(params._splat, location.searchStr, location.hash),
      replace: true,
    });
  },
});
