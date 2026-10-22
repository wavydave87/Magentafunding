import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/view-tracking";

export const Route = createFileRoute("/apply/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Apply For Funding — Magenta" },
      {
        name: "description",
        content:
          "Tell us about your business and how much you need. A Magenta funding specialist reviews every application the same day.",
      },
      { property: "og:title", content: "Apply For Funding — Magenta" },
      {
        property: "og:description",
        content: "Start a Magenta funding application in under two minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyPage,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ApplyPage() {
  const { slug } = useParams({ from: "/apply/$slug" });
  const search = useSearch({ from: "/apply/$slug" });
  const memberRef = search.ref ?? "";

  const [form, setForm] = useState({
    legal_business_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    requested_amount: "",
    average_monthly_revenue: "",
    use_of_funds: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    void supabase.rpc("record_referral_visit", {
      _slug: slug,
      _member_ref: memberRef,
      _visitor_id: getVisitorId(),
    });
  }, [slug, memberRef]);

  function validate(): string | null {
    if (!form.legal_business_name.trim()) return "Enter your legal business name.";
    if (!form.contact_first_name.trim() || !form.contact_last_name.trim())
      return "Enter the contact's first and last name.";
    if (!EMAIL.test(form.contact_email.trim())) return "Enter a valid email address.";
    if (form.contact_phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
    if (!(Number(form.requested_amount) > 0)) return "Enter how much funding you need.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStatus("saving");
    const { data, error: rpcError } = await supabase.rpc("submit_referral_application", {
      _slug: slug,
      _member_ref: memberRef,
      _legal_business_name: form.legal_business_name.trim().slice(0, 160),
      _contact_first_name: form.contact_first_name.trim().slice(0, 80),
      _contact_last_name: form.contact_last_name.trim().slice(0, 80),
      _contact_email: form.contact_email.trim().toLowerCase().slice(0, 160),
      _contact_phone: form.contact_phone.trim().slice(0, 40),
      _requested_amount: Number(form.requested_amount),
      _average_monthly_revenue: Number(form.average_monthly_revenue) || 0,
      _use_of_funds: form.use_of_funds.trim().slice(0, 500),
    });

    if (rpcError) {
      setStatus("idle");
      setError(rpcError.message.replace(/^.*?:\s*/, ""));
      return;
    }
    setReference(String(data));
    setStatus("done");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-12">
          {status === "done" ? (
            <div className="card-elevated p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
              <h1 className="mt-3 font-display text-3xl">Application Received</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your reference is{" "}
                <span className="font-mono font-medium text-foreground">{reference}</span>. A
                Magenta funding specialist will be in touch shortly.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl sm:text-4xl">Apply For Funding</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Two minutes now, and a Magenta funding specialist reviews your file the same day.
              </p>

              <form className="card-elevated mt-8 grid gap-4 p-6" onSubmit={submit} noValidate>
                <div className="grid gap-1.5">
                  <Label htmlFor="biz">Legal Business Name</Label>
                  <Input
                    id="biz"
                    value={form.legal_business_name}
                    maxLength={160}
                    onChange={(e) =>
                      setForm({ ...form, legal_business_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="first">First Name</Label>
                    <Input
                      id="first"
                      value={form.contact_first_name}
                      maxLength={80}
                      onChange={(e) =>
                        setForm({ ...form, contact_first_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="last">Last Name</Label>
                    <Input
                      id="last"
                      value={form.contact_last_name}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.contact_email}
                      maxLength={160}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.contact_phone}
                      maxLength={40}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="amount">Funding Needed ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      value={form.requested_amount}
                      onChange={(e) => setForm({ ...form, requested_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="revenue">Average Monthly Revenue ($)</Label>
                    <Input
                      id="revenue"
                      type="number"
                      min={0}
                      value={form.average_monthly_revenue}
                      onChange={(e) =>
                        setForm({ ...form, average_monthly_revenue: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="use">How Will You Use The Funds?</Label>
                  <Textarea
                    id="use"
                    rows={3}
                    maxLength={500}
                    value={form.use_of_funds}
                    onChange={(e) => setForm({ ...form, use_of_funds: e.target.value })}
                  />
                </div>

                {error ? (
                  <p role="alert" className="text-sm text-coral">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" size="lg" disabled={status === "saving"}>
                  {status === "saving" ? "Submitting…" : "Submit Application"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Your details are encrypted and only shared with Magenta underwriting.
                </p>
              </form>
            </>
          )}
        </div>
      </main>
      <BrandFooter note="Magenta · Invest in Possible." />
    </div>
  );
}
