import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { rememberApplicationToken, visitorKey } from "@/lib/referral-links";

export const Route = createFileRoute("/apply/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search["ref"] === "string" ? (search["ref"] as string) : undefined,
    user: typeof search["user"] === "string" ? (search["user"] as string) : undefined,
    source: typeof search["source"] === "string" ? (search["source"] as string) : undefined,
    campaign: typeof search["campaign"] === "string" ? (search["campaign"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Apply For Business Funding — Magenta" },
      {
        name: "description",
        content:
          "Start a Magenta funding application in two minutes. Save your progress and finish whenever suits you.",
      },
      { property: "og:title", content: "Apply For Business Funding — Magenta" },
      {
        property: "og:description",
        content: "A short application, reviewed the same day by a Magenta funding specialist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyLanding,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HIGHLIGHTS = [
  "Takes about ten minutes, and your progress saves as you go.",
  "No impact on your credit to apply.",
  "A funding specialist reviews every application the same day.",
];

function ApplyLanding() {
  const search = useSearch({ from: "/apply/" });
  const navigate = useNavigate();

  const orgCode = (search.ref ?? "").trim();
  const memberCode = (search.user ?? "").trim();

  const [visitId, setVisitId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<"checking" | "valid" | "invalid">(
    orgCode ? "checking" : "invalid",
  );
  const [form, setForm] = useState({
    legal_business_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgCode) return;
    let cancelled = false;
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("record_referral_landing", {
        _org_code: orgCode,
        _visitor_id: visitorKey(),
        ...(memberCode ? { _user_code: memberCode } : {}),
        ...(search.source ? { _source: search.source } : {}),
        ...(search.campaign ? { _campaign: search.campaign } : {}),
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (rpcError || !row) {
        setLinkState("invalid");
        return;
      }
      setVisitId(row.visit_id ?? null);
      setPartnerName(row.organization_name ?? null);
      setLinkState("valid");
    })();
    return () => {
      cancelled = true;
    };
  }, [orgCode, memberCode, search.source, search.campaign]);

  function validate(): string | null {
    if (!form.legal_business_name.trim()) return "Enter your legal business name.";
    if (!form.contact_first_name.trim() || !form.contact_last_name.trim())
      return "Enter your first and last name.";
    if (!EMAIL.test(form.contact_email.trim())) return "Enter a valid email address.";
    if (form.contact_phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
    return null;
  }

  async function start(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc("start_merchant_application", {
      _org_code: orgCode,
      _legal_business_name: form.legal_business_name.trim().slice(0, 160),
      _contact_first_name: form.contact_first_name.trim().slice(0, 80),
      _contact_last_name: form.contact_last_name.trim().slice(0, 80),
      _contact_email: form.contact_email.trim().toLowerCase().slice(0, 160),
      _contact_phone: form.contact_phone.trim().slice(0, 40),
      ...(memberCode ? { _user_code: memberCode } : {}),
      ...(visitId ? { _visit_id: visitId } : {}),
    });
    if (rpcError || !data) {
      setBusy(false);
      setError(rpcError?.message.replace(/^.*?:\s*/, "") ?? "We couldn't start your application.");
      return;
    }
    const token = String(data);
    rememberApplicationToken(token);
    void navigate({ to: "/apply/start/$token", params: { token } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <h1 className="font-display text-3xl sm:text-4xl">Apply For Business Funding</h1>
            {partnerName ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Referred by <span className="font-medium text-foreground">{partnerName}</span>
              </p>
            ) : null}
            <ul className="mt-6 grid gap-3">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            {linkState === "invalid" ? (
              <div className="card-elevated p-6">
                <h2 className="font-display text-xl">This link isn't active</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask the person who sent it for an up-to-date link, or email{" "}
                  <a className="underline" href="mailto:hello@magentafunding.com">
                    hello@magentafunding.com
                  </a>{" "}
                  and we'll get you started.
                </p>
              </div>
            ) : (
              <form className="card-elevated grid gap-4 p-6" onSubmit={start} noValidate>
                <h2 className="font-display text-xl">Let's get started</h2>
                <div className="grid gap-1.5">
                  <Label htmlFor="biz">Legal business name</Label>
                  <Input
                    id="biz"
                    value={form.legal_business_name}
                    maxLength={160}
                    onChange={(e) => setForm({ ...form, legal_business_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="first">First name</Label>
                    <Input
                      id="first"
                      value={form.contact_first_name}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="last">Last name</Label>
                    <Input
                      id="last"
                      value={form.contact_last_name}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
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
                    />
                  </div>
                </div>

                {error ? (
                  <p role="alert" className="text-sm text-coral">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" size="lg" disabled={busy || linkState === "checking"}>
                  {busy ? "Starting…" : "Start My Application"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Your details are encrypted and only shared with Magenta underwriting.
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
      <BrandFooter note="Magenta · Invest in Possible." />
    </div>
  );
}
