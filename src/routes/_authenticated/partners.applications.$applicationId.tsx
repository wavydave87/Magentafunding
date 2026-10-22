import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { PortalGuard } from "@/components/partner/portal-guard";
import { ApplicationDetail } from "@/components/partner/application-detail";

export const Route = createFileRoute("/_authenticated/partners/applications/$applicationId")({
  head: () => ({
    meta: [
      { title: "Partner Application — Magenta Portal" },
      {
        name: "description",
        content:
          "Magenta staff view of a partner funding application: status controls, documents, owners and activity.",
      },
      { property: "og:title", content: "Partner Application — Magenta Portal" },
      {
        property: "og:description",
        content: "Internal view of a partner funding application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">
        We couldn't load this application. Return to{" "}
        <Link className="underline" to="/partners">
          Partner Network
        </Link>
        .
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">That application no longer exists.</p>
    </AppShell>
  ),
  component: InternalApplicationDetailRoute,
});

function InternalApplicationDetailRoute() {
  const { applicationId } = Route.useParams();
  return (
    <PortalGuard audience="internal">
      <ApplicationDetail applicationId={applicationId} variant="internal" />
    </PortalGuard>
  );
}
