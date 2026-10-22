import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { StepFields, reviewRows } from "@/components/merchant-application-form";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  STEPS,
  TOTAL_STEPS,
  completionFor,
  missingFields,
  validateStep,
  type DraftPayload,
} from "@/lib/merchant-application";
import { forgetApplicationToken, origin, rememberApplicationToken } from "@/lib/referral-links";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apply/start/$token")({
  head: () => ({
    meta: [
      { title: "Your Funding Application — Magenta" },
      {
        name: "description",
        content: "Continue your Magenta funding application. Your progress saves automatically.",
      },
      { property: "og:title", content: "Your Funding Application — Magenta" },
      { property: "og:description", content: "Continue your Magenta funding application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplicationWizard,
});

function ApplicationWizard() {
  const { token } = useParams({ from: "/apply/start/$token" });

  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [payload, setPayload] = useState<DraftPayload>({});
  const [step, setStep] = useState(1);
  const [reference, setReference] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [resumeLink, setResumeLink] = useState<string | null>(null);

  const dirty = useRef(false);
  const latest = useRef<{ payload: DraftPayload; step: number }>({ payload: {}, step: 1 });
  latest.current = { payload, step };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("merchant_get_application", {
        _token: token,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (rpcError || !row) {
        setExpired(true);
        setLoading(false);
        return;
      }
      rememberApplicationToken(token);
      setPayload((row.payload ?? {}) as DraftPayload);
      setStep(Math.min(TOTAL_STEPS, Math.max(1, row.current_step ?? 1)));
      setReference(row.reference ?? null);
      setSubmitted(Boolean(row.submitted));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const save = useCallback(
    async (silent: boolean) => {
      if (!dirty.current) return true;
      const { payload: current, step: currentStep } = latest.current;
      const { data, error: rpcError } = await supabase.rpc("merchant_save_step", {
        _token: token,
        _step: currentStep,
        _payload: current as never,
        _completion_percent: completionFor(currentStep),
      });
      if (rpcError || data === false) {
        if (!silent) setError("We couldn't save your progress. Check your connection and retry.");
        return false;
      }
      dirty.current = false;
      setSavedAt(new Date());
      return true;
    },
    [token],
  );

  // Autosave every 20 seconds while the merchant is typing.
  useEffect(() => {
    const timer = window.setInterval(() => void save(true), 20_000);
    return () => window.clearInterval(timer);
  }, [save]);

  function update(key: string, value: string | boolean) {
    dirty.current = true;
    setPayload((prev) => ({ ...prev, [key]: value }));
    setInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function goTo(nextStep: number) {
    setError(null);
    if (nextStep > step) {
      const problem = validateStep(step, payload);
      if (problem) {
        setInvalid(missingFields(step, payload));
        setError(problem);
        return;
      }
      // Always persist the reached step so partners see accurate progress.
      dirty.current = true;
    }
    setBusy(true);
    const ok = await save(false);
    setBusy(false);
    if (!ok) return;
    setStep(Math.min(TOTAL_STEPS, Math.max(1, nextStep)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError(null);
    setBusy(true);
    await save(false);
    const { data, error: rpcError } = await supabase.rpc("merchant_submit_application", {
      _token: token,
    });
    setBusy(false);
    if (rpcError || !data) {
      setError(rpcError?.message.replace(/^.*?:\s*/, "") ?? "We couldn't submit your application.");
      return;
    }
    setReference(String(data));
    setSubmitted(true);
    forgetApplicationToken();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function makeResumeLink() {
    const { data } = await supabase.rpc("merchant_request_resume_token", { _token: token });
    if (!data) {
      toast.error("We couldn't create a resume link right now.");
      return;
    }
    const link = `${origin()}/apply/resume/${String(data)}`;
    setResumeLink(link);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Resume link copied. It works for the next three days.");
    } catch {
      toast.success("Resume link ready below.");
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="card-elevated flex items-center gap-3 p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading your application…</p>
        </div>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <div className="card-elevated p-8">
          <h1 className="font-display text-2xl">This application link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For your security, application links stop working after a period of inactivity. Email{" "}
            <a className="underline" href="mailto:hello@magentafunding.com">
              hello@magentafunding.com
            </a>{" "}
            and we'll send you a fresh one.
          </p>
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="card-elevated p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
          <h1 className="mt-3 font-display text-3xl">Application Received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your reference is{" "}
            <span className="font-mono font-medium text-foreground">{reference}</span>. A Magenta
            funding specialist reviews your file today and will be in touch.
          </p>
        </div>
      </Shell>
    );
  }

  const current = STEPS[step - 1]!;
  const percent = completionFor(step - 1);

  return (
    <Shell>
      <div className="grid gap-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {step} of {TOTAL_STEPS} · {percent}% complete
          </p>
          <h1 className="mt-1 font-display text-3xl">{current.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
        </header>

        <ol className="flex flex-wrap gap-1.5" aria-label="Application progress">
          {STEPS.map((definition) => {
            const done = definition.id < step;
            const active = definition.id === step;
            return (
              <li key={definition.id} className="flex-1 min-w-[38px]">
                <button
                  type="button"
                  onClick={() => void goTo(definition.id)}
                  disabled={definition.id > step}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-11 w-full flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                    active && "border-primary bg-primary/10 text-foreground",
                    done && "border-success/40 bg-success/10 text-foreground",
                    !active && !done && "border-border text-muted-foreground",
                  )}
                >
                  <span className="hidden sm:inline">{definition.title}</span>
                  <span className="sm:hidden">{definition.id}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="card-elevated grid gap-5 p-6">
          {step === TOTAL_STEPS ? (
            <ReviewStep payload={payload} />
          ) : (
            <StepFields step={step} payload={payload} invalid={invalid} onChange={update} />
          )}

          {error ? (
            <p role="alert" className="text-sm text-coral">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || busy}
              onClick={() => void goTo(step - 1)}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              {savedAt ? (
                <span className="text-xs text-muted-foreground">Progress saved</span>
              ) : null}
              {step === TOTAL_STEPS ? (
                <Button type="button" size="lg" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Submitting…" : "Submit Application"}
                </Button>
              ) : (
                <Button type="button" size="lg" disabled={busy} onClick={() => void goTo(step + 1)}>
                  {busy ? "Saving…" : "Continue"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="card-elevated grid gap-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Need to stop? Get a private link to pick up where you left off.
            </p>
            <Button type="button" variant="outline" onClick={() => void makeResumeLink()}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Get Resume Link
            </Button>
          </div>
          {resumeLink ? (
            <p className="break-all rounded-lg bg-muted/60 p-3 font-mono text-xs">{resumeLink}</p>
          ) : null}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Your details are encrypted. Your referral partner sees only your progress, never your
          financial details.
        </p>
      </div>
    </Shell>
  );
}

function ReviewStep({ payload }: { payload: DraftPayload }) {
  const rows = reviewRows(payload);
  return (
    <div className="grid gap-3">
      <h2 className="font-display text-lg">Check your answers</h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-border/70 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 break-words text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-10">{children}</div>
      </main>
      <BrandFooter note="Magenta · Invest in Possible." />
    </div>
  );
}
