import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { portalDb, isPartnerViewActive } from "@/lib/portal-db";
import { shortDate } from "@/lib/partner";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["portal-notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_notifications")
        .select("id, kind, title, body, link_path, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRow[];
    },
  });
}

/** Header bell with unread count and a dropdown of the most recent items. */
export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: rows } = useNotifications();
  const items = rows ?? [];
  const unread = items.filter((n) => !n.read_at);

  useEffect(() => {
    if (isPartnerViewActive()) return;
    const channel = supabase
      .channel("portal-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "partner_notifications" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  async function markAllRead() {
    const ids = unread.map((n) => n.id);
    if (ids.length === 0) return;
    await Promise.all(ids.map(id => portalDb.from("partner_notifications").update({ read_at: new Date().toISOString() }).eq("id", id)));
    await queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
  }

  async function open(item: NotificationRow) {
    if (!item.read_at) {
      await portalDb
        .from("partner_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", item.id);
      void queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
    }
    if (item.link_path) navigate({ to: item.link_path as never });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          aria-label={
            unread.length > 0 ? `Notifications, ${unread.length} unread` : "Notifications"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread.length > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unread.length > 0 ? (
            <button
              type="button"
              className="focus-ring rounded text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                void markAllRead();
              }}
            >
              Mark All Read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </p>
        ) : (
          items.slice(0, 10).map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={cn("flex-col items-start gap-0.5", !item.read_at && "bg-accent/50")}
              onSelect={() => void open(item)}
            >
              <span className="text-sm font-medium">{item.title}</span>
              {item.body ? (
                <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
              ) : null}
              <span className="text-[11px] text-muted-foreground">
                {shortDate(item.created_at)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
