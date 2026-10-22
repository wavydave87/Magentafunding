import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Mail, MessageSquare, QrCode, Send } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, telHref } from "@/lib/phone";

export interface SendOfferDeal {
  id: string;
  merchant_name: string;
  merchant_email?: string | null;
  merchant_phone?: string | null;
  expiration_date?: string | null;
  rep_name?: string | null;
  rep_email?: string | null;
  rep_phone?: string | null;
}

interface Props {
  deal: SendOfferDeal | null;
  kind?: "offer" | "reminder";
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

const prettyDate = (value?: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

/**
 * One place to get an offer in front of a merchant: emailed from the app,
 * texted, or shared manually with a link, QR code and ready-made copy.
 * Every attempt is logged to deal_sends so the rep can see what went out.
 */
export function SendOfferDialog({ deal, kind = "offer", onOpenChange, onSent }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);
  // Inline confirmation of the last logged send, so a rep sees proof in place.
  const [lastSend, setLastSend] = useState<{ channel: string; destination?: string | null; at: Date } | null>(null);

  const link = useMemo(
    () =>
      deal && typeof window !== "undefined"
        ? `${window.location.origin}/offer/${deal.id}`
        : "",
    [deal],
  );

  useEffect(() => {
    if (!link) return;
    let active = true;
    void QRCode.toDataURL(link, { width: 320, margin: 1 }).then((url) => {
      if (active) setQr(url);
    });
    return () => {
      active = false;
    };
  }, [link]);

  useEffect(() => {
    setNote("");
    setCopied(null);
    setLastSend(null);
  }, [deal?.id]);

  if (!deal) return null;

  const expires = prettyDate(deal.expiration_date);
  const reminder = kind === "reminder";

  const emailSubject = reminder
    ? `Reminder: your Magenta funding offer${expires ? ` expires ${expires}` : ""}`
    : `Your approved Magenta funding offer, ${deal.merchant_name}`;

  const emailBody = [
    `Hi ${deal.merchant_name},`,
    "",
    reminder
      ? "Just a quick nudge — your approved funding offer is still waiting for you:"
      : "Great news, you're approved. You can review your funding options, pick the payment structure that fits, choose a funding date and accept online here:",
    "",
    link,
    expires ? `\nThis offer is valid through ${expires}.` : "",
    note ? `\n${note}` : "",
    "",
    `— ${deal.rep_name ?? "Your Magenta representative"}`,
    deal.rep_email ?? "",
    deal.rep_phone ? formatPhone(deal.rep_phone) : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const smsBody = reminder
    ? `Reminder from Magenta: your approved funding offer is ready — ${link}`
    : `${deal.merchant_name}, you're approved! Review and accept your Magenta funding offer here: ${link}`;

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      toast.success(`${what} copied.`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  }

  /** Records the send so the deal page can show what went out and when. */
  async function logSend(channel: "email" | "sms" | "manual", destination?: string | null) {
    if (!deal) return;
    setLogging(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in.");
      const { error } = await supabase.from("deal_sends").insert({
        deal_id: deal.id,
        channel,
        kind,
        destination: destination ?? null,
        sent_by: userId,
        status: "sent",
      });
      if (error) throw error;
      if (deal.expiration_date) {
        await supabase
          .from("deals")
          .update({ status: "sent" })
          .eq("id", deal.id)
          .eq("status", "draft");
      }
      setLastSend({ channel, destination: destination ?? null, at: new Date() });
      toast.success("Logged as sent.");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record that send.");
    } finally {
      setLogging(false);
    }
  }

  const mailto = `mailto:${deal.merchant_email ?? ""}?subject=${encodeURIComponent(
    emailSubject,
  )}&body=${encodeURIComponent(emailBody)}`;
  const smsHref = deal.merchant_phone
    ? `sms:${telHref(deal.merchant_phone)?.replace("tel:", "") ?? ""}?&body=${encodeURIComponent(smsBody)}`
    : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {reminder ? "Send a Reminder" : "Send Offer"} — {deal.merchant_name}
          </DialogTitle>
          <DialogDescription>
            Share the offer link, then log it so you can track opens and follow-ups.
          </DialogDescription>
        </DialogHeader>
        {lastSend ? (
          <p
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-selected px-3 py-2 text-sm font-semibold text-plum"
            role="status"
          >
            <Check className="size-4" aria-hidden />
            Sent By{" "}
            {lastSend.channel === "sms"
              ? "Text"
              : lastSend.channel === "email"
                ? "Email"
                : "Link"}
            {lastSend.destination ? ` To ${lastSend.destination}` : ""} · Logged{" "}
            {lastSend.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        ) : null}

        <Tabs defaultValue="manual">

          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1">
              <Link2 className="size-4" /> Link & QR
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1">
              <Mail className="size-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex-1">
              <MessageSquare className="size-4" /> Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div>
              <Label htmlFor="send-link">Offer Link</Label>
              <div className="mt-1.5 flex gap-2">
                <Input id="send-link" readOnly value={link} className="font-mono text-xs" />
                <Button variant="outline" onClick={() => void copy(link, "Link")}>
                  {copied === "Link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-secondary p-4">
              {qr ? (
                <img
                  src={qr}
                  alt={`QR code linking to the offer for ${deal.merchant_name}`}
                  className="size-32 rounded-lg bg-card p-2"
                />
              ) : (
                <div className="grid size-32 place-items-center rounded-lg bg-card">
                  <QrCode className="size-6 text-muted-foreground" aria-hidden />
                </div>
              )}
              <p className="max-w-64 text-sm text-muted-foreground">
                Sitting with the merchant? Have them scan this with their phone camera to
                open the offer instantly.
              </p>
            </div>

            <div>
              <Label htmlFor="send-note">Personal Note (Optional)</Label>
              <Textarea
                id="send-note"
                className="mt-1.5"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Great speaking with you today — here are your approved options."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col rounded-xl border border-border p-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Ready-Made Email
                </p>
                <p className="mt-1.5 max-h-40 min-w-0 overflow-y-auto text-[13px]/relaxed break-words whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]">
                  {emailBody}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void copy(`${emailSubject}\n\n${emailBody}`, "Email text")}
                >
                  <Copy className="size-4" /> Copy Email Text
                </Button>
              </div>
              <div className="flex min-w-0 flex-col rounded-xl border border-border p-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Ready-Made Text
                </p>
                <p className="mt-1.5 max-h-40 min-w-0 overflow-y-auto text-[13px]/relaxed break-words text-muted-foreground [overflow-wrap:anywhere]">
                  {smsBody}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void copy(smsBody, "Text message")}
                >
                  <Copy className="size-4" /> Copy Text Message
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={logging}
              onClick={() => void logSend("manual", deal.merchant_email ?? deal.merchant_phone)}
            >
              <Send className="size-4" /> I Sent This — Log It
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 pt-4">
            <div>
              <Label>Merchant Email</Label>
              <Input readOnly className="mt-1.5" value={deal.merchant_email ?? "Not set"} />
            </div>
            <p className="rounded-xl border border-gold/50 bg-internal p-3 text-sm text-internal-foreground">
              Sending email straight from the app needs your company email domain connected
              once (a short DNS step). Until then, use your own inbox — the Link & QR tab has
              the message ready to paste.
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled={!deal.merchant_email}
              asChild={!!deal.merchant_email}
            >
              {deal.merchant_email ? (
                <a href={mailto} onClick={() => void logSend("email", deal.merchant_email)}>
                  <Mail className="size-4" /> Open in My Email App
                </a>
              ) : (
                <span>Add a merchant email on this deal first</span>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sms" className="space-y-3 pt-4">
            <div>
              <Label>Merchant Phone</Label>
              <Input
                readOnly
                className="mt-1.5"
                value={deal.merchant_phone ? formatPhone(deal.merchant_phone) : "Not set"}
              />
            </div>
            <p className="rounded-xl border border-gold/50 bg-internal p-3 text-sm text-internal-foreground">
              Automatic texting needs a texting provider connected to the app. For now you
              can send it from your own phone below.
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled={!smsHref}
              asChild={!!smsHref}
            >
              {smsHref ? (
                <a href={smsHref} onClick={() => void logSend("sms", deal.merchant_phone)}>
                  <MessageSquare className="size-4" /> Text From My Phone
                </a>
              ) : (
                <span>Add a merchant phone on this deal first</span>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
