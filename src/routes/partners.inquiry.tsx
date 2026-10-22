import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/partners/inquiry")({
  head: () => ({
    meta: [
      { title: "Become a Magenta Referral Partner" },
      {
        name: "description",
        content:
          "Tell Magenta about your business and join the referral partner network — refer merchants, track funding and earn commission.",
      },
      { property: "og:title", content: "Become a Magenta Referral Partner" },
      {
        property: "og:description",
        content: "Refer businesses to Magenta and earn commission on funded deals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerInquiry,
});

const PARTNER_TYPES = [
  { value: "referral_partner", label: "Referral partner" },
  { value: "iso", label: "ISO / broker" },
  { value: "strategic_partner", label: "Strategic partner" },
];

/**
 * Public interest form. Submitting this NEVER creates an account, membership
 * or referral code — it only records a lead for Magenta to follow up on.
 */
function PartnerInquiry() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    partner_type: "referral_partner",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("partner_inquiries").insert({
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      partner_type: form.partner_type,
      message: form.message.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("We couldn't send that. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="bg-brand-wash flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-xl">
          {sent ? (
            <div className="card-elevated p-8 text-center">
              <CheckCircle2 className="text-success mx-auto h-10 w-10" aria-hidden="true" />
              <h1 className="font-display mt-4 text-2xl">Thanks — we've got it</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                A member of the Magenta partner team will be in touch shortly. Partner accounts
                are set up by Magenta once we've spoken.
              </p>
              <Button asChild className="mt-6">
                <Link to="/portal/login">Back To Partner Sign In</Link>
              </Button>
            </div>
          ) : (
            <div className="card-elevated p-7">
              <h1 className="font-display text-2xl">Become a Magenta Referral Partner</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Refer businesses to Magenta, follow every application through funding and earn
                commission on funded deals.
              </p>

              <form className="mt-6 grid gap-4" onSubmit={submit}>
                <div className="grid gap-2">
                  <Label htmlFor="business_name">Business name</Label>
                  <Input
                    id="business_name"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="contact_name">Your name</Label>
                    <Input
                      id="contact_name"
                      required
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inquiry_email">Email</Label>
                    <Input
                      id="inquiry_email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="inquiry_phone">Phone</Label>
                    <Input
                      id="inquiry_phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inquiry_website">Website</Label>
                    <Input
                      id="inquiry_website"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner_type">How would you work with Magenta?</Label>
                  <select
                    id="partner_type"
                    className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
                    value={form.partner_type}
                    onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inquiry_message">Anything else?</Label>
                  <Textarea
                    id="inquiry_message"
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Send Inquiry"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already a partner?{" "}
                  <Link to="/portal/login" className="focus-ring underline underline-offset-2">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </main>
      <BrandFooter note="Magenta Referral Partner Portal · Invest in Possible." />
    </div>
  );
}
