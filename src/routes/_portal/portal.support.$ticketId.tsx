import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { TicketThread } from "@/components/partner/ticket-thread";
import { Button } from "@/components/ui/button";
import { usePortalIdentity } from "@/hooks/use-portal-identity";

export const Route = createFileRoute("/_portal/portal/support/$ticketId")({
  head: () => ({
    meta: [
      { title: "Support Ticket — Magenta Portal" },
      {
        name: "description",
        content: "Follow the conversation with the Magenta partner desk on this support ticket.",
      },
      { property: "og:title", content: "Support Ticket — Magenta Portal" },
      { property: "og:description", content: "Your conversation with the Magenta partner desk." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerTicket,
});

function PartnerTicket() {
  const { ticketId } = useParams({ from: "/_portal/portal/support/$ticketId" });
  const { data: identity } = usePortalIdentity();

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Support Ticket"
        subtitle="Everything Magenta and your team have exchanged on this request."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/portal/support">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All Tickets
            </Link>
          </Button>
        }
      />
      <TicketThread
        ticketId={ticketId}
        author={{ kind: "partner", name: identity?.member?.full_name ?? "Partner" }}
      />
    </PartnerShell>
  );
}
