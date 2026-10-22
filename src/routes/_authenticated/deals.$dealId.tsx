import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  Eye,
  FileDown,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";


import { toast } from "sonner";

import { PortalGuard } from "@/components/partner/portal-guard";
import { PortalPageHeader } from "@/components/partner/page-header";
import { AppShell } from "@/components/app-shell";
import { DealProgress } from "@/components/deal-progress";
import { SendOfferDialog } from "@/components/send-offer-dialog";
import { DealTile } from "@/components/deal-tile";
import { ExpandAllButton, useExpandAll } from "@/components/expand-all-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  BANK_VERIFICATION_LABEL,
  CHECKLIST_GROUPS,
  DEFAULT_CHECKLIST,
  DEFAULT_PIF_TIERS,
  normalizeBankVerificationUrl,
} from "@/lib/deal-defaults";
import { delivery } from "@/lib/delivery-state";
import { formatPhone, formatPhoneInput, telHref } from "@/lib/phone";
import { titleCaseName } from "@/lib/text";
import { deviceLabel, formatStamp, timeAgo } from "@/lib/view-tracking";

import {
  PRESET_LABEL_DEFAULTS,
  computeStructure,
  formatMoney,
  formatRate,
  presetAmounts,
  sellRate,
  validateDeal,
  warnDeal,
  weeklySellRate,
  type DealDraft,
} from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/deals/$dealId")({
  head: () => ({
    meta: [
      { title: "Offer Builder — Magenta Portal" },
      {
        name: "description",
        content: "Build a funding offer: rates, funding range, fees, early payoff and closing checklist.",
      },
      { property: "og:title", content: "Offer Builder — Magenta Portal" },
      { property: "og:description", content: "Build a funding offer with live payment math." },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <DealBuilder />
    </PortalGuard>
  ),
});

interface BuilderState extends DealDraft {
  rep_phone: string;
  bank_verification_url: string;
  merchant_email: string;
  merchant_phone: string;
  funding_window_start: string;
  funding_window_end: string;
  presetLabels: string[];
  extraChecklist: string;
}

const emptyDraft = (): BuilderState => ({
  merchant_name: "",
  rep_name: "",
  rep_email: "",
  rep_phone: "",
  bank_verification_url: "",
  merchant_email: "",
  merchant_phone: "",
  funding_window_start: "",
  funding_window_end: "",
  expiration_date: "",
  buy_rate: 1.45,
  upsell_points: 8,
  min_funded: 25000,
  max_funded: 75000,
  term_days: 120,
  allow_weekly: true,
  weekly_rate_increase_points: 2,
  origination_fee_percent: 5,
  other_fees: 0,
  pif_enabled: true,
  pif_tiers: DEFAULT_PIF_TIERS.map((t) => ({ ...t })),
  checklist: [...DEFAULT_CHECKLIST],
  presetLabels: [...PRESET_LABEL_DEFAULTS],
  extraChecklist: "",
});

function DealBuilder() {
  const { dealId } = Route.useParams();
  const isNew = dealId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [state, setState] = useState<BuilderState>(emptyDraft);
  const [saving, setSaving] = useState(false);
  // Snapshot of the last persisted builder state, so the action bar can tell
  // the rep whether anything is actually unsaved.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const expand = useExpandAll();
  const [status, setStatus] = useState("draft");

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("rep_profiles")
        .select("id, full_name, email, phone, default_bank_verification_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: existing } = useQuery({
    enabled: !isNew,
    queryKey: ["deal", dealId],
    queryFn: async () => {
      const [deal, presets, tiers, items] = await Promise.all([
        supabase.from("deals").select("*").eq("id", dealId).single(),
        supabase.from("deal_presets").select("*").eq("deal_id", dealId).order("sort_order"),
        supabase.from("pif_tiers").select("*").eq("deal_id", dealId).order("sort_order"),
        supabase
          .from("closing_document_items")
          .select("*")
          .eq("deal_id", dealId)
          .order("sort_order"),
      ]);
      if (deal.error) throw deal.error;
      return {
        deal: deal.data,
        presets: presets.data ?? [],
        tiers: tiers.data ?? [],
        items: items.data ?? [],
      };
    },
  });

  /** Merchant activity: what they accepted, what they've asked to change, what they uploaded. */
  const { data: activity, isLoading: activityLoading } = useQuery({
    enabled: !isNew,
    queryKey: ["deal-activity", dealId],
    queryFn: async () => {
      const [acceptance, docs, revisions] = await Promise.all([
        supabase
          .from("deal_acceptances")
          .select(
            "accepted_amount, frequency, computed_payment, computed_payback, accepted_at, requested_funding_date",
          )
          .eq("deal_id", dealId)
          .maybeSingle(),
        supabase
          .from("uploaded_documents")
          .select("id, file_name, storage_path, file_size, uploaded_at")
          .eq("deal_id", dealId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("deal_revision_requests")
          .select(
            "id, requested_amount, frequency, computed_payment, note, status, created_at, requested_funding_date",
          )
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false }),
      ]);
      return {
        acceptance: acceptance.data,
        docs: docs.data ?? [],
        revisions: revisions.data ?? [],
      };
    },
  });

  /** Bank verification opens (rep-visible only, scoped by access rules). */
  const { data: bankClicks } = useQuery({
    enabled: !isNew,
    queryKey: ["deal-bank-clicks", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_bank_verification_clicks")
        .select("id, clicked_at, user_agent")
        .eq("deal_id", dealId)
        .order("clicked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Offer-open tracking: every merchant visit to the public offer link. */
  const { data: views, isLoading: viewsLoading } = useQuery({
    enabled: !isNew,
    queryKey: ["deal-views", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_views")
        .select("id, visitor_id, viewed_at, user_agent")
        .eq("deal_id", dealId)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Live: a view lands while the rep is watching the page.
  useEffect(() => {
    if (isNew) return;
    const channel = supabase
      .channel(`deal-views-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_views",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["deal-views", dealId] });
          toast.info("The Merchant Just Opened This Offer");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_bank_verification_clicks",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["deal-bank-clicks", dealId] });
          toast.info("The Merchant Started Bank Verification");
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dealId, isNew, queryClient]);

  const viewStats = useMemo(() => {
    const list = views ?? [];
    return {
      total: list.length,
      devices: new Set(list.map((v) => v.visitor_id)).size,
      first: list.length ? list[list.length - 1]!.viewed_at : null,
      last: list.length ? list[0]!.viewed_at : null,
      recent: list,
    };
  }, [views]);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [showAllOpens, setShowAllOpens] = useState(false);
  const [sendKind, setSendKind] = useState<"offer" | "reminder" | null>(null);

  /** What has already gone out to this merchant. */
  const { data: sends } = useQuery({
    enabled: !isNew,
    queryKey: ["deal-sends", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sends")
        .select("id, channel, destination, kind, status, created_at")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /** A deal created from a partner application keeps a link back to it. */
  const { data: partnerApp } = useQuery({
    enabled: !isNew,
    queryKey: ["deal-partner-application", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_applications")
        .select(
          "id, reference, legal_business_name, status, organization:partner_organizations!partner_applications_organization_id_fkey(name)",
        )
        .eq("linked_deal_id", dealId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });


  /** Private bucket: mint a short-lived signed URL per file and pull it down. */
  async function downloadDoc(doc: { id: string; file_name: string; storage_path: string }) {
    setDownloading(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("closing-documents")
        .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
      if (error || !data) throw error ?? new Error("Could not prepare that file.");
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download that file.");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAllDocs() {
    for (const doc of activity?.docs ?? []) {
      await downloadDoc(doc);
    }
  }

  useEffect(() => {

    if (isNew && profile) {
      setState((prev) => ({
        ...prev,
        rep_name: prev.rep_name || profile.full_name,
        rep_email: prev.rep_email || profile.email,
        rep_phone: prev.rep_phone || formatPhone(profile.phone),
        bank_verification_url:
          prev.bank_verification_url || (profile.default_bank_verification_url ?? ""),
      }));
    }
  }, [isNew, profile]);

  useEffect(() => {
    if (!existing) return;
    const d = existing.deal;
    setStatus(d.status);
    const loaded: BuilderState = {
      merchant_name: d.merchant_name,
      rep_name: profile?.full_name ?? "",
      rep_email: profile?.email ?? "",
      rep_phone: formatPhone(profile?.phone),
      bank_verification_url:
        d.bank_verification_url ?? profile?.default_bank_verification_url ?? "",
      merchant_email: d.merchant_email ?? "",
      merchant_phone: formatPhone(d.merchant_phone),
      funding_window_start: d.funding_window_start ?? "",
      funding_window_end: d.funding_window_end ?? "",
      expiration_date: d.expiration_date,
      buy_rate: Number(d.buy_rate),
      upsell_points: Number(d.upsell_points),
      min_funded: Number(d.min_funded),
      max_funded: Number(d.max_funded),
      term_days: d.term_days,
      allow_weekly: d.allow_weekly,
      weekly_rate_increase_points: Number(d.weekly_rate_increase_points),
      origination_fee_percent: Number(d.origination_fee_percent),
      other_fees: Number(d.other_fees),
      pif_enabled: d.pif_enabled,
      pif_tiers: existing.tiers.map((t) => ({
        label: t.label,
        discount_percent: Number(t.discount_percent),
      })),
      checklist: existing.items.map((i) => i.label),
      presetLabels: existing.presets.length
        ? existing.presets.map((p) => p.label)
        : [...PRESET_LABEL_DEFAULTS],
      extraChecklist: "",
    };
    setState(loaded);
    setSavedSnapshot(JSON.stringify(loaded));
  }, [existing, profile]);

  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const sell = sellRate(state.buy_rate, state.upsell_points);
  const weekly = weeklySellRate(sell, state.weekly_rate_increase_points);
  const amounts = useMemo(
    () => presetAmounts(state.min_funded, state.max_funded),
    [state.min_funded, state.max_funded],
  );
  const terms = {
    sell_rate: sell,
    weekly_rate_increase_points: state.weekly_rate_increase_points,
    term_days: state.term_days,
    origination_fee_percent: state.origination_fee_percent,
    other_fees: state.other_fees,
  };

  const errors = validateDeal(state);
  const bankVerificationOn = state.checklist.includes(BANK_VERIFICATION_LABEL);
  const warnings = [
    ...warnDeal(state),
    ...(bankVerificationOn && !state.bank_verification_url.trim()
      ? ["Bank verification is on the checklist but has no link — the merchant will just see a line item."]
      : []),
  ];

  function testBankLink() {
    const { url, error } = normalizeBankVerificationUrl(state.bank_verification_url);
    if (!url) {
      toast.error(error ?? "Add a bank verification link first.");
      return;
    }
    window.open(url, "_blank", "noreferrer");
  }

  /** Reps reuse one verification link across deals; this remembers it on their profile. */
  async function saveBankLinkAsDefault() {
    const { url, error } = normalizeBankVerificationUrl(state.bank_verification_url);
    if (!url) {
      toast.error(error ?? "Add a bank verification link first.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Not signed in.");
      return;
    }
    const { error: saveError } = await supabase
      .from("rep_profiles")
      .update({ default_bank_verification_url: url })
      .eq("id", userId);
    if (saveError) {
      toast.error("Could not save that as your default.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Saved as your default bank verification link.");
  }

  async function save(nextStatus: "draft" | "sent") {
    if (nextStatus === "sent" && errors.length) {
      toast.error("Fix the blocking issues before sending.");
      return;
    }
    const bankLink = normalizeBankVerificationUrl(state.bank_verification_url);
    if (bankLink.error) {
      toast.error(bankLink.error);
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in.");

      await supabase
        .from("rep_profiles")
        .upsert({
          id: userId,
          full_name: state.rep_name,
          email: state.rep_email,
          phone: formatPhone(state.rep_phone) || null,
        });

      const payload = {
        rep_id: userId,
        merchant_name: state.merchant_name,
        merchant_email: state.merchant_email.trim() || null,
        merchant_phone: formatPhone(state.merchant_phone) || null,
        funding_window_start: state.funding_window_start || null,
        funding_window_end: state.funding_window_end || null,
        expiration_date: state.expiration_date,
        buy_rate: state.buy_rate,
        upsell_points: state.upsell_points,
        min_funded: state.min_funded,
        max_funded: state.max_funded,
        term_days: state.term_days,
        allow_weekly: state.allow_weekly,
        weekly_rate_increase_points: state.weekly_rate_increase_points,
        origination_fee_percent: state.origination_fee_percent,
        other_fees: state.other_fees,
        pif_enabled: state.pif_enabled,
        status: nextStatus,
      };

      let id = dealId;
      if (isNew) {
        const { data, error } = await supabase.from("deals").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from("deals").update(payload).eq("id", dealId);
        if (error) throw error;
        await Promise.all([
          supabase.from("deal_presets").delete().eq("deal_id", dealId),
          supabase.from("pif_tiers").delete().eq("deal_id", dealId),
          supabase.from("closing_document_items").delete().eq("deal_id", dealId),
        ]);
      }

      const checklist = [
        ...state.checklist,
        ...state.extraChecklist
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      ];

      const inserts: PromiseLike<unknown>[] = [
        supabase.from("deal_presets").insert(
          amounts.map((amount, index) => ({
            deal_id: id,
            label: state.presetLabels[index] ?? PRESET_LABEL_DEFAULTS[index] ?? `Option ${index + 1}`,
            amount,
            sort_order: index,
          })),
        ),
      ];
      if (state.pif_enabled && state.pif_tiers.length) {
        inserts.push(
          supabase.from("pif_tiers").insert(
            state.pif_tiers.map((tier, index) => ({
              deal_id: id,
              label: tier.label,
              discount_percent: tier.discount_percent,
              sort_order: index,
            })),
          ),
        );
      }
      if (checklist.length) {
        inserts.push(
          supabase.from("closing_document_items").insert(
            checklist.map((label, index) => ({ deal_id: id, label, sort_order: index })),
          ),
        );
      }
      await Promise.all(inserts);


      setStatus(nextStatus);
      setSavedSnapshot(JSON.stringify(state));
      toast.success(nextStatus === "sent" ? "Offer ready to send." : "Draft saved.");
      navigate({ to: "/deals/$dealId", params: { dealId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the offer.");
    } finally {
      setSaving(false);
    }
  }

  // One derived delivery state, identical to the one the deals list shows.
  const deliveryState = delivery(
    {
      status,
      sentAt: sends?.[0]?.created_at ?? null,
      firstViewedAt: viewStats.first ?? null,
      acceptedAt: activity?.acceptance?.accepted_at ?? null,
      revisionRequested: (activity?.revisions ?? []).some((r) => r.status === "open"),
      docsReceived: (activity?.docs.length ?? 0) > 0,
    },
    timeAgo,
  );

  const dirty = isNew || savedSnapshot === null || JSON.stringify(state) !== savedSnapshot;

  return (
    <AppShell>
      <PortalPageHeader
        title={isNew ? "New Offer" : titleCaseName(state.merchant_name || "Offer")}
        back={
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded font-semibold hover:text-foreground md:min-h-9"
            >
              <ChevronLeft className="size-4" aria-hidden /> Offers
            </Link>
            <span className="mx-1.5" aria-hidden>
              /
            </span>
            <span className="text-foreground">
              {isNew ? "New Offer" : titleCaseName(state.merchant_name || "Offer")}
            </span>
          </nav>
        }
        subtitle={
          <>
            <p>
              {isNew
                ? "Presets are always derived from your funding range."
                : `${deliveryState.line} · Presets are always derived from your funding range.`}
            </p>
            {!isNew ? (
              <DealProgress
                className="mt-3 max-w-md"
                sent={(sends?.length ?? 0) > 0}
                viewed={viewStats.total > 0}
                accepted={!!activity?.acceptance}
                docsReceived={(activity?.docs.length ?? 0) > 0}
                revisionRequested={(activity?.revisions ?? []).some((r) => r.status === "open")}
              />
            ) : null}
          </>
        }
        actions={
          /* One action group: save, preview, send. Marking an offer sent by hand
             now lives in the Send Offer dialog, so every "Sent" has a record. */
          <>
            <ExpandAllButton allOpen={expand.allOpen} onToggle={expand.toggle} />
            <Button variant="outline" disabled={saving || !dirty} onClick={() => save("draft")}>
              {saving ? "Saving…" : isNew ? "Save Offer" : dirty ? "Save Changes" : "Saved"}
            </Button>
            {!isNew ? (
              <>
                <Button asChild variant="secondary">
                  <a href={`/offer/${dealId}`} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                </Button>
                <Button disabled={errors.length > 0} onClick={() => setSendKind("offer")}>
                  <Send className="size-4" />{" "}
                  {(sends?.length ?? 0) > 0 ? "Resend Offer" : "Send Offer"}
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {partnerApp ? (
        <div className="bg-brand-wash mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <span className="text-muted-foreground">
            From partner application <span className="font-mono">{partnerApp.reference}</span>
            {partnerApp.organization?.name ? ` · ${partnerApp.organization.name}` : ""}
          </span>
          <Link
            to="/partners/applications/$applicationId"
            params={{ applicationId: partnerApp.id }}
            className="focus-ring font-medium underline underline-offset-2"
          >
            Open Application
          </Link>
        </div>
      ) : null}




      {errors.length ? (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-4" /> Fix before sending
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length ? (
        <div className="mt-4 rounded-xl border border-gold/50 bg-internal p-4">
          <p className="text-sm font-semibold text-internal-foreground">Worth a second look</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-internal-foreground">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isNew ? (
        <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
          id="offer-delivery"
          className="mt-6"
          title={
            <span className="flex items-center gap-2">
              <Send className="size-5 text-primary" aria-hidden /> Offer Delivery
            </span>
          }
          summary={
            (sends?.length ?? 0) > 0
              ? `${sends!.length} send${sends!.length === 1 ? "" : "s"}`
              : "Not sent yet"
          }
          defaultOpen={(sends?.length ?? 0) > 0}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSendKind("offer")}>
              <Send className="size-4" aria-hidden />{" "}
              {(sends?.length ?? 0) > 0 ? "Send Again" : "Send Offer"}
            </Button>
            {(sends?.length ?? 0) > 0 && !activity?.acceptance ? (
              <Button variant="outline" size="sm" onClick={() => setSendKind("reminder")}>
                Send Reminder
              </Button>
            ) : null}
          </div>
          {(sends?.length ?? 0) > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {sends!.map((send) => (
                <li
                  key={send.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="font-semibold capitalize">
                    {send.kind === "reminder" ? "Reminder" : "Offer"} ·{" "}
                    {send.channel === "sms" ? "Text" : send.channel}
                    {send.destination ? (
                      <span className="font-normal text-muted-foreground"> to {send.destination}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {formatStamp(send.created_at)} · {timeAgo(send.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              This offer hasn't been sent yet. Use Send Offer for the link, a QR code, or
              ready-made email and text copy.
            </p>
          )}
        </DealTile>
      ) : null}

      {sendKind ? (
        <SendOfferDialog
          kind={sendKind}
          deal={{
            id: dealId,
            merchant_name: state.merchant_name,
            merchant_email: state.merchant_email,
            merchant_phone: state.merchant_phone,
            expiration_date: state.expiration_date,
            rep_name: state.rep_name,
            rep_email: state.rep_email,
            rep_phone: state.rep_phone,
          }}
          onOpenChange={(open) => {
            if (!open) setSendKind(null);
          }}
          onSent={() => {
            void queryClient.invalidateQueries({ queryKey: ["deal-sends", dealId] });
          }}
        />
      ) : null}

      {!isNew ? (
        <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
          id="merchant-activity"
          className="mt-6"
          title={
            <span className="flex items-center gap-2">
              <Eye className="size-5 text-primary" aria-hidden /> Merchant Activity
            </span>
          }
          summary={
            viewStats.total > 0
              ? `${viewStats.total} view${viewStats.total === 1 ? "" : "s"} · Last viewed ${timeAgo(viewStats.last)}`
              : "Not viewed yet"
          }
          defaultOpen={viewStats.total > 0}
        >
          {viewsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg border border-border bg-secondary"
                />
              ))}
            </div>
          ) : viewStats.total > 0 ? (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Total Views", value: String(viewStats.total) },
                  { label: "Unique Devices", value: String(viewStats.devices) },
                  {
                    label: "First Viewed",
                    value: viewStats.first ? formatStamp(viewStats.first) : "—",
                  },
                  {
                    label: "Last Viewed",
                    value: viewStats.last ? formatStamp(viewStats.last) : "—",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-secondary p-3">
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-muted-foreground">Recent Opens</h3>
              <ul className="mt-2 divide-y divide-border">
                {(showAllOpens ? viewStats.recent : viewStats.recent.slice(0, 5)).map((view) => (
                  <li
                    key={view.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatStamp(view.viewed_at)}
                    </span>
                    <span className="text-muted-foreground">
                      {deviceLabel(view.user_agent)} · {timeAgo(view.viewed_at)}
                    </span>
                  </li>
                ))}
              </ul>
              {viewStats.recent.length > 5 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAllOpens((v) => !v)}
                >
                  {showAllOpens
                    ? "Show Fewer"
                    : `Show All ${viewStats.recent.length} Opens`}
                </Button>
              ) : null}

            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              The merchant hasn't opened this offer link yet. Views appear here the moment they
              do.
            </p>
          )}

          {existing?.deal.bank_verification_url ? (
            <div className="mt-5 rounded-lg border border-primary/30 bg-selected p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-plum">
                <ShieldCheck className="size-4" aria-hidden /> Bank Verification
              </p>
              <p className="mt-1 text-sm text-foreground" aria-live="polite">
                {(bankClicks?.length ?? 0) > 0
                  ? `Opened ${bankClicks!.length} time${bankClicks!.length === 1 ? "" : "s"} · First ${formatStamp(bankClicks![bankClicks!.length - 1]!.clicked_at)} · Last ${formatStamp(bankClicks![0]!.clicked_at)}`
                  : "The merchant hasn't opened the verification link yet."}
              </p>
              {(bankClicks?.length ?? 0) > 0 ? (
                <ul className="mt-2 divide-y divide-border">
                  {bankClicks!.slice(0, 5).map((click) => (
                    <li
                      key={click.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="font-semibold text-foreground">
                        {formatStamp(click.clicked_at)}
                      </span>
                      <span className="text-muted-foreground">
                        {deviceLabel(click.user_agent)} · {timeAgo(click.clicked_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </DealTile>
      ) : null}


      {!isNew ? (
        <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
          id="merchant-uploads"
          className="mt-6"
          title="Merchant Uploads"
          summary={
            (activity?.docs.length ?? 0) > 0
              ? `${activity!.docs.length} file${activity!.docs.length === 1 ? "" : "s"}`
              : "No uploads yet"
          }
          defaultOpen={(activity?.docs.length ?? 0) > 0}
        >
          {(activity?.docs.length ?? 0) > 0 ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => void downloadAllDocs()}>
                <FileDown className="size-4" aria-hidden /> Download All
              </Button>
            </div>
          ) : null}
          {activityLoading ? (
            <ul className="mt-3 divide-y divide-border" aria-hidden>
              {[0, 1].map((i) => (
                <li key={i} className="py-3">
                  <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                  <div className="mt-2 h-3 w-28 animate-pulse rounded bg-secondary" />
                </li>
              ))}
            </ul>
          ) : (activity?.docs.length ?? 0) > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {activity!.docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.file_size
                        ? `${Math.max(1, Math.round(Number(doc.file_size) / 1024))} KB · `
                        : ""}
                      {formatStamp(doc.uploaded_at)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={downloading === doc.id}
                    onClick={() => void downloadDoc(doc)}
                  >
                    <FileDown className="size-4" aria-hidden />{" "}
                    {downloading === doc.id ? "Preparing…" : "Download"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No client uploads yet. Files the merchant sends from their offer link show up here,
              ready to download.
            </p>
          )}
        </DealTile>
      ) : null}

      {activity?.acceptance ? (
        <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
          className="mt-6 card-accepted"
          title="Offer Accepted"
          summary={`${formatMoney(Number(activity.acceptance.accepted_amount))} funded · ${activity.acceptance.frequency} payment ${formatMoney(Number(activity.acceptance.computed_payment), 2)}`}
          defaultOpen={true}
        >
          <p className="text-sm font-semibold text-plum">
            {formatMoney(Number(activity.acceptance.accepted_amount))} funded ·{" "}
            {activity.acceptance.frequency} payment{" "}
            {formatMoney(Number(activity.acceptance.computed_payment), 2)} · total payback{" "}
            {formatMoney(Number(activity.acceptance.computed_payback), 2)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepted {formatStamp(activity.acceptance.accepted_at)}
            {activity.acceptance.requested_funding_date
              ? ` · Requested funding ${new Date(`${activity.acceptance.requested_funding_date}T00:00:00`).toLocaleDateString()}`
              : ""}
          </p>
        </DealTile>
      ) : null}

      {activity?.revisions.some((r) => r.status === "open") ? (
        <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
          className="mt-4 card-revision"
          title="Revision Requested"
          summary={`${activity.revisions.filter((r) => r.status === "open").length} open request${activity.revisions.filter((r) => r.status === "open").length === 1 ? "" : "s"}`}
          defaultOpen={true}
        >
          <ul className="space-y-2 text-sm text-internal-foreground">
            {activity.revisions
              .filter((r) => r.status === "open")
              .map((r) => (
                <li key={r.id}>
                  <span className="font-semibold">
                    {formatMoney(Number(r.requested_amount))} · {r.frequency} payment{" "}
                    {formatMoney(Number(r.computed_payment), 2)}
                  </span>
                  {r.requested_funding_date ? (
                    <> · funding {new Date(`${r.requested_funding_date}T00:00:00`).toLocaleDateString()}</>
                  ) : null}
                  {r.note ? <> — “{r.note}”</> : null}
                  <span className="ml-2 text-xs opacity-80">
                    {formatStamp(r.created_at)}
                  </span>
                </li>
              ))}
          </ul>
        </DealTile>
      ) : null}




      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title="Merchant & Rep"
            summary={
              state.merchant_name
                ? `${titleCaseName(state.merchant_name)} · Rep: ${state.rep_name || "—"}`
                : "Enter the merchant and rep details"
            }
            className="p-6"
            defaultOpen={isNew}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Merchant Name">
                <Input
                  value={state.merchant_name}
                  onChange={(e) => set("merchant_name", e.target.value)}
                />
              </Field>
              <Field label="Offer Expires">
                <Input
                  type="date"
                  value={state.expiration_date}
                  onChange={(e) => set("expiration_date", e.target.value)}
                />
              </Field>
              <Field label="Merchant Email">
                <Input
                  type="email"
                  placeholder="owner@business.com"
                  value={state.merchant_email}
                  onChange={(e) => set("merchant_email", e.target.value)}
                />
              </Field>
              <Field label="Merchant Phone">
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(555) 555-0199"
                  value={state.merchant_phone}
                  onChange={(e) => set("merchant_phone", formatPhoneInput(e.target.value))}
                />
              </Field>
              <Field label="Funding Window Opens">
                <Input
                  type="date"
                  value={state.funding_window_start}
                  onChange={(e) => set("funding_window_start", e.target.value)}
                />
              </Field>
              <Field label="Funding Window Closes">
                <Input
                  type="date"
                  value={state.funding_window_end}
                  onChange={(e) => set("funding_window_end", e.target.value)}
                />
              </Field>
              <Field label="Rep Name">
                <Input value={state.rep_name} onChange={(e) => set("rep_name", e.target.value)} />
              </Field>
              <Field label="Rep Email">
                <Input
                  type="email"
                  value={state.rep_email}
                  onChange={(e) => set("rep_email", e.target.value)}
                />
              </Field>
              <Field label="Rep Phone (Shown to the Merchant)">
                <Input
                  type="tel"
                  placeholder="(555) 555-0100"
                  inputMode="tel"
                  aria-describedby="rep-phone-hint"
                  value={state.rep_phone}
                  onChange={(e) => set("rep_phone", formatPhoneInput(e.target.value))}
                />
                <p id="rep-phone-hint" className="mt-1 text-xs text-muted-foreground">
                  {telHref(state.rep_phone)
                    ? "The merchant sees this as a tap-to-call link."
                    : "Optional — leave blank and the merchant page asks them to email you instead."}
                </p>
              </Field>

            </div>
          </DealTile>

          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title={
              <span className="flex items-center gap-2">
                Pricing
                <span className="rounded-full bg-internal px-3 py-1 text-xs font-semibold uppercase tracking-wide text-internal-foreground">
                  Internal only
                </span>
              </span>
            }
            summary={`Buy ${formatRate(state.buy_rate)} · Upsell ${state.upsell_points} pts · Sell ${formatRate(sell)}`}
            className="p-6"
            defaultOpen={false}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Buy Rate">
                <Input
                  type="number"
                  step="0.01"
                  value={state.buy_rate}
                  onChange={(e) => set("buy_rate", Number(e.target.value))}
                />
              </Field>
              <Field label="Upsell (Points)">
                <Input
                  type="number"
                  step="1"
                  value={state.upsell_points}
                  onChange={(e) => set("upsell_points", Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="mt-4 rounded-lg bg-internal p-4 text-sm text-internal-foreground">
              <p>
                Sell rate <strong>{formatRate(sell)}</strong>
                {state.allow_weekly ? (
                  <>
                    {" · "}Weekly sell rate <strong>{formatRate(weekly)}</strong>
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-xs">
                Clients only ever see the sell rate's effect on payments — never the buy
                rate or upsell.
              </p>
            </div>
          </DealTile>

          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title="Structure"
            summary={`${formatMoney(state.min_funded)} – ${formatMoney(state.max_funded)} · ${state.term_days} business days · ${amounts.length} presets`}
            className="p-6"
            defaultOpen={false}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum Funded">
                <Input
                  type="number"
                  value={state.min_funded}
                  onChange={(e) => set("min_funded", Number(e.target.value))}
                />
              </Field>
              <Field label="Maximum Funded">
                <Input
                  type="number"
                  value={state.max_funded}
                  onChange={(e) => set("max_funded", Number(e.target.value))}
                />
              </Field>
              <Field label="Term (Business Days)">
                <Input
                  type="number"
                  value={state.term_days}
                  onChange={(e) => set("term_days", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-medium">Preset labels (amounts are derived)</p>
              {amounts.map((amount, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3">
                  <Input
                    className="max-w-xs"
                    value={state.presetLabels[index] ?? ""}
                    onChange={(e) => {
                      const labels = [...state.presetLabels];
                      labels[index] = e.target.value;
                      set("presetLabels", labels);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(amount)} · {formatMoney(computeStructure(terms, amount, "daily").payment, 2)}/day
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Allow weekly payments</p>
                <p className="text-xs text-muted-foreground">
                  Adds the weekly rate increase and hides nothing else.
                </p>
              </div>
              <Switch
                checked={state.allow_weekly}
                onCheckedChange={(v) => set("allow_weekly", v)}
              />
            </div>
            {state.allow_weekly ? (
              <div className="mt-4 max-w-xs">
                <Field label="Weekly Rate Increase (Points)">
                  <Input
                    type="number"
                    step="0.5"
                    value={state.weekly_rate_increase_points}
                    onChange={(e) =>
                      set("weekly_rate_increase_points", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
            ) : null}
          </DealTile>

          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title="Fees"
            summary={`${state.origination_fee_percent}% origination${state.other_fees > 0 ? ` · ${formatMoney(state.other_fees)} other` : ""}`}
            className="p-6"
            defaultOpen={false}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Origination Fee (%)">
                <Input
                  type="number"
                  step="0.25"
                  value={state.origination_fee_percent}
                  onChange={(e) => set("origination_fee_percent", Number(e.target.value))}
                />
              </Field>
              <Field label="Other Fees (Flat $)">
                <Input
                  type="number"
                  step="1"
                  value={state.other_fees}
                  onChange={(e) => set("other_fees", Number(e.target.value))}
                />
              </Field>
            </div>
          </DealTile>

          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title="Early Payoff Discount"
            summary={
              state.pif_enabled
                ? `${state.pif_tiers.length} tier${state.pif_tiers.length === 1 ? "" : "s"}`
                : "Off"
            }
            className="p-6"
            defaultOpen={false}
          >
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Allow early payoff discounts</p>
                <p className="text-xs text-muted-foreground">
                  Percentage of payback. Never shown as a factor rate.
                </p>
              </div>
              <Switch
                checked={state.pif_enabled}
                onCheckedChange={(v) => set("pif_enabled", v)}
              />
            </div>
            {state.pif_enabled ? (
              <div className="mt-4 space-y-3">
                {state.pif_tiers.map((tier, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-3">
                    <Input
                      className="max-w-xs"
                      value={tier.label}
                      onChange={(e) => {
                        const tiers = [...state.pif_tiers];
                        tiers[index] = { ...tier, label: e.target.value };
                        set("pif_tiers", tiers);
                      }}
                    />
                    <Input
                      type="number"
                      className="max-w-24"
                      value={tier.discount_percent}
                      onChange={(e) => {
                        const tiers = [...state.pif_tiers];
                        tiers[index] = { ...tier, discount_percent: Number(e.target.value) };
                        set("pif_tiers", tiers);
                      }}
                    />
                    <span className="text-sm text-muted-foreground">% off payback</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        set(
                          "pif_tiers",
                          state.pif_tiers.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {state.pif_tiers.length < 3 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      set("pif_tiers", [
                        ...state.pif_tiers,
                        { label: "Within 90 days", discount_percent: 5 },
                      ])
                    }
                  >
                    Add tier
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DealTile>

          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            id="closing-checklist"
            title="Closing Checklist"
            summary={`${state.checklist.length} of ${CHECKLIST_GROUPS.reduce((n, g) => n + g.items.length, 0)} checked${bankVerificationOn ? " · Bank verification required" : ""}`}
            className="scroll-mt-24 p-6"
            defaultOpen={false}
          >
            <div className="space-y-5">
              {CHECKLIST_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.group}
                  </p>
                  <div className="mt-2 space-y-2">
                    {group.items.map((item) => {
                      const checked = state.checklist.includes(item.label);
                      return (
                        <label key={item.label} className="flex items-start gap-3 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              set(
                                "checklist",
                                v
                                  ? [...state.checklist, item.label]
                                  : state.checklist.filter((l) => l !== item.label),
                              )
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                    {group.items.some((i) => i.label === BANK_VERIFICATION_LABEL) &&
                    bankVerificationOn ? (
                      <div className="ml-7 rounded-lg border border-primary/30 bg-selected p-3">
                        <Label htmlFor="bank-verification-url" className="text-xs font-semibold uppercase tracking-wide text-plum">
                          Bank Verification Link
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Paste your Plaid, Decision Logic or other secure link. Replace it any
                          time — the merchant page always uses the latest one.
                        </p>
                        <Input
                          id="bank-verification-url"
                          type="url"
                          inputMode="url"
                          placeholder="https://verify.example.com/..."
                          className="mt-2 min-h-11"
                          value={state.bank_verification_url}
                          onChange={(e) => set("bank_verification_url", e.target.value)}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 md:min-h-9"
                            onClick={testBankLink}
                          >
                            <ExternalLink className="size-4" /> Test Link
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="min-h-11 md:min-h-9"
                            onClick={() => void saveBankLinkAsDefault()}
                          >
                            Save As My Default
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              <Field label="Deal-Specific Additions (One Per Line)">
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                  value={state.extraChecklist}
                  onChange={(e) => set("extraChecklist", e.target.value)}
                />
              </Field>
            </div>
          </DealTile>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <DealTile
          openSignal={expand.signal}
          openSignalValue={expand.value}
            title="Client Preview Math"
            summary={`${amounts.length} preset${amounts.length === 1 ? "" : "s"} · ${state.allow_weekly ? "daily + weekly" : "daily only"}`}
            className="p-6"
            defaultOpen={true}
          >
            <div className="space-y-4">
              {amounts.map((amount, index) => {
                const daily = computeStructure(terms, amount, "daily");
                const weeklyStructure = computeStructure(terms, amount, "weekly");
                return (
                  <div key={index} className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold">
                      {state.presetLabels[index] ?? PRESET_LABEL_DEFAULTS[index]}
                    </p>
                    <p className="text-2xl">{formatMoney(amount)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(daily.payment, 2)} × {daily.payments} daily payments
                    </p>
                    {state.allow_weekly ? (
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(weeklyStructure.payment, 2)} ×{" "}
                        {weeklyStructure.payments} weekly payments
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Payback {formatMoney(daily.payback)} · fees{" "}
                      {formatMoney(daily.totalFees)} · net {formatMoney(daily.netFunded)}
                    </p>
                  </div>
                );
              })}
            </div>
          </DealTile>
        </aside>
      </div>

      {/* Sticky save bar: only appears when there is something to save. */}
      {dirty ? (
        <div className="pointer-events-none sticky bottom-4 z-40 mt-8 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Unsaved Changes
            </span>
            <Button size="sm" disabled={saving} onClick={() => save("draft")}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
