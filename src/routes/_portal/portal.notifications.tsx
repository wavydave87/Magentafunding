import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { useNotifications } from "@/components/partner/notification-bell";
import { Button } from "@/components/ui/button";
import { portalDb } from "@/lib/portal-db";
import { cn } from "@/lib/utils";
import { formatStamp } from "@/lib/view-tracking";

export const Route = createFileRoute("/_portal/portal/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Magenta Portal" },
      {
        name: "description",
        content:
          "Every status change, commission payment and support reply Magenta has sent your organization.",
      },
      { property: "og:title", content: "Notifications — Magenta Portal" },
      { property: "og:description", content: "Status changes, commissions and support replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at);

  async function markAllRead() {
    if (unread.length === 0) return;
    await portalDb
      .from("partner_notifications")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((n) => n.id),
      );
    await queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
  }

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Notifications"
        subtitle="Application updates, commission payments and support replies."
        actions={
          <Button variant="outline" onClick={() => void markAllRead()} disabled={unread.length === 0}>
            Mark All Read
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-elevated h-16 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <BellOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing to catch up on yet.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn("card-elevated p-4", !n.read_at && "border-primary/40 bg-brand-wash")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.body ? (
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <time className="text-xs text-muted-foreground" dateTime={n.created_at}>
                    {formatStamp(n.created_at)}
                  </time>
                </div>
                {n.link_path ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: n.link_path as never })}
                  >
                    View
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PartnerShell>
  );
}
