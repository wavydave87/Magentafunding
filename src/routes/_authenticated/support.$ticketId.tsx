import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PortalGuard } from "@/components/partner/portal-guard";
import { PortalPageHeader } from "@/components/partner/page-header";
import { TicketThread } from "@/components/partner/ticket-thread";
import { Button } from "@/components/ui/button";
import { usePortalIdentity } from "@/hooks/use-portal-identity";

export const Route = createFileRoute("/_authenticated/support/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket — Magenta Portal" },
      {
        name: "description",
        content: "Reply to a partner support ticket and move it through the desk workflow.",
      },
      { property: "og:title", content: "Ticket — Magenta Portal" },
      { property: "og:description", content: "Reply to a partner support ticket." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <InternalTicket />
    </PortalGuard>
  ),
});

function InternalTicket() {
  const { ticketId } = useParams({ from: "/_authenticated/support/$ticketId" });
  const { data: identity } = usePortalIdentity();

  return (
    <AppShell>
      <PortalPageHeader
        title="Partner Ticket"
        subtitle="Replies are visible to the partner organization immediately."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/support">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Partner Desk
            </Link>
          </Button>
        }
      />
      <TicketThread
        ticketId={ticketId}
        canChangeStatus
        author={{
          kind: "magenta",
          name: identity?.email?.split("@")[0] ?? "Magenta Team",
        }}
      />
    </AppShell>
  );
}
