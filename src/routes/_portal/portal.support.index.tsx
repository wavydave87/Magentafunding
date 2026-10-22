import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { portalDb } from "@/lib/portal-db";
import { shortDate } from "@/lib/partner";
import { TICKET_CATEGORIES, TICKET_STATUS, type TicketStatus } from "@/lib/partner-portal";

export const Route = createFileRoute("/_portal/portal/support/")({
  head: () => ({
    meta: [
      { title: "Support — Magenta Portal" },
      {
        name: "description",
        content:
          "Open a ticket with the Magenta partner desk or find an answer in the partner FAQ.",
      },
      { property: "og:title", content: "Support — Magenta Portal" },
      { property: "og:description", content: "Partner support tickets and frequently asked questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-tickets"],
    queryFn: async () => {
      const [tickets, faqs] = await Promise.all([
        portalDb
          .from("partner_support_tickets")
          .select("id, reference, subject, category, status, last_message_at, created_at")
          .order("last_message_at", { ascending: false }),
        portalDb
          .from("partner_faqs")
          .select("id, question, answer, category, published, sort_order")
          .order("sort_order"),
      ]);
      if (tickets.error) throw new Error(tickets.error.message);
      return {
        tickets: tickets.data ?? [],
        faqs: (faqs.data ?? []).filter((f) => f.published),
      };
    },
  });

  const tickets = data?.tickets ?? [];
  const faqs = data?.faqs ?? [];

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Support"
        subtitle="Ask the Magenta partner desk anything — we reply inside the portal."
        actions={<NewTicketDialog />}
      />

      <section aria-label="Your tickets">
        <h2 className="mb-3 font-display text-lg">Your Tickets</h2>
        {isLoading ? (
          <div className="card-elevated divide-y divide-border">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <LifeBuoy className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              No tickets yet. Open one and we'll get back to you.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {tickets.map((t) => (
              <li key={t.id} className="card-elevated flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[14rem] flex-1">
                  <Link
                    to="/portal/support/$ticketId"
                    params={{ ticketId: t.id }}
                    className="focus-ring font-medium underline-offset-2 hover:underline"
                  >
                    {t.subject}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{t.reference}</span> · {t.category} · updated{" "}
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
      </section>

      <section aria-label="Frequently asked questions" className="mt-10">
        <h2 className="mb-3 font-display text-lg">Frequently Asked Questions</h2>
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published FAQs yet.</p>
        ) : (
          <Accordion type="single" collapsible className="card-elevated px-4">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-muted-foreground">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </PartnerShell>
  );
}

function NewTicketDialog() {
  const { data: identity } = usePortalIdentity();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: TICKET_CATEGORIES[0] as string,
    body: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const member = identity?.member;
      if (!member) throw new Error("Your partner membership could not be resolved.");
      if (!form.subject.trim() || !form.body.trim())
        throw new Error("Add a subject and a message.");

      const { data: ticket, error } = await portalDb
        .from("partner_support_tickets")
        .insert({
          organization_id: member.organization_id,
          created_by_member_id: member.id,
          subject: form.subject.trim().slice(0, 160),
          category: form.category,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const { error: msgError } = await portalDb.from("partner_support_messages").insert({
        ticket_id: ticket.id,
        organization_id: member.organization_id,
        author_kind: "partner",
        author_name: member.full_name,
        body: form.body.trim().slice(0, 4000),
      });
      if (msgError) throw new Error(msgError.message);
    },
    onSuccess: async () => {
      toast.success("Ticket opened. We'll reply here.");
      setOpen(false);
      setForm({ subject: "", category: TICKET_CATEGORIES[0] as string, body: "" });
      await queryClient.invalidateQueries({ queryKey: ["partner-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" /> New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a Support Ticket</DialogTitle>
          <DialogDescription>
            The Magenta partner desk replies inside the portal and you'll get a notification.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              value={form.subject}
              maxLength={160}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-category">Category</Label>
            <select
              id="ticket-category"
              className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-body">How can we help?</Label>
            <Textarea
              id="ticket-body"
              rows={5}
              maxLength={4000}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Opening…" : "Open Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
