import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BrandHeader, iconAsset } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, telHref } from "@/lib/phone";
import { getVisitorId } from "@/lib/view-tracking";
import { BANK_VERIFICATION_LABEL, isSafeBankVerificationUrl } from "@/lib/deal-defaults";
import { PaymentSchedule } from "@/components/payment-schedule";

import {
  computeStructure,
  formatMoney,
  formatScheduleDate,
  nextBusinessDay,
  toISODate,
  pifOutcome,
  type Frequency,
} from "@/lib/pricing";

export const Route = createFileRoute("/offer/$dealId")({
  head: () => ({
    meta: [
      { title: "Your Funding Offer — Magenta" },
      {
        name: "description",
        content:
          "Review your Magenta funding options, pick the amount and payment schedule that fits, and accept online.",
      },
      { property: "og:title", content: "Your Funding Offer — Magenta" },
      {
        property: "og:description",
        content: "Review your funding options and accept your offer online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Client offer links must never surface in search results.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OfferPage,
  errorComponent: () => (
    <CenteredMessage
      title="This offer isn't available"
      body="The link may be incorrect or the offer may have expired. Reach out to your Magenta representative for a fresh link."
    />
  ),
  notFoundComponent: () => (
    <CenteredMessage
      title="Offer not found"
      body="Double-check the link your representative sent you."
    />
  ),
});

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1080px] flex-col items-center justify-center px-6 text-center">
      <img src={iconAsset.url} alt="Magenta" className="h-10 w-10" />
      <h1 className="mt-5 text-2xl text-plum">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

const longDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

interface Selection {
  amount: number;
  source: string;
}

function OfferPage() {
  const { dealId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);


  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [dragOver, setDragOver] = useState(false);
  const [queued, setQueued] = useState<File[]>([]);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseAmount, setReviseAmount] = useState<number | null>(null);
  const [reviseFrequency, setReviseFrequency] = useState<Frequency>("daily");
  const [reviseNote, setReviseNote] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [fundingDate, setFundingDate] = useState<string>("");


  const { data, isLoading } = useQuery({
    queryKey: ["offer", dealId],
    queryFn: async () => {
      const [deal, presets, tiers, items, acceptance, docs, revision] = await Promise.all([
        // Single controlled lookup: rep contact and the bank link are only
        // released for an open offer whose exact id the visitor already has.
        supabase.rpc("get_public_deal", { _deal_id: dealId }),
        supabase.rpc("get_public_deal_presets", { _deal_id: dealId }),
        supabase.rpc("get_public_deal_tiers", { _deal_id: dealId }),
        supabase.rpc("get_public_deal_checklist", { _deal_id: dealId }),

        supabase
          .from("deal_acceptances")
          .select(
            "accepted_amount, frequency, computed_payment, accepted_at, requested_funding_date",
          )
          .eq("deal_id", dealId)
          .maybeSingle(),
        supabase
          .from("uploaded_documents")
          .select("file_name, uploaded_at")
          .eq("deal_id", dealId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("deal_revision_requests")
          .select(
            "requested_amount, frequency, computed_payment, note, created_at, requested_funding_date",
          )
          .eq("deal_id", dealId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (deal.error) throw deal.error;
      return {
        deal: deal.data?.[0] ?? null,
        presets: presets.data ?? [],
        tiers: tiers.data ?? [],
        items: items.data ?? [],
        acceptance: acceptance.data,
        docs: docs.data ?? [],
        revision: revision.data,
      };
    },
  });


  const deal = data?.deal;
  const accepted = data?.acceptance ?? null;
  const openRevision = data?.revision ?? null;


  const terms = useMemo(
    () =>
      deal
        ? {
            sell_rate: Number(deal.sell_rate ?? 0),
            weekly_rate_increase_points: Number(deal.weekly_rate_increase_points ?? 0),
            term_days: Number(deal.term_days ?? 0),
            origination_fee_percent: Number(deal.origination_fee_percent ?? 0),
            other_fees: Number(deal.other_fees ?? 0),
          }
        : null,
    [deal],
  );

  // Lock the page to the recorded structure once the client has accepted.
  useEffect(() => {
    if (!accepted) return;
    setFrequency(accepted.frequency === "weekly" ? "weekly" : "daily");
    setSelection({ amount: Number(accepted.accepted_amount), source: "accepted" });
    if (accepted.requested_funding_date) setFundingDate(accepted.requested_funding_date);
  }, [accepted]);

  useEffect(() => {
    if (deal && customAmount === null) {
      const min = Number(deal.min_funded ?? 0);
      const max = Number(deal.max_funded ?? 0);
      setCustomAmount(Math.round((min + max) / 2 / 100) * 100);
    }
  }, [deal, customAmount]);

  // Land screen-reader and keyboard users on the result after they pick a structure.
  useEffect(() => {
    if (selection && selection.source !== "accepted") {
      selectedHeadingRef.current?.focus();
    }
  }, [selection]);

  // Bank verification is only a live button when the rep both ticked the
  // checklist item and saved a valid https link.
  const checklistItems = data?.items ?? [];
  const bankVerificationUrl =
    checklistItems.some((item) => item.label === BANK_VERIFICATION_LABEL) &&
    isSafeBankVerificationUrl(deal?.bank_verification_url)
      ? (deal!.bank_verification_url as string)
      : null;
  const otherChecklistItems = checklistItems.filter(
    (item) => item.label !== BANK_VERIFICATION_LABEL,
  );
  const [bankOpened, setBankOpened] = useState(false);

  /** Log the click, then hand the merchant off to the secure link. */
  function openBankVerification() {
    if (!bankVerificationUrl) return;
    setBankOpened(true);
    void (async () => {
      try {
        const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
        await supabase.rpc("record_bank_verification_click", {
          _deal_id: dealId,
          _visitor_id: getVisitorId(),
          ...(ua ? { _user_agent: ua } : {}),
        });
      } catch {
        /* tracking must never block verification */
      }
    })();
    window.open(bankVerificationUrl, "_blank", "noreferrer");
  }

  // Record that the merchant opened this offer. The database de-dupes repeat
  // opens from the same device inside 30 minutes; failures stay silent so
  // tracking can never block the offer from rendering.
  const viewLogged = useRef(false);
  useEffect(() => {
    if (!deal || viewLogged.current) return;
    viewLogged.current = true;
    // Awaited so the request actually leaves the browser; errors stay silent.
    void (async () => {
      try {
        const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
        await supabase.rpc("record_deal_view", {
          _deal_id: dealId,
          _visitor_id: getVisitorId(),
          ...(ua ? { _user_agent: ua } : {}),
        });
      } catch {
        /* tracking must never break the offer */
      }
    })();
  }, [deal, dealId]);





  if (isLoading) {
    return <CenteredMessage title="Loading your offer…" body="One moment." />;
  }

  if (!deal || !terms) {
    return (
      <CenteredMessage
        title="Offer not available"
        body="This offer link is no longer active. Your representative can send a new one."
      />
    );
  }

  const expired =
    !!deal.expiration_date && new Date(`${deal.expiration_date}T23:59:59`) < new Date();
  const presets = data?.presets ?? [];
  const minFunded = Number(deal.min_funded ?? 0);
  const maxFunded = Number(deal.max_funded ?? 0);
  const custom = customAmount ?? minFunded;
  const customStructure = computeStructure(terms, custom, frequency);
  const structure = selection
    ? computeStructure(terms, selection.amount, frequency)
    : null;
  const repPhoneHref = telHref(deal.rep_phone);
  const repContactSentence = repPhoneHref
    ? `Call ${deal.rep_name} at ${formatPhone(deal.rep_phone)}`
    : `Email ${deal.rep_name} at ${deal.rep_email}`;

  // Allowed funding window: rep-set dates, otherwise next business day through expiry.
  const windowStart =
    deal.funding_window_start ?? toISODate(nextBusinessDay(new Date()));
  const windowEnd = deal.funding_window_end ?? deal.expiration_date ?? undefined;

  /** Clamp to the approved range and snap to $100, then keep any live selection in sync. */
  function pickCustomAmount(value: number) {
    const bounded = Math.min(maxFunded, Math.max(minFunded, Number.isFinite(value) ? value : minFunded));
    const next = Math.round(bounded / 100) * 100;
    setCustomAmount(next);
    if (selection?.source === "custom") setSelection({ amount: next, source: "custom" });
  }

  const clampAmount = (value: number) => {
    const bounded = Math.min(
      maxFunded,
      Math.max(minFunded, Number.isFinite(value) ? value : minFunded),
    );
    return Math.round(bounded / 100) * 100;
  };

  const reviseValue = reviseAmount ?? Number(accepted?.accepted_amount ?? custom);
  const reviseStructure = computeStructure(terms, clampAmount(reviseValue), reviseFrequency);

  /** Before acceptance this simply reopens the picker; afterwards it opens the request form. */
  function startRevision() {
    setReviseError(null);
    if (!accepted) {
      setSelection(null);
      setCustomOpen(true);
      document.getElementById("pick-structure")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setReviseAmount(clampAmount(Number(accepted.accepted_amount)));
    setReviseFrequency(accepted.frequency === "weekly" ? "weekly" : "daily");
    setReviseNote(openRevision?.note ?? "");
    setReviseOpen(true);
  }

  async function submitRevision() {
    setRevising(true);
    setReviseError(null);
    try {
      const amount = clampAmount(reviseValue);
      const note = reviseNote.trim();
      const { error } = await supabase.rpc("request_revision", {
        _deal_id: dealId,
        _amount: amount,
        _frequency: reviseFrequency,
        _payment: Number(reviseStructure.payment.toFixed(2)),
        _payback: Number(reviseStructure.payback.toFixed(2)),
        ...(note ? { _note: note } : {}),
        ...(fundingDate ? { _funding_date: fundingDate } : {}),
      });

      if (error) throw error;
      toast.success("Your rep has been notified of the change you'd like.");
      setReviseOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["offer", dealId] });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't send your request. Please contact your representative.";
      setReviseError(message);
      toast.error(message);
    } finally {
      setRevising(false);
    }
  }




  async function accept() {
    if (!structure || !selection) {
      setAcceptError("Choose a structure above before accepting.");
      return;
    }
    if (accepted) {
      setAcceptError("This offer has already been accepted.");
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      const { error } = await supabase.rpc("accept_offer", {
        _deal_id: dealId,
        _amount: selection.amount,
        _frequency: frequency,
        _payment: Number(structure.payment.toFixed(2)),
        _payback: Number(structure.payback.toFixed(2)),
        ...(fundingDate ? { _funding_date: fundingDate } : {}),
      });
      if (error) throw error;
      toast.success("Offer accepted. Your representative has been notified.");
      await queryClient.invalidateQueries({ queryKey: ["offer", dealId] });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const message = /already|duplicate|unique/i.test(raw)
        ? "This offer has already been accepted. Contact your representative to make changes."
        : raw ||
          "We couldn't record your acceptance. Please try again or contact your representative.";
      setAcceptError(message);
      toast.error(message);
      await queryClient.invalidateQueries({ queryKey: ["offer", dealId] });
    } finally {
      setAccepting(false);
    }
  }

  async function upload(files: File[]) {
    if (!files.length) {
      setUploadError("Choose at least one file before sending.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadProgress({ done: 0, total: files.length });
    try {
      let done = 0;
      for (const file of files) {
        const path = `${dealId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage
          .from("closing-documents")
          .upload(path, file, { upsert: false });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        const insert = await supabase.from("uploaded_documents").insert({
          deal_id: dealId,
          file_name: file.name,
          file_size: file.size,
          storage_path: path,
        });
        if (insert.error) throw new Error(`${file.name}: ${insert.error.message}`);
        done += 1;
        setUploadProgress({ done, total: files.length });
      }
      toast.success("Documents sent to your representative.");
      setQueued([]);
      await queryClient.invalidateQueries({ queryKey: ["offer", dealId] });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Upload failed — ${error.message}`
          : "Upload failed. Please try again.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }


  return (
    <div>
      <BrandHeader
        right={
          repPhoneHref ? (
            <a
              href={repPhoneHref}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-plum"
            >
              <Phone className="size-4 text-primary" />
              <span className="hidden sm:inline">{deal.rep_name} · </span>
              {formatPhone(deal.rep_phone)}
            </a>
          ) : (
            <a
              href={`mailto:${deal.rep_email}`}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-plum"
            >
              <Mail className="size-4 text-primary" />
              <span className="hidden sm:inline">{deal.rep_name}</span>
              <span className="sm:hidden">Email Your Rep</span>
            </a>
          )
        }
      />
      <div className="mx-auto max-w-[1080px] px-5 py-6">
      <a
        href="#pick-structure"
        className="focus-ring sr-only rounded-[9px] bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to your offer options
      </a>
      <main id="offer-main">

      {/* Hero */}
      <section className="relative mb-5 overflow-hidden rounded-2xl border border-border bg-hero-sheen px-6 py-7">
        <img
          src={iconAsset.url}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-14 w-64 opacity-[0.07] select-none"
        />
        <p className="relative z-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Your Approved Funding Offer
        </p>



        <div className="relative z-1 mt-4 flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-primary text-primary">
            <Check className="size-4.5" strokeWidth={3} />
          </span>
          <h1 className="text-2xl text-plum sm:text-3xl">
            You&apos;re approved, {deal.merchant_name}!
          </h1>
        </div>

        <p className="relative z-1 mt-2 max-w-[56ch] text-sm text-muted-foreground">
          Choose the structure below that fits your business best, or customize your
          own to match your cash flow.
        </p>

        {deal.expiration_date ? (
          <p className="relative z-1 mt-3 inline-block rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-primary">
            Offer valid through {longDate(deal.expiration_date)}
          </p>
        ) : null}

        <div className="mt-4 h-1 rounded bg-rule-gradient" />
      </section>

      {/* Pick Your Structure */}
      <OfferTile
        id="pick-structure"
        title="Pick Your Structure"
        summary="Every option below is already approved — pick one, or customize your own further down."
      >


        {deal.allow_weekly ? (
          <div className="mb-5 flex justify-center">
            <div
              role="radiogroup"
              aria-label="Payment schedule"
              className="flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]"
            >
              {(["daily", "weekly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={frequency === f}
                  tabIndex={frequency === f ? 0 : -1}
                  onClick={() => setFrequency(f)}
                  onKeyDown={(e) => {
                    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
                      e.preventDefault();
                      setFrequency(frequency === "daily" ? "weekly" : "daily");
                    }
                  }}
                  disabled={!!accepted}
                  className={`focus-ring min-h-11 rounded-[7px] px-4 py-2 text-[13px] font-bold capitalize transition-colors disabled:opacity-60 ${
                    frequency === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {f} Payments
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <ul className="grid list-none gap-3.5 p-0 md:grid-cols-3">
          {presets.map((preset, index) => {
            const s = computeStructure(terms, Number(preset.amount), frequency);
            // After acceptance the recorded amount keeps its matching card highlighted.
            const isActive =
              selection?.source === `preset-${index}` ||
              (selection?.source === "accepted" &&
                Number(selection.amount) === Number(preset.amount));
            return (
              <li
                key={index}
                aria-current={isActive ? "true" : undefined}
                className={`flex flex-col gap-2.5 rounded-2xl border p-4.5 transition-all ${
                  isActive
                    ? "card-selected ring-2 ring-primary/45"
                    : "border-border hover:border-primary hover:shadow-card"
                }`}

              >
                <p className="text-sm font-extrabold text-plum">
                  {preset.label}
                  {isActive ? (
                    <span className="ml-2 text-[11px] font-bold uppercase text-primary">
                      Selected
                    </span>
                  ) : null}
                </p>
                <div>
                  <p className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">
                    {frequency === "daily" ? "Daily" : "Weekly"} Payment
                  </p>
                  <p className="font-display text-2xl font-extrabold">
                    {formatMoney(s.payment, 2)}
                  </p>
                </div>
                <PresetRow label="Funded" value={formatMoney(Number(preset.amount), 2)} />
                <PresetRow label="Term" value={`${terms.term_days} days`} />
                <PresetRow label="Total Payback" value={formatMoney(s.payback, 2)} />
                {!accepted ? (
                  <button
                    type="button"
                    aria-label={`Select ${preset.label} — ${formatMoney(
                      Number(preset.amount),
                      2,
                    )} funded, ${frequency} payment ${formatMoney(s.payment, 2)}`}
                    onClick={() =>
                      setSelection({
                        amount: Number(preset.amount),
                        source: `preset-${index}`,
                      })
                    }
                    className="focus-ring mt-1 min-h-11 w-full rounded-[9px] bg-primary px-3.5 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-plum"
                  >
                    {isActive ? "Selected" : "Select This Option"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>

        {!accepted && maxFunded > minFunded ? (
          <>
            <div className="my-4 text-center">
              <button
                type="button"
                aria-expanded={customOpen}
                aria-controls="custom-structure-panel"
                onClick={() => setCustomOpen((o) => !o)}
                className="focus-ring min-h-11 text-[13px] font-bold text-primary underline"
              >
                Want something in between? Customize your own →
              </button>
            </div>

            {customOpen ? (
              <div id="custom-structure-panel" className="border-t border-border pt-5">
                <div className="mb-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label
                      htmlFor="custom-amount"
                      className="text-xs font-bold tracking-wide uppercase text-muted-foreground"
                    >
                      Funded Amount
                    </label>
                    <span className="text-[15px] font-extrabold text-plum">
                      {formatMoney(custom, 2)}
                    </span>
                  </div>
                  <input
                    id="custom-amount"
                    type="range"
                    className="focus-ring w-full accent-primary"
                    min={minFunded}
                    max={maxFunded}
                    step={100}
                    value={custom}
                    aria-label="Funded amount"
                    aria-valuetext={`${formatMoney(custom, 0)} of ${formatMoney(
                      minFunded,
                      0,
                    )} to ${formatMoney(maxFunded, 0)}`}
                    onChange={(e) => pickCustomAmount(Number(e.target.value))}
                  />
                  <div className="mt-2.5 flex items-center gap-2">
                    <label
                      htmlFor="custom-amount-exact"
                      className="text-xs text-muted-foreground"
                    >
                      Or Type an Exact Amount
                    </label>
                    <input
                      id="custom-amount-exact"
                      type="number"
                      inputMode="numeric"
                      className="focus-ring w-36 rounded-[9px] border border-border bg-card px-2.5 py-2 text-[13px]"
                      min={minFunded}
                      max={maxFunded}
                      step={100}
                      value={custom}
                      onChange={(e) => pickCustomAmount(Number(e.target.value))}
                      onBlur={(e) => pickCustomAmount(Number(e.target.value))}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Between {formatMoney(minFunded, 0)} and {formatMoney(maxFunded, 0)}, in
                    $100 steps.
                  </p>
                </div>
                <p className="mb-3.5 text-xs text-muted-foreground">
                  Every offer runs over a fixed{" "}
                  <strong>{terms.term_days}</strong>-business-day term.
                </p>
                <div aria-live="polite">
                  <p className="sr-only">
                    {formatMoney(custom, 0)} funded — {frequency} payment{" "}
                    {formatMoney(customStructure.payment, 2)}, total payback{" "}
                    {formatMoney(customStructure.payback, 2)}, net funded{" "}
                    {formatMoney(customStructure.netFunded, 2)}.
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Metric
                      label="Estimated Payment"
                      value={formatMoney(customStructure.payment, 2)}
                    />
                    <Metric
                      label="Total Payback"
                      value={formatMoney(customStructure.payback, 2)}
                    />
                  </div>

                  {/* Live preview — recalculates instantly as the slider moves */}
                  <div className="mt-3.5 grid grid-cols-1 overflow-hidden rounded-xl border border-border sm:grid-cols-2">
                    <Stat label="Origination Fee" value={formatMoney(customStructure.originationFee, 2)} />
                    <Stat label="Other Fees" value={formatMoney(customStructure.otherFees, 2)} />
                    <Stat label="Total Fees" value={formatMoney(customStructure.totalFees, 2)} />
                    <Stat label="Net Funded Amount" value={formatMoney(customStructure.netFunded, 2)} />
                  </div>

                  {deal.pif_enabled && (data?.tiers.length ?? 0) > 0 ? (
                    <div className="mt-3.5">
                      <p className="mb-1.5 text-xs font-bold tracking-wide uppercase text-muted-foreground">
                        Early Payoff at This Amount
                      </p>
                      <PifTable payback={customStructure.payback} tiers={data!.tiers} />
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label={`Select custom structure of ${formatMoney(custom, 0)} funded`}
                  onClick={() => setSelection({ amount: custom, source: "custom" })}
                  className="focus-ring mt-4 min-h-11 w-full rounded-[9px] bg-primary px-3.5 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-plum"
                >
                  Select This Structure
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </OfferTile>


      {/* Selected structure */}
      {structure ? (
        <OfferTile
          id="selected-structure"
          title="Your Selected Structure"
          headingRef={selectedHeadingRef}
          summary={`${formatMoney(structure.amount, 2)} funded over ${terms.term_days} business days with ${frequency} payments of ${formatMoney(structure.payment, 2)}.`}
        >



          <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border sm:grid-cols-2">
            <Stat label="Funded Amount" value={formatMoney(structure.amount, 2)} />
            <Stat label="Term" value={`${terms.term_days} days`} />
            <Stat label="Payment" value={formatMoney(structure.payment, 2)} />
            <Stat label="Total Payback" value={formatMoney(structure.payback, 2)} />
            <Stat label="Origination Fee" value={formatMoney(structure.originationFee, 2)} />
            <Stat label="Other Fees" value={formatMoney(structure.otherFees, 2)} />
            <Stat label="Total Fees" value={formatMoney(structure.totalFees, 2)} />
            <Stat label="Net Funded Amount" value={formatMoney(structure.netFunded, 2)} />
          </div>

          {/* Requested funding date — drives the payment schedule dates below. */}
          <div className="mt-5 rounded-xl border border-border bg-secondary p-3.5">
            <label
              htmlFor="funding-date"
              className="text-xs font-bold tracking-wide uppercase text-muted-foreground"
            >
              Requested Funding Date
            </label>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Tell us when you&apos;d like the funds. Payments begin the next business day.
            </p>
            <input
              id="funding-date"
              type="date"
              value={fundingDate}
              min={windowStart}
              {...(windowEnd ? { max: windowEnd } : {})}
              disabled={!!accepted || expired}
              onChange={(e) => setFundingDate(e.target.value)}
              className="focus-ring mt-2 min-h-11 w-full max-w-56 rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] disabled:opacity-70"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground" aria-live="polite">
              {fundingDate
                ? `Requested for ${formatScheduleDate(fundingDate)}.`
                : windowEnd
                  ? `Any business day between ${formatScheduleDate(windowStart)} and ${formatScheduleDate(windowEnd)}.`
                  : `Any business day from ${formatScheduleDate(windowStart)}.`}
              {accepted ? " Contact your rep to change this date." : ""}
            </p>
          </div>

          <PaymentSchedule
            structure={structure}
            frequency={frequency}
            fundingDate={fundingDate || null}
          />

          {deal.pif_enabled && (data?.tiers.length ?? 0) > 0 ? (
            <div className="mt-5">
              <h3 className="mb-1.5 text-[15px] text-plum">
                Early Payoff Discount Options
              </h3>
              <PifTable payback={structure.payback} tiers={data!.tiers} />
            </div>
          ) : null}

          {!accepted && !expired ? (
            <>
              <button
                onClick={accept}
                disabled={accepting}
                aria-busy={accepting}
                className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-primary px-3.5 py-3 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-plum disabled:opacity-70"
              >
                {accepting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {accepting ? "Recording your acceptance…" : "Accept This Offer"}
              </button>

              {acceptError ? (
                <p
                  role="alert"
                  className="mt-2.5 rounded-[10px] border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-[13px] font-semibold text-destructive"
                >
                  {acceptError}
                </p>
              ) : null}
            </>
          ) : null}

          {accepted ? (
            <p className="mt-5 flex items-center gap-2 rounded-[10px] border border-success/30 bg-success-soft px-3.5 py-3 text-[13px] font-semibold text-success">
              <Check className="size-4 shrink-0" /> Offer accepted — no further action needed
              here.
            </p>
          ) : null}

          {/* Merchant-driven revisions: reopen the picker, or request a change after acceptance. */}
          {!expired ? (
            <button
              type="button"
              onClick={startRevision}
              className="focus-ring mt-3 min-h-11 w-full rounded-[9px] border border-primary bg-card px-3.5 py-2.5 text-[13px] font-bold text-primary transition-colors hover:bg-accent"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <RefreshCw className="size-4" aria-hidden /> Revise My Choice
              </span>
            </button>
          ) : null}

          {openRevision && !reviseOpen ? (
            <p className="mt-3 rounded-[10px] border border-gold/60 bg-internal px-3.5 py-3 text-[13px] text-internal-foreground">
              <strong>Change Requested</strong> —{" "}
              {formatMoney(Number(openRevision.requested_amount), 2)} funded with{" "}
              {openRevision.frequency} payments of{" "}
              {formatMoney(Number(openRevision.computed_payment), 2)}.{" "}
              {openRevision.note ? `“${openRevision.note}” ` : ""}
              {deal.rep_name} has been notified and will follow up.
            </p>
          ) : null}

          {reviseOpen ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <h3 className="text-[15px] text-plum">Request a Different Structure</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Your accepted offer stays on file. {deal.rep_name} reviews your request and
                confirms the change with you.
              </p>

              {deal.allow_weekly ? (
                <div
                  role="radiogroup"
                  aria-label="Requested payment schedule"
                  className="mt-3 inline-flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]"
                >
                  {(["daily", "weekly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={reviseFrequency === f}
                      tabIndex={reviseFrequency === f ? 0 : -1}
                      onClick={() => setReviseFrequency(f)}
                      onKeyDown={(e) => {
                        if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
                          e.preventDefault();
                          setReviseFrequency(reviseFrequency === "daily" ? "weekly" : "daily");
                        }
                      }}
                      className={`focus-ring min-h-11 rounded-[7px] px-4 py-2 text-[13px] font-bold capitalize ${
                        reviseFrequency === f
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {f} Payments
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label
                    htmlFor="revise-amount"
                    className="text-xs font-bold tracking-wide uppercase text-muted-foreground"
                  >
                    Requested Funded Amount
                  </label>
                  <span className="text-[15px] font-extrabold text-plum">
                    {formatMoney(clampAmount(reviseValue), 2)}
                  </span>
                </div>
                <input
                  id="revise-amount"
                  type="range"
                  className="focus-ring w-full accent-primary"
                  min={minFunded}
                  max={maxFunded}
                  step={100}
                  value={clampAmount(reviseValue)}
                  aria-label="Requested funded amount"
                  aria-valuetext={`${formatMoney(clampAmount(reviseValue), 0)} of ${formatMoney(
                    minFunded,
                    0,
                  )} to ${formatMoney(maxFunded, 0)}`}
                  onChange={(e) => setReviseAmount(clampAmount(Number(e.target.value)))}
                />
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="revise-amount-exact" className="text-xs text-muted-foreground">
                    Or Type an Exact Amount
                  </label>
                  <input
                    id="revise-amount-exact"
                    type="number"
                    inputMode="numeric"
                    className="focus-ring min-h-11 w-36 rounded-[9px] border border-border bg-card px-2.5 py-2 text-[13px]"
                    min={minFunded}
                    max={maxFunded}
                    step={100}
                    value={clampAmount(reviseValue)}
                    onChange={(e) => setReviseAmount(clampAmount(Number(e.target.value)))}
                  />
                </div>
              </div>

              <div aria-live="polite" className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                <Metric
                  label="New Estimated Payment"
                  value={formatMoney(reviseStructure.payment, 2)}
                />
                <Metric label="New Total Payback" value={formatMoney(reviseStructure.payback, 2)} />
              </div>

              <div className="mt-3.5">
                <label
                  htmlFor="revise-note"
                  className="text-xs font-bold tracking-wide uppercase text-muted-foreground"
                >
                  Anything Your Rep Should Know? (Optional)
                </label>
                <textarea
                  id="revise-note"
                  value={reviseNote}
                  onChange={(e) => setReviseNote(e.target.value)}
                  className="focus-ring mt-1.5 min-h-20 w-full rounded-[9px] border border-border bg-card p-3 text-[13px]"
                  placeholder="I'd like a lower daily payment."
                />
              </div>

              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void submitRevision()}
                  disabled={revising}
                  aria-busy={revising}
                  className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[9px] bg-primary px-3.5 py-2.5 text-[13px] font-bold text-primary-foreground hover:bg-plum disabled:opacity-70"
                >
                  {revising ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {revising ? "Sending your request…" : "Send Request to My Rep"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviseOpen(false)}
                  className="focus-ring min-h-11 rounded-[9px] border border-border bg-card px-3.5 py-2.5 text-[13px] font-bold text-muted-foreground"
                >
                  Cancel
                </button>
              </div>

              {reviseError ? (
                <p
                  role="alert"
                  className="mt-2.5 rounded-[10px] border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-[13px] font-semibold text-destructive"
                >
                  {reviseError}
                </p>
              ) : null}
            </div>
          ) : null}




          {expired && !accepted ? (
            <p className="mt-5 rounded-[10px] border border-border bg-secondary px-3.5 py-3 text-[13px] text-muted-foreground">
              This offer has expired. {repContactSentence} for updated terms.
            </p>
          ) : null}

          <p className="mt-2.5 text-[13px] text-muted-foreground">
            Questions? {deal.rep_name} ·{" "}
            <a
              href={`mailto:${deal.rep_email}`}
              className="focus-ring font-bold text-primary"
            >
              {deal.rep_email}
            </a>
            {repPhoneHref ? (
              <>
                {" · "}
                <a
                  href={repPhoneHref}
                  className="focus-ring font-bold text-primary"
                  aria-label={`Call ${deal.rep_name} at ${formatPhone(deal.rep_phone)}`}
                >
                  {formatPhone(deal.rep_phone)}
                </a>
              </>
            ) : null}
          </p>
          {!repPhoneHref ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Prefer a call? Email {deal.rep_name} with a good number and time, and
              they&apos;ll ring you back.
            </p>
          ) : null}

        </OfferTile>
      ) : null}

      {/* Checklist */}
      {structure && (data?.items.length ?? 0) > 0 ? (
        <>
          {accepted ? (
            <p className="mb-5 rounded-[10px] border border-success/30 bg-success-soft px-3.5 py-3 text-[13px] text-success">
              Your offer is accepted — {formatMoney(Number(accepted.accepted_amount), 2)} with{" "}
              {accepted.frequency} payments of{" "}
              {formatMoney(Number(accepted.computed_payment), 2)}. {deal.rep_name} will
              reach out shortly.
            </p>
          ) : null}
          <OfferTile
            id="closing-checklist"
            title="What We'll Need to Move Forward"
            summary={`${data?.items.length ?? 0} item${(data?.items.length ?? 0) === 1 ? "" : "s"} to have ready once your rep reaches out.`}
            defaultOpen={false}
          >
          {bankVerificationUrl ? (
            <div className="mb-4 rounded-[12px] border-2 border-primary bg-selected p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-plum">
                <ShieldCheck className="size-4 shrink-0" aria-hidden /> Bank Verification
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Securely connect your business bank account — it&apos;s the fastest way to
                verify your revenue. No statements to dig up.
              </p>
              <button
                type="button"
                onClick={openBankVerification}
                className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-primary px-3.5 py-3 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-plum"
              >
                <ShieldCheck className="size-4" aria-hidden /> Verify My Bank
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
                {bankOpened
                  ? "Verification opened in a new tab. You can come back here any time."
                  : "Opens your funder's secure verification page in a new tab."}
              </p>
            </div>
          ) : null}
          <ul className="m-0 list-none p-0">
            {otherChecklistItems.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 border-b border-border py-2.5 text-sm last:border-b-0"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          </OfferTile>
        </>
      ) : null}

      {/* Upload */}
      {structure ? (
        <OfferTile
          id="closing-uploads"
          title="Upload Your Closing Documents"
          summary="Send your files straight to your rep — stored privately, visible only to Magenta."
        >


          <label
            htmlFor="doc-upload"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              setUploadError(null);
              setQueued((q) => [...q, ...Array.from(e.dataTransfer.files)]);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-secondary px-4 py-7 text-center transition-colors ${
              dragOver ? "border-primary bg-accent" : "border-border hover:border-primary"
            }`}
          >
            <Upload className="size-7 text-primary opacity-60" />
            <span className="text-[13px] font-semibold text-muted-foreground">
              Click to choose files, or drag them here
            </span>
            <input
              id="doc-upload"
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                setUploadError(null);
                setQueued((q) => [...q, ...Array.from(e.target.files ?? [])]);
              }}
            />
          </label>

          {queued.length ? (
            <ul className="mt-3.5 flex list-none flex-col gap-2 p-0">
              {queued.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-[9px] border border-border bg-secondary px-3 py-2 text-[13px]"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setQueued((q) => q.filter((_, i) => i !== index))}
                    className="focus-ring flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-coral"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            onClick={() => void upload(queued)}
            disabled={uploading}
            aria-busy={uploading}
            className="focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-primary px-3.5 py-3 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
            {uploading
              ? uploadProgress
                ? `Sending ${uploadProgress.done + 1} of ${uploadProgress.total}…`
                : "Sending…"
              : queued.length
                ? `Send ${queued.length} file${queued.length > 1 ? "s" : ""} to my rep`
                : "Send documents"}
          </button>

          {uploadError ? (
            <p
              role="alert"
              className="mt-2.5 rounded-[10px] border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-[13px] font-semibold text-destructive"
            >
              {uploadError}
            </p>
          ) : null}

          <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Choose your documents above, then send them to {deal.rep_name}.
          </p>


          {(data?.docs.length ?? 0) > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Already received
              </p>
              <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-[13px] text-muted-foreground">
                {data!.docs.map((doc, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-success" />
                    {doc.file_name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </OfferTile>
      ) : null}

      </main>

      <footer className="px-0 pt-6 pb-2.5 text-center text-[10px] text-muted-foreground">
        <img
          src={iconAsset.url}
          alt="Magenta"
          className="mx-auto mb-1.5 h-8 w-8 opacity-80"
        />
        <p>
          This offer was prepared for {deal.merchant_name} by {deal.rep_name} At Magenta.
        </p>
      </footer>
      </div>
    </div>

  );
}

/**
 * Every major block on this page is a tile the merchant can fold away, so a
 * long offer stays readable on a phone. Collapsed, the tile keeps a one-line
 * summary of what's inside.
 */
function OfferTile({
  id,
  title,
  summary,
  defaultOpen = true,
  headingRef,
  children,
}: {
  id?: string;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `${id ?? title.replace(/\W+/g, "-").toLowerCase()}-body`;

  return (
    <section className="card-elevated mb-5 p-5" aria-labelledby={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="focus-ring flex min-h-11 w-full items-start justify-between gap-3 rounded-[9px] py-1 text-left"
      >
        <span>
          <h2 id={id} ref={headingRef} tabIndex={-1} className="text-lg text-plum">
            {title}
          </h2>
          <span className="block text-[13px] text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={bodyId} hidden={!open} className="mt-4">
        {children}
      </div>
    </section>
  );
}

function PresetRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <strong className="font-semibold text-foreground">{value}</strong>
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-3.5">
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function PifTable({
  payback,
  tiers,
}: {
  payback: number;
  tiers: { label: string; discount_percent: number }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[10px] uppercase text-muted-foreground">
            <th className="border-b border-border px-2.5 py-2 text-left font-normal">
              If paid within
            </th>
            <th className="border-b border-border px-2.5 py-2 text-right font-normal">
              Discount
            </th>
            <th className="border-b border-border px-2.5 py-2 text-right font-normal">
              You Save
            </th>
            <th className="border-b border-border px-2.5 py-2 text-right font-normal">
              Payoff Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, index) => {
            const outcome = pifOutcome(payback, Number(tier.discount_percent));
            return (
              <tr key={index}>
                <td className="border-b border-border px-2.5 py-2.5 text-left">
                  {tier.label}
                </td>
                <td className="border-b border-border px-2.5 py-2.5 text-right">
                  {outcome.discountPercent}%
                </td>
                <td className="border-b border-border px-2.5 py-2.5 text-right font-extrabold text-success">
                  {formatMoney(outcome.savings, 2)}
                </td>
                <td className="border-b border-border px-2.5 py-2.5 text-right">
                  {formatMoney(outcome.payoffAmount, 2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border p-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <strong className="mt-0.5 block font-semibold">{value}</strong>
    </div>
  );
}
