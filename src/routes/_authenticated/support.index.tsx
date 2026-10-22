import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LifeBuoy } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PortalGuard } from "@/components/partner/portal-guard";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ToneBadge } from "@/components/partner/tone-badge";
import { supabase } from "@/integrations/supabase/client";
import { shortDate } from "@/lib/partner";
import { TICKET_STATUS, type TicketStatus } from "@/lib/partner-portal";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_authenticated/support/")({
  head: () => ({
    meta: [
      { title: "Partner Desk — Magenta Portal" },
      {
        name: "description",
        content: "Internal inbox for every support ticket raised by Magenta partner organizations.",
      },
      { property: "og:title", content: "Partner Desk — Magenta Portal" },
      { property: "og:description", content: "Every open partner support ticket in one inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <SupportInbox />
    </PortalGuard>
  ),
});

function SupportInbox() {
  const [status, setStatus] = useState<"open" | "all">("open");

  const { data, isLoading } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: async () => {
      const [tickets, orgs] = await Promise.all([
        supabase
          .from("partner_support_tickets")
          .select("id, reference, subject, category, status, organization_id, last_message_at")
          .order("last_message_at", { ascending: false }),
        supabase.from("partner_organizations").select("id, name"),
      ]);
      if (tickets.error) throw new Error(tickets.error.message);
      return { tickets: tickets.data ?? [], orgs: orgs.data ?? [] };
    },
  });

  const orgName = new Map((data?.orgs ?? []).map((o) => [o.id, o.name]));
  const rows = (data?.tickets ?? []).filter((t) =>
    status === "all" ? true : !["resolved", "closed"].includes(t.status),
  );

  return (
    <AppShell>
      <PortalPageHeader
        title="Partner Desk"
        subtitle="Every question your partner network has asked, oldest activity last."
        actions={
          <select
            aria-label="Filter tickets"
            className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="open">Needs Action</option>
            <option value="all">All Tickets</option>
          </select>
        }
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-elevated h-16 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <LifeBuoy className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">Inbox zero. Nothing waiting.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((t) => (
            <li key={t.id} className="card-elevated flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[14rem] flex-1">
                <Link
                  to="/support/$ticketId"
                  params={{ ticketId: t.id }}
                  className="focus-ring font-medium underline-offset-2 hover:underline"
                >
                  {t.subject}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {titleCaseName(orgName.get(t.organization_id) ?? "Unknown")} ·{" "}
                  <span className="font-mono">{t.reference}</span> · {t.category} ·{" "}
                  {shortDate(t.last_message_at)}
                </p>
              </div>
              <ToneBadge
                label={TICKET_STATUS[t.status as TicketStatus].label}
                tone={TICKET_STATUS[t.status as TicketStatus].tone}
              />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
