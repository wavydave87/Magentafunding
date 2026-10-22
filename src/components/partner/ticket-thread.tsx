import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { portalDb } from "@/lib/portal-db";
import { TICKET_STATUS, type TicketStatus } from "@/lib/partner-portal";
import { cn } from "@/lib/utils";
import { formatStamp } from "@/lib/view-tracking";

export interface TicketAuthor {
  kind: "partner" | "magenta";
  name: string;
}

/**
 * Shared ticket conversation used by both the partner support screen and the
 * internal partner desk inbox. The only difference between the two audiences
 * is who the reply is attributed to and which status it moves the ticket into.
 */
export function TicketThread({
  ticketId,
  author,
  canChangeStatus,
}: {
  ticketId: string;
  author: TicketAuthor;
  canChangeStatus?: boolean;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: async () => {
      const [ticket, messages] = await Promise.all([
        portalDb
          .from("partner_support_tickets")
          .select("id, reference, subject, category, status, organization_id, created_at")
          .eq("id", ticketId)
          .maybeSingle(),
        portalDb
          .from("partner_support_messages")
          .select("id, author_kind, author_name, body, created_at")
          .eq("ticket_id", ticketId)
          .order("created_at"),
      ]);
      if (ticket.error) throw new Error(ticket.error.message);
      if (messages.error) throw new Error(messages.error.message);
      return { ticket: ticket.data, messages: messages.data ?? [] };
    },
  });

  const ticket = data?.ticket;

  const reply = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error("Ticket not found.");
      if (!body.trim()) throw new Error("Write a message first.");
      const { error } = await portalDb.from("partner_support_messages").insert({
        ticket_id: ticket.id,
        organization_id: ticket.organization_id,
        author_kind: author.kind,
        author_name: author.name,
        body: body.trim().slice(0, 4000),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["partner-tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["support-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const { error } = await portalDb
        .from("partner_support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["support-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="card-elevated h-64 animate-pulse bg-muted/40" />;
  }
  if (!ticket) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="text-sm text-muted-foreground">That ticket is not available.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-display text-lg">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{ticket.reference}</span> · {ticket.category}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToneBadge
            label={TICKET_STATUS[ticket.status as TicketStatus].label}
            tone={TICKET_STATUS[ticket.status as TicketStatus].tone}
          />
          {canChangeStatus ? (
            <select
              aria-label="Ticket status"
              className="focus-ring h-9 rounded-md border border-input bg-card px-2 text-sm"
              value={ticket.status}
              onChange={(e) => setStatus.mutate(e.target.value as TicketStatus)}
            >
              {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS[s].label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <ol className="grid gap-3">
        {(data?.messages ?? []).map((m) => (
          <li
            key={m.id}
            className={cn(
              "card-elevated p-4",
              m.author_kind === "magenta" ? "bg-brand-wash" : undefined,
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                {m.author_name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {m.author_kind === "magenta" ? "Magenta" : "Partner"}
                </span>
              </p>
              <time className="text-xs text-muted-foreground" dateTime={m.created_at}>
                {formatStamp(m.created_at)}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
          </li>
        ))}
      </ol>

      {ticket.status === "closed" ? (
        <p className="text-sm text-muted-foreground">This ticket is closed.</p>
      ) : (
        <form
          className="card-elevated grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            reply.mutate();
          }}
        >
          <label htmlFor="ticket-reply" className="text-sm font-medium">
            Reply
          </label>
          <Textarea
            id="ticket-reply"
            rows={4}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message…"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={reply.isPending || !body.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {reply.isPending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
