/**
 * "Refer a Business" — the portal's highest-frequency action.
 *
 * Everything here works from the partner's own permanent referral codes, so a
 * link shared today keeps attributing correctly years later. The manual path
 * records a referral and hands back the same personalized application link —
 * it never becomes a second merchant application inside the portal.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { portalDb } from "@/lib/portal-db";
import { downloadDataUrl, referralLink, referralQrDataUrl } from "@/lib/referral-links";

export function ReferBusinessDialog({
  trigger,
  disabled,
}: {
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const { data: identity } = usePortalIdentity();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"share" | "manual">("share");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    merchant_business_name: "",
    merchant_contact_name: "",
    merchant_email: "",
    merchant_phone: "",
    note: "",
  });

  const member = identity?.member ?? null;
  const org = member?.organization ?? null;
  const link = org?.code ? referralLink(org.code, member?.code ?? null) : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  async function showQr() {
    try {
      setQr(await referralQrDataUrl(link));
    } catch {
      toast.error("Couldn't generate the QR code.");
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Apply for funding with Magenta",
          text: "Start your Magenta funding application here.",
          url: link,
        });
        return;
      } catch {
        /* the person dismissed the share sheet */
      }
    }
    await copyLink();
  }

  const createReferral = useMutation({
    mutationFn: async () => {
      if (!org?.id) throw new Error("Your organization isn't set up yet.");
      const { error } = await portalDb.from("partner_referrals").insert({
        organization_id: org.id,
        member_id: member?.id ?? null,
        merchant_business_name: form.merchant_business_name.trim(),
        merchant_contact_name: form.merchant_contact_name.trim() || null,
        merchant_email: form.merchant_email.trim().toLowerCase() || null,
        merchant_phone: form.merchant_phone.trim() || null,
        referral_code_used: org.code,
        member_code_used: member?.code ?? null,
        origin: "manual",
        note: form.note.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Referral recorded. Send them your application link to get started.");
      setForm({
        merchant_business_name: "",
        merchant_contact_name: "",
        merchant_email: "",
        merchant_phone: "",
        note: "",
      });
      setMode("share");
      await queryClient.invalidateQueries({ queryKey: ["partner-referral-records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={disabled}>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Refer a Business
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Refer a Business</DialogTitle>
          <DialogDescription>
            Businesses that apply through your link or QR code are automatically credited to you
            and {org?.name ?? "your organization"}.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <p className="text-sm text-muted-foreground">
            Your referral code is still being set up. Your Magenta rep can activate it for you.
          </p>
        ) : mode === "share" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="refer-link">Your application link</Label>
              <Input
                id="refer-link"
                readOnly
                value={link}
                className="mt-1.5 font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={() => void share()}>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Share My Link
              </Button>
              <Button type="button" variant="outline" onClick={() => void copyLink()}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy Application Link"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void showQr()}>
                <QrCode className="mr-2 h-4 w-4" aria-hidden="true" /> Show QR Code
              </Button>
              <Button type="button" variant="outline" onClick={() => setMode("manual")}>
                <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Submit Referral Manually
              </Button>
            </div>

            {qr ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
                <img
                  src={qr}
                  alt={`QR code linking to ${link}`}
                  className="h-36 w-36 rounded-md bg-white p-2"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadDataUrl(qr, "magenta-referral-qr.png")}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Download QR
                </Button>
              </div>
            ) : null}

            <Button type="button" variant="ghost" asChild className="w-full">
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Preview Application
              </a>
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createReferral.mutate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Record the business now, then send them your link so they can apply.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="refer-business">Business name</Label>
              <Input
                id="refer-business"
                required
                value={form.merchant_business_name}
                onChange={(e) => setForm({ ...form, merchant_business_name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="refer-contact">Contact name</Label>
                <Input
                  id="refer-contact"
                  value={form.merchant_contact_name}
                  onChange={(e) => setForm({ ...form, merchant_contact_name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="refer-phone">Phone</Label>
                <Input
                  id="refer-phone"
                  type="tel"
                  value={form.merchant_phone}
                  onChange={(e) => setForm({ ...form, merchant_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="refer-email">Email</Label>
              <Input
                id="refer-email"
                type="email"
                value={form.merchant_email}
                onChange={(e) => setForm({ ...form, merchant_email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="refer-note">Note</Label>
              <Textarea
                id="refer-note"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={createReferral.isPending}>
                {createReferral.isPending ? "Saving…" : "Save Referral"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("share")}>
                Back To Sharing
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
