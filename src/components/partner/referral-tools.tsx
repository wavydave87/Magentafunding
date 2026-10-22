/**
 * Referral Tools — permanent short-code links, QR codes and a live preview.
 *
 * Links are built from the organization and member codes, which never change,
 * so a printed QR code or an old email keeps attributing correctly.
 */
import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Link2, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadDataUrl,
  referralLink,
  referralQrDataUrl,
} from "@/lib/referral-links";

interface Props {
  organizationCode: string | null | undefined;
  organizationName: string | null | undefined;
  memberCode: string | null | undefined;
  memberName: string | null | undefined;
  active: boolean;
  /** Hide the personal/organization toggle and use the codes exactly as given. */
  lockToMember?: boolean;
}

/**
 * A one-page, print-ready sheet: large QR, the readable link underneath, and
 * who the referral belongs to. Opens the browser print dialog directly so a
 * partner can pin it up at a counter.
 */
function printQrSheet({
  qr,
  link,
  heading,
  subheading,
}: {
  qr: string;
  link: string;
  heading: string;
  subheading: string;
}) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    toast.error("Allow pop-ups to print the QR sheet.");
    return;
  }
  const escape = (s: string) => s.replace(/[<>&]/g, (c) => `&#${c.charCodeAt(0)};`);
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>Magenta Referral QR</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; text-align: center; color: #1c1420; }
  h1 { font-size: 30px; margin: 0 0 4px; }
  p.sub { margin: 0 0 28px; font-size: 15px; color: #6b5f6d; }
  img { width: 340px; height: 340px; }
  p.link { margin-top: 24px; font-family: ui-monospace, monospace; font-size: 15px; word-break: break-all; }
  p.foot { margin-top: 26px; font-size: 13px; color: #6b5f6d; }
</style></head><body>
<h1>${escape(heading)}</h1>
<p class="sub">${escape(subheading)}</p>
<img src="${qr}" alt="Referral QR code" />
<p class="link">${escape(link)}</p>
<p class="foot">Scan to start a funding application with Magenta.</p>
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
  win.document.close();
}

export function ReferralToolsCard({
  organizationCode,
  organizationName,
  memberCode,
  memberName,
  active,
  lockToMember,
}: Props) {
  const [personal, setPersonal] = useState(Boolean(memberCode));
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const link = organizationCode
    ? referralLink(organizationCode, personal ? memberCode : null)
    : "";

  useEffect(() => {
    setQr(null);
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  async function makeQr() {
    try {
      const dataUrl = await referralQrDataUrl(link);
      setQr(dataUrl);
    } catch {
      toast.error("Couldn't generate the QR code.");
    }
  }

  if (!organizationCode) {
    return (
      <section className="card-elevated p-5">
        <h2 className="font-display text-lg">Referral Tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your referral code is being set up. Your Magenta rep can activate it for you.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Referral tools" className="card-elevated p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg">Referral Tools</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {personal && memberCode
          ? `Submissions through this link are credited to ${memberName ?? "you"}.`
          : `Submissions through this link are credited to ${organizationName ?? "your organization"}.`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          readOnly
          value={link}
          aria-label="Referral link"
          className="min-w-[16rem] flex-1 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" onClick={() => void copy()}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void makeQr()}>
          <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
          QR Code
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Preview
          </a>
        </Button>
      </div>

      {memberCode && !lockToMember ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="focus-ring h-4 w-4 rounded border-input"
            checked={personal}
            onChange={(e) => setPersonal(e.target.checked)}
          />
          Credit submissions to me personally ({memberCode})
        </label>
      ) : null}

      {qr ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <img
            src={qr}
            alt={`QR code linking to ${link}`}
            className="h-36 w-36 rounded-lg border border-border bg-white p-2"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadDataUrl(
                qr,
                `magenta-referral-${(personal && memberCode ? memberCode : organizationCode).toLowerCase()}.png`,
              )
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download QR
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              printQrSheet({
                qr,
                link,
                heading: personal && memberName ? memberName : (organizationName ?? "Magenta"),
                subheading:
                  personal && memberName ? (organizationName ?? "") : "Apply for funding",
              })
            }
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print Sheet
          </Button>
        </div>
      ) : null}

      {!active ? (
        <p className="mt-3 text-sm text-coral">
          This link is paused because your organization isn't active. Contact your Magenta rep.
        </p>
      ) : null}
    </section>
  );
}
