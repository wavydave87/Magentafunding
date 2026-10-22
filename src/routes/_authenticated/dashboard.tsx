import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Copy,
  Download,
  BellRing,
  Eye,
  ChevronDown,
  SlidersHorizontal,
  Search,
  Send,
  X,
  CalendarClock,
  Check,
  Bookmark,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";


import { PortalGuard } from "@/components/partner/portal-guard";
import { AppShell } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { SendOfferDialog, type SendOfferDeal } from "@/components/send-offer-dialog";
import { DealProgress } from "@/components/deal-progress";
import { DealStatusIcons } from "@/components/deal-status-icons";
import { DealTile } from "@/components/deal-tile";
import { FollowUpDialog, SaveViewDialog } from "@/components/sales-workspace-dialogs";
import { ExpandAllButton, useExpandAll } from "@/components/expand-all-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { csvStamp, downloadCsv, toCsv } from "@/lib/csv";
import { delivery } from "@/lib/delivery-state";
import { formatMoney } from "@/lib/pricing";
import { titleCase, titleCaseName } from "@/lib/text";
import { timeAgo } from "@/lib/view-tracking";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Offers — Magenta Portal" },
      { name: "description", content: "Every offer you've built, with its status and link." },
      { property: "og:title", content: "Offers — Magenta Portal" },
      { property: "og:description", content: "Every offer you've built, with its status and link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <Dashboard />
    </PortalGuard>
  ),
});

type Sort = "newest" | "oldest" | "amount" | "merchant" | "expiring" | "viewed" | "uploads" | "stage";
type CountFilter = "all" | "none" | "some";
type ExpiryFilter = "all" | "expired" | "three" | "seven" | "later";
type QuickFilter = "accepted_docs" | "change" | "expiring" | "follow_up" | "not_sent" | "viewed_not_accepted";

interface ViewPreferences {
  sort: Sort;
  stageFilters: string[];
  minAmount: string;
  maxAmount: string;
  viewsFilter: CountFilter;
  uploadsFilter: CountFilter;
  expiryFilter: ExpiryFilter;
  quickFilter: QuickFilter | "all";
}

interface SavedView { id: string; name: string; preferences: ViewPreferences }

const DASHBOARD_PREFS_KEY = "magenta-sales-workspace";

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: "follow_up", label: "Needs Follow-Up" },
  { key: "not_sent", label: "Not Sent" },
  { key: "viewed_not_accepted", label: "Viewed, Not Accepted" },
  { key: "accepted_docs", label: "Accepted, Docs Missing" },
  { key: "change", label: "Change Requested" },
  { key: "expiring", label: "Expiring Soon" },
];

/** Whole days until an offer expires (negative once past). */
function daysUntil(date: string): number {
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000);
}

function priorityReason({
  accepted,
  revision,
  views,
  sent,
  docCount,
  left,
}: {
  accepted: unknown;
  revision: unknown;
  views: { views: number; last: string | null } | null;
  sent: { last: string } | null;
  docCount: number;
  left: number;
}) {
  if (revision) return "Change Requested · Review Requested Terms";
  if (accepted && docCount === 0) return "Accepted · Documents Missing";
  if (!sent) return "Not Sent Yet · Send Offer";
  if ((views?.views ?? 0) > 0 && !accepted) return `Viewed ${views?.last ? timeAgo(views.last) : "Recently"} · Not Accepted`;
  if (!accepted && left < 0) return "Expired · Follow Up Or Refresh Offer";
  if (!accepted && left <= 3) return `${left === 0 ? "Expires Today" : `Expires In ${left} Days`} · Follow Up`;
  if (accepted) return "Accepted · Continue Closing Items";
  return `Sent ${timeAgo(sent.last)} · Awaiting Merchant Action`;
}

function quickFilterMatches(
  quickFilter: QuickFilter | "all",
  row: {
    accepted: unknown;
    revision: unknown;
    views: { views: number } | null;
    sent: { count: number; last: string } | null;
    docCount: number;
    deal: { expiration_date: string };
  },
) {
  if (quickFilter === "all") return true;
  const left = daysUntil(row.deal.expiration_date);
  if (quickFilter === "not_sent") return !row.sent;
  if (quickFilter === "viewed_not_accepted") return (row.views?.views ?? 0) > 0 && !row.accepted;
  if (quickFilter === "accepted_docs") return Boolean(row.accepted) && row.docCount === 0;
  if (quickFilter === "change") return Boolean(row.revision);
  if (quickFilter === "expiring") return !row.accepted && left >= 0 && left <= 3;
  return Boolean(row.revision) || !row.sent || ((row.views?.views ?? 0) > 0 && !row.accepted) || (Boolean(row.accepted) && row.docCount === 0) || (!row.accepted && left <= 3);
}

function focusOfferDetail(dealId: string, target: "accepted" | "bank" | "docs" | "expiry" | "revision" | "sent" | "views") {
  const suffix = target === "accepted" || target === "revision" ? target : target === "expiry" ? "summary" : "activity";
  window.setTimeout(() => {
    const node = document.getElementById(`offer-${dealId}-${suffix}`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (node instanceof HTMLElement) node.focus({ preventScroll: true });
  }, 0);
}



function Dashboard() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [viewsFilter, setViewsFilter] = useState<CountFilter>("all");
  const [uploadsFilter, setUploadsFilter] = useState<CountFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter | "all">("all");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const queryClient = useQueryClient();
  const [sendDeal, setSendDeal] = useState<SendOfferDeal | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [followUpDeal, setFollowUpDeal] = useState<{ id: string; name: string } | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const expandAll = useExpandAll();

  useEffect(() => {
    const saved = window.localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (saved) {
      try {
        const prefs = JSON.parse(saved) as {
          sort?: Sort;
          stageFilters?: string[];
          minAmount?: string;
          maxAmount?: string;
          viewsFilter?: CountFilter;
          uploadsFilter?: CountFilter;
          expiryFilter?: ExpiryFilter;
          quickFilter?: QuickFilter | "all";
          savedViews?: SavedView[];
        };
        if (prefs.sort) setSort(prefs.sort);
        if (prefs.stageFilters) setStageFilters(prefs.stageFilters);
        if (prefs.minAmount) setMinAmount(prefs.minAmount);
        if (prefs.maxAmount) setMaxAmount(prefs.maxAmount);
        if (prefs.viewsFilter) setViewsFilter(prefs.viewsFilter);
        if (prefs.uploadsFilter) setUploadsFilter(prefs.uploadsFilter);
        if (prefs.expiryFilter) setExpiryFilter(prefs.expiryFilter);
        if (prefs.quickFilter) setQuickFilter(prefs.quickFilter);
        if (Array.isArray(prefs.savedViews)) setSavedViews(prefs.savedViews);
      } catch {
        window.localStorage.removeItem(DASHBOARD_PREFS_KEY);
      }
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(
      DASHBOARD_PREFS_KEY,
      JSON.stringify({ sort, stageFilters, minAmount, maxAmount, viewsFilter, uploadsFilter, expiryFilter, quickFilter, savedViews }),
    );
  }, [preferencesLoaded, sort, stageFilters, minAmount, maxAmount, viewsFilter, uploadsFilter, expiryFilter, quickFilter, savedViews]);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, merchant_name, merchant_email, merchant_phone, status, expiration_date, buy_rate, upsell_points, sell_rate, min_funded, max_funded, term_days, created_at, bank_verification_url",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: acceptances } = useQuery({
    queryKey: ["acceptances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_acceptances")
        .select(
          "deal_id, accepted_amount, frequency, computed_payment, computed_payback, accepted_at, requested_funding_date",
        );
      if (error) throw error;
      return data;
    },
  });

  const { data: revisions } = useQuery({
    queryKey: ["revision-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_revision_requests")
        .select("deal_id, requested_amount, frequency, computed_payment, note, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // What has been sent per deal, so the list can show Not Sent / Sent at a glance.
  const { data: sendStats } = useQuery({
    queryKey: ["deal-send-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sends")
        .select("deal_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, { count: number; last: string }> = {};
      for (const row of data ?? []) {
        const current = map[row.deal_id];
        if (current) current.count += 1;
        else map[row.deal_id] = { count: 1, last: row.created_at };
      }
      return map;
    },
  });

  // Per-deal client upload counts so the list can point reps straight at the files.
  const { data: docCounts } = useQuery({
    queryKey: ["deal-doc-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("uploaded_documents").select("deal_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.deal_id] = (counts[row.deal_id] ?? 0) + 1;
      return counts;
    },
  });

  // Offer-open tracking per deal (rep-visible only, scoped by access rules).
  const { data: viewStats } = useQuery({
    queryKey: ["deal-view-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_view_stats")
        .select("deal_id, view_count, unique_visitors, first_viewed_at, last_viewed_at");
      if (error) throw error;
      const map: Record<
        string,
        { views: number; devices: number; first: string | null; last: string | null }
      > = {};
      for (const row of data ?? []) {
        if (!row.deal_id) continue;
        map[row.deal_id] = {
          views: Number(row.view_count ?? 0),
          devices: Number(row.unique_visitors ?? 0),
          first: row.first_viewed_at,
          last: row.last_viewed_at,
        };
      }
      return map;
    },
  });




  // Bank verification opens per deal (rep-visible only, scoped by access rules).
  const { data: bankStats } = useQuery({
    queryKey: ["deal-bank-click-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_bank_verification_clicks")
        .select("deal_id, clicked_at")
        .order("clicked_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, { count: number; last: string }> = {};
      for (const row of data ?? []) {
        const current = map[row.deal_id];
        if (current) current.count += 1;
        else map[row.deal_id] = { count: 1, last: row.clicked_at };
      }
      return map;
    },
  });

  const { data: followUps } = useQuery({
    queryKey: ["deal-follow-ups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_follow_ups")
        .select("id, deal_id, due_at, note, completed_at")
        .order("due_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Live alert when a merchant submits a revision request. RLS scopes the
  // rows the rep can read, so a rep only ever hears about their own deals.
  useEffect(() => {
    const channel = supabase
      .channel("revision-requests-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deal_revision_requests" },
        (payload) => {
          const dealId = (payload.new as { deal_id?: string }).deal_id;
          const name =
            deals?.find((d) => d.id === dealId)?.merchant_name ?? "A merchant";
          toast.info(`${name} Requested a Change`, {
            description: "Open the offer to review the requested structure.",
          });
          void queryClient.invalidateQueries({ queryKey: ["revision-requests"] });
          void queryClient.invalidateQueries({ queryKey: ["deals"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [deals, queryClient]);


  // Every deal decorated with its single derived delivery state, so the badge,
  // the activity line and the progress bar can never disagree.
  const decorated = useMemo(() => {
    return (deals ?? []).map((deal) => {
      const accepted = acceptances?.find((a) => a.deal_id === deal.id) ?? null;
      const revision =
        revisions?.find((r) => r.deal_id === deal.id && r.status === "open") ?? null;
      const views = viewStats?.[deal.id] ?? null;
      const sent = sendStats?.[deal.id] ?? null;
      const docCount = docCounts?.[deal.id] ?? 0;
      const bank = bankStats?.[deal.id] ?? null;
      const state = delivery(
        {
          status: deal.status,
          sentAt: sent?.last ?? null,
          firstViewedAt: views?.first ?? null,
          acceptedAt: accepted?.accepted_at ?? null,
          revisionRequested: !!revision,
          docsReceived: docCount > 0,
        },
        timeAgo,
      );
      const followUp = followUps?.find((item) => item.deal_id === deal.id && !item.completed_at) ?? null;
      return { deal, accepted, revision, views, sent, docCount, bank, state, followUp };
    });
  }, [deals, acceptances, revisions, viewStats, sendStats, docCounts, bankStats, followUps]);

  const stageOptions = useMemo(
    () => Array.from(new Set(decorated.map(({ state }) => state.label))).sort(),
    [decorated],
  );

  const stageCounts = useMemo(() => stageOptions.map((stage) => ({
    stage,
    count: decorated.filter((row) => row.state.label === stage).length,
  })), [decorated, stageOptions]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/\s+/g, " ");
    const filtered = decorated.filter((row) => {
      const { deal, accepted, views, docCount, state } = row;
      const searchable = `${deal.merchant_name} ${deal.merchant_email ?? ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (needle && !searchable.includes(needle)) return false;
      if (stageFilters.length > 0 && !stageFilters.includes(state.label)) return false;
      if (!quickFilterMatches(quickFilter, row)) return false;

      const amount = Number(accepted?.accepted_amount ?? deal.max_funded);
      if (minAmount && amount < Number(minAmount)) return false;
      if (maxAmount && amount > Number(maxAmount)) return false;
      if (viewsFilter === "none" && (views?.views ?? 0) !== 0) return false;
      if (viewsFilter === "some" && (views?.views ?? 0) === 0) return false;
      if (uploadsFilter === "none" && docCount !== 0) return false;
      if (uploadsFilter === "some" && docCount === 0) return false;

      const left = daysUntil(deal.expiration_date);
      if (expiryFilter === "expired" && left >= 0) return false;
      if (expiryFilter === "three" && (left < 0 || left > 3)) return false;
      if (expiryFilter === "seven" && (left < 0 || left > 7)) return false;
      if (expiryFilter === "later" && left <= 7) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest": return a.deal.created_at.localeCompare(b.deal.created_at);
        case "amount": return Number(b.accepted?.accepted_amount ?? b.deal.max_funded) - Number(a.accepted?.accepted_amount ?? a.deal.max_funded);
        case "merchant": return a.deal.merchant_name.localeCompare(b.deal.merchant_name);
        case "expiring": return a.deal.expiration_date.localeCompare(b.deal.expiration_date);
        case "viewed": return new Date(b.views?.last ?? 0).getTime() - new Date(a.views?.last ?? 0).getTime();
        case "uploads": return b.docCount - a.docCount;
        case "stage": return a.state.label.localeCompare(b.state.label);
        default: return b.deal.created_at.localeCompare(a.deal.created_at);
      }
    });
  }, [decorated, query, stageFilters, quickFilter, minAmount, maxAmount, viewsFilter, uploadsFilter, expiryFilter, sort]);


  // Portfolio summary reads the whole book, not the filtered view, so the
  // figures stay stable while a rep moves between filters.
  const summary = useMemo(() => {
    const accepted = decorated.filter((r) => r.accepted);
    return {
      total: decorated.length,
      accepted: accepted.length,
      volume: accepted.reduce((sum, r) => sum + Number(r.accepted?.accepted_amount ?? 0), 0),
      awaitingDocs: accepted.filter((r) => r.docCount === 0).length,
      expiring: decorated.filter(
        (r) => !r.accepted && daysUntil(r.deal.expiration_date) <= 3,
      ).length,
    };
  }, [decorated]);

  const acceptedVolume = summary.volume;

  const openRevisions = (revisions ?? []).filter((r) => r.status === "open").length;



  function copyLink(id: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/offer/${id}`);
    toast.success("Offer Link Copied");
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("There's nothing to export in this view.");
      return;
    }
    const csv = toCsv(
      [
        "Merchant",
        "Stage",
        "Created",
        "Expires",
        "Min Funded",
        "Max Funded",
        "Term (Days)",
        "Buy Rate",
        "Upsell Points",
        "Sell Rate",
        "Accepted Amount",
        "Accepted Frequency",
        "Accepted Payment",
        "Accepted Payback",
        "Accepted At",
        "Requested Funding Date",
        "Revision Requested Amount",
        "Revision Frequency",
        "Revision Note",
        "Times Sent",
        "Last Sent",
        "Offer Views",
        "Viewing Devices",
        "First Viewed",
        "Last Viewed",
        "Verification Clicks",
        "Last Verification Click",
        "Offer Link",
      ],
      rows.map(({ deal, accepted, revision, views, state }) => [
        deal.merchant_name,
        state.label,

        deal.created_at.slice(0, 10),
        deal.expiration_date,
        Number(deal.min_funded),
        Number(deal.max_funded),
        deal.term_days,
        Number(deal.buy_rate),
        Number(deal.upsell_points),
        Number(deal.sell_rate ?? 0),
        accepted ? Number(accepted.accepted_amount) : "",
        accepted?.frequency ?? "",
        accepted ? Number(accepted.computed_payment) : "",
        accepted ? Number(accepted.computed_payback) : "",
        accepted?.accepted_at ?? "",
        accepted?.requested_funding_date ?? "",
        revision ? Number(revision.requested_amount) : "",
        revision?.frequency ?? "",
        revision?.note ?? "",
        sendStats?.[deal.id]?.count ?? 0,
        sendStats?.[deal.id]?.last ?? "",
        views?.views ?? 0,
        views?.devices ?? 0,
        views?.first ?? "",
        views?.last ?? "",
        bankStats?.[deal.id]?.count ?? 0,
        bankStats?.[deal.id]?.last ?? "",
        `${window.location.origin}/offer/${deal.id}`,
      ]),

    );
    downloadCsv(`magenta-offers-${csvStamp()}.csv`, csv);
    toast.success("Report Downloaded");
  }

  const activeFilterCount =
    Number(quickFilter !== "all") +
    stageFilters.length +
    Number(Boolean(minAmount)) +
    Number(Boolean(maxAmount)) +
    Number(viewsFilter !== "all") +
    Number(uploadsFilter !== "all") +
    Number(expiryFilter !== "all");

  function clearFilters() {
    setStageFilters([]);
    setMinAmount("");
    setMaxAmount("");
    setViewsFilter("all");
    setUploadsFilter("all");
    setExpiryFilter("all");
    setQuickFilter("all");
  }

  function toggleStage(stage: string) {
    setStageFilters((current) =>
      current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage],
    );
  }

  const currentPreferences = (): ViewPreferences => ({ sort, stageFilters, minAmount, maxAmount, viewsFilter, uploadsFilter, expiryFilter, quickFilter });

  function applySavedView(view: SavedView) {
    const prefs = view.preferences;
    setSort(prefs.sort); setStageFilters(prefs.stageFilters); setMinAmount(prefs.minAmount); setMaxAmount(prefs.maxAmount);
    setViewsFilter(prefs.viewsFilter); setUploadsFilter(prefs.uploadsFilter); setExpiryFilter(prefs.expiryFilter); setQuickFilter(prefs.quickFilter);
    toast.success(`${view.name} Applied`);
  }

  function saveCurrentView(name: string) {
    setSavedViews((current) => [...current, { id: crypto.randomUUID(), name, preferences: currentPreferences() }]);
    toast.success("View Saved");
  }

  async function saveFollowUp(dueAt: string, note: string) {
    if (!followUpDeal) return;
    setSavingFollowUp(true);
    const existing = followUps?.find((item) => item.deal_id === followUpDeal.id && !item.completed_at);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setSavingFollowUp(false); toast.error("Please sign in again."); return; }
    const result = existing
      ? await supabase.from("deal_follow_ups").update({ due_at: dueAt, note: note || null }).eq("id", existing.id)
      : await supabase.from("deal_follow_ups").insert({ deal_id: followUpDeal.id, owner_id: userId, due_at: dueAt, note: note || null });
    setSavingFollowUp(false);
    if (result.error) { toast.error("Follow-Up Could Not Be Saved"); return; }
    setFollowUpDeal(null);
    void queryClient.invalidateQueries({ queryKey: ["deal-follow-ups"] });
    toast.success("Follow-Up Saved");
  }

  async function completeFollowUp(id: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("deal_follow_ups").update({ completed_at: new Date().toISOString(), completed_by: userId }).eq("id", id);
    if (error) { toast.error("Follow-Up Could Not Be Completed"); return; }
    void queryClient.invalidateQueries({ queryKey: ["deal-follow-ups"] });
    toast.success("Follow-Up Completed");
  }

  const applySummaryFilter = (target: "all" | "accepted" | "docs" | "expiring") => {
    clearFilters();
    if (target === "accepted") setStageFilters(["Accepted"]);
    if (target === "docs") {
      setStageFilters(["Accepted"]);
      setUploadsFilter("none");
    }
    if (target === "expiring") setQuickFilter("expiring");
  };

  return (
    <AppShell>
      <PortalPageHeader
        title="Your Deals"
        subtitle={
          <>
            <p>Manage, filter, and send every offer from one workspace.</p>
            {openRevisions > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStageFilters(["Revision Requested"])} className="mt-3 border-gold bg-internal text-internal-foreground">
                <BellRing className="size-4" /> {openRevisions} Open Revision Request{openRevisions === 1 ? "" : "s"}
              </Button>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download className="size-4" /> Export Report</Button>
            <Button asChild><Link to="/deals/$dealId" params={{ dealId: "new" }}><Plus className="size-4" /> New Offer</Link></Button>
          </>
        }
      />

      <section aria-label="Offers workspace" className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="grid grid-cols-2 border-b border-border bg-secondary/35 sm:grid-cols-3 lg:grid-cols-5">
          {([
            { label: "Offers", value: String(summary.total), target: "all" as const },
            { label: "Accepted", value: String(summary.accepted), target: "accepted" as const },
            { label: "Accepted Volume", value: formatMoney(acceptedVolume), target: "accepted" as const },
            { label: "Awaiting Docs", value: String(summary.awaitingDocs), target: "docs" as const },
            { label: "Expiring In 3 Days", value: String(summary.expiring), target: "expiring" as const },
          ]).map(({ label, value, target }, index) => (
            <button
              key={label}
              type="button"
              onClick={() => applySummaryFilter(target)}
              className={`focus-ring min-h-20 px-4 py-3 text-left transition-colors hover:bg-accent ${index > 0 ? "border-l border-border" : ""}`}
            >
              <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
              <span className="mt-1 block text-xl font-semibold tabular-nums text-foreground">{value}</span>
            </button>
          ))}
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Pipeline By Stage</span>
            {stageFilters.length ? <Button variant="ghost" size="sm" onClick={() => setStageFilters([])}>Show All Stages</Button> : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter by Stage">
            {stageCounts.map(({ stage, count }) => (
              <Button key={stage} variant={stageFilters.includes(stage) ? "default" : "outline"} size="sm" onClick={() => toggleStage(stage)} className="shrink-0">
                {stage} <Badge variant="secondary" className="ml-1 tabular-nums">{count}</Badge>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-56 flex-1 lg:max-w-md">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              aria-label="Search offers by merchant or email"
              placeholder="Search merchant or email…"
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 bg-secondary/45 pl-9 pr-9 md:min-h-9"
            />
            {query ? <Button type="button" variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-0.5 top-1/2 -translate-y-1/2"><X className="size-4" /></Button> : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={activeFilterCount ? "border-primary text-primary" : ""}>
                <SlidersHorizontal className="size-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}<ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2">
              <DropdownMenuLabel>Filter By Stage</DropdownMenuLabel>
              {stageOptions.map((stage) => <DropdownMenuCheckboxItem key={stage} checked={stageFilters.includes(stage)} onCheckedChange={() => toggleStage(stage)} onSelect={(event) => event.preventDefault()}>{stage}</DropdownMenuCheckboxItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Amount Range</DropdownMenuLabel>
              <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                <Input inputMode="numeric" value={minAmount} onChange={(event) => setMinAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Minimum" aria-label="Minimum amount" />
                <Input inputMode="numeric" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Maximum" aria-label="Maximum amount" />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Views</DropdownMenuLabel>
              {([['all','Any views'],['none','Not viewed'],['some','Viewed']] as const).map(([value,label]) => <DropdownMenuCheckboxItem key={value} checked={viewsFilter === value} onCheckedChange={() => setViewsFilter(value)} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}
              <DropdownMenuLabel>Uploads</DropdownMenuLabel>
              {([['all','Any uploads'],['none','No uploads'],['some','Has uploads']] as const).map(([value,label]) => <DropdownMenuCheckboxItem key={value} checked={uploadsFilter === value} onCheckedChange={() => setUploadsFilter(value)} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}
              <DropdownMenuLabel>Expires</DropdownMenuLabel>
              {([['all','Any date'],['expired','Expired'],['three','Next 3 days'],['seven','Next 7 days'],['later','Later']] as const).map(([value,label]) => <DropdownMenuCheckboxItem key={value} checked={expiryFilter === value} onCheckedChange={() => setExpiryFilter(value)} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={clearFilters} disabled={activeFilterCount === 0}>Clear all filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <label className="sr-only" htmlFor="offer-sort">Sort offers</label>
          <select id="offer-sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground md:min-h-9">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Largest amount</option><option value="merchant">Merchant name</option><option value="stage">Stage</option><option value="expiring">Expiring soonest</option><option value="viewed">Most viewed</option><option value="uploads">Most uploads</option>
          </select>

          <ExpandAllButton allOpen={expandAll.allOpen} onToggle={expandAll.toggle} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><Bookmark className="size-4" /> Views <ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              {savedViews.length === 0 ? <DropdownMenuItem disabled>No Saved Views Yet</DropdownMenuItem> : savedViews.map((view) => (
                <DropdownMenuItem key={view.id} onSelect={() => applySavedView(view)} className="justify-between">
                  <span>{view.name}</span>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${view.name}`} onClick={(event) => { event.stopPropagation(); setSavedViews((current) => current.filter((item) => item.id !== view.id)); }}><Trash2 className="size-4" /></Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSaveViewOpen(true)}><Bookmark className="size-4" /> Save Current View</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground" aria-live="polite">{rows.length} of {decorated.length} offers</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-2 text-xs text-muted-foreground" aria-label="Status icon legend">
          <span className="font-semibold text-foreground">Quick Status</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-gold" /> Action Needed</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Engagement</span>
          <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Completed</span>
          <span className="hidden sm:inline">Select an icon for its details.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/20 px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Quick Filters</span>
          {QUICK_FILTERS.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              variant={quickFilter === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter((current) => current === filter.key ? "all" : filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/20 px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Active filters</span>
            {quickFilter !== "all" ? <Button variant="secondary" size="sm" onClick={() => setQuickFilter("all")}>{QUICK_FILTERS.find((filter) => filter.key === quickFilter)?.label ?? "Quick Filter"}<X className="size-3.5" /></Button> : null}
            {stageFilters.map((stage) => <Button key={stage} variant="secondary" size="sm" onClick={() => toggleStage(stage)}>{stage}<X className="size-3.5" /></Button>)}
            {minAmount ? <Button variant="secondary" size="sm" onClick={() => setMinAmount("")}>From {formatMoney(Number(minAmount))}<X className="size-3.5" /></Button> : null}
            {maxAmount ? <Button variant="secondary" size="sm" onClick={() => setMaxAmount("")}>To {formatMoney(Number(maxAmount))}<X className="size-3.5" /></Button> : null}
            {viewsFilter !== "all" ? <Button variant="secondary" size="sm" onClick={() => setViewsFilter("all")}>{viewsFilter === "none" ? "Not Viewed" : "Viewed"}<X className="size-3.5" /></Button> : null}
            {uploadsFilter !== "all" ? <Button variant="secondary" size="sm" onClick={() => setUploadsFilter("all")}>{uploadsFilter === "none" ? "No Uploads" : "Has Uploads"}<X className="size-3.5" /></Button> : null}
            {expiryFilter !== "all" ? <Button variant="secondary" size="sm" onClick={() => setExpiryFilter("all")}>Expiry: {expiryFilter === "three" ? "3 days" : expiryFilter === "seven" ? "7 days" : titleCase(expiryFilter)}<X className="size-3.5" /></Button> : null}
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
          </div>
        ) : null}

        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading offers…</div> : null}
        {!isLoading && decorated.length === 0 ? <div className="p-10 text-center"><h2 className="text-xl">No Offers Yet</h2><p className="mt-2 text-sm text-muted-foreground">Your first offer takes about a minute to build.</p><Button asChild className="mt-5"><Link to="/deals/$dealId" params={{ dealId: "new" }}>Build Your First Offer</Link></Button></div> : null}
        {!isLoading && decorated.length > 0 && rows.length === 0 ? <div className="p-10 text-center"><p className="text-sm text-muted-foreground">No offers match these filters.</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); clearFilters(); }}>Reset Search And Filters</Button></div> : null}

        {!isLoading && rows.length > 0 ? (
          <div className="grid gap-3 bg-secondary/20 p-3 sm:p-4">
            {rows.map(({ deal, accepted, revision, views, sent, docCount, bank, state, followUp }) => {
              const left = daysUntil(deal.expiration_date);
              const expires = left < 0 ? "Expired" : left === 0 ? "Expires Today" : `Expires In ${left} Days`;
              const amount = accepted
                ? formatMoney(Number(accepted.accepted_amount))
                : `${formatMoney(Number(deal.min_funded))} – ${formatMoney(Number(deal.max_funded))}`;
              const cardTone = accepted ? "card-accepted" : revision ? "card-revision" : "";

              return (
                <DealTile
                  key={deal.id}
                  id={`offer-${deal.id}`}
                  title={
                    <span id={`offer-${deal.id}-summary`} tabIndex={-1} className="flex flex-wrap items-center gap-2 outline-none">
                      <span className="truncate">{titleCaseName(deal.merchant_name)}</span>
                      <Badge className={state.tone}>{state.label}</Badge>
                    </span>
                  }
                  summary={
                    <span className="mt-1 block text-muted-foreground">
                      <span className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className="font-semibold tabular-nums text-foreground">{amount}</span>
                        <span aria-hidden>·</span>
                        <span>{deal.term_days} Business Days</span>
                        <span aria-hidden>·</span>
                        <span className={!accepted && left <= 3 ? "font-semibold text-internal-foreground" : ""}>{expires}</span>
                        {revision ? <><span aria-hidden>·</span><span className="font-semibold text-internal-foreground">Change Requested</span></> : null}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold uppercase text-muted-foreground">Next Action</span>
                        <span className="font-semibold text-foreground">{priorityReason({ accepted, revision, views, sent, docCount, left })}</span>
                        {followUp ? <Badge className={new Date(followUp.due_at).getTime() < Date.now() ? "border-coral bg-coral/10 text-coral" : "border-gold bg-internal text-internal-foreground"}><CalendarClock className="mr-1 size-3" />{new Date(followUp.due_at).getTime() < Date.now() ? "Overdue" : `Due ${timeAgo(followUp.due_at)}`}</Badge> : null}
                      </span>
                    </span>
                  }
                  headerActions={({ setOpen }) => (
                    <DealStatusIcons
                      sent={sent}
                      views={views}
                      accepted={!!accepted}
                      docCount={docCount}
                      bankRequired={Boolean(deal.bank_verification_url)}
                      bank={bank}
                      revisionRequested={!!revision}
                      daysUntilExpiration={left}
                      onActivate={(target) => {
                        setOpen(true);
                        focusOfferDetail(deal.id, target);
                      }}
                    />
                  )}
                  defaultOpen={rows.length === 1}
                  openSignal={expandAll.signal}
                  openSignalValue={expandAll.value}
                  className={`group border-l-2 border-l-transparent transition-colors hover:border-l-primary hover:bg-selected focus-within:border-l-primary focus-within:bg-selected ${cardTone}`}
                >
                  <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
                    <div className="min-w-0 space-y-4">
                      <div className="border-l-2 border-border pl-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Internal Pricing</p>
                        <dl className="mt-2 grid grid-cols-3 gap-3 text-sm tabular-nums">
                          <div><dt className="text-xs text-muted-foreground">Buy Rate</dt><dd className="font-semibold">{Number(deal.buy_rate).toFixed(3)}</dd></div>
                          <div><dt className="text-xs text-muted-foreground">Upsell</dt><dd className="font-semibold">{Number(deal.upsell_points).toFixed(3)}</dd></div>
                          <div><dt className="text-xs text-muted-foreground">Sell Rate</dt><dd className="font-semibold">{Number(deal.sell_rate ?? 0).toFixed(3)}</dd></div>
                        </dl>
                      </div>

                      {accepted ? (
                        <div id={`offer-${deal.id}-accepted`} tabIndex={-1} className="text-sm outline-none">
                          <p className="font-semibold text-primary">Accepted {formatMoney(Number(accepted.accepted_amount))}</p>
                          <p className="mt-1 text-muted-foreground">{titleCase(accepted.frequency)} payments of {formatMoney(Number(accepted.computed_payment))} · Payback {formatMoney(Number(accepted.computed_payback))}</p>
                        </div>
                      ) : null}
                      {revision ? (
                        <div id={`offer-${deal.id}-revision`} tabIndex={-1} className="rounded-md border border-gold bg-internal p-3 text-sm outline-none">
                          <p className="font-semibold text-internal-foreground">Revision Requested</p>
                          <p className="mt-1">{formatMoney(Number(revision.requested_amount))} · {titleCase(revision.frequency)}</p>
                          {revision.note ? <p className="mt-1 text-muted-foreground">“{revision.note}”</p> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-4">
                      <DealProgress
                        dealId={deal.id}
                        sent={!!sent}
                        viewed={(views?.views ?? 0) > 0}
                        accepted={!!accepted}
                        docsReceived={docCount > 0}
                        revisionRequested={!!revision}
                      />
                      <div id={`offer-${deal.id}-activity`} tabIndex={-1} className="flex flex-wrap gap-2 text-xs outline-none">
                        <Badge variant="outline">{views?.views ?? 0} View{(views?.views ?? 0) === 1 ? "" : "s"}{views?.last ? ` · ${timeAgo(views.last)}` : ""}</Badge>
                        <Badge variant="outline">{sent ? `Sent ${sent.count}× · ${timeAgo(sent.last)}` : "Not Sent"}</Badge>
                        {deal.bank_verification_url ? <Badge variant="outline">{bank ? `Verified ${bank.count}×` : "Not Verified Yet"}</Badge> : null}
                        <Badge variant="outline">{docCount ? `${docCount} Upload${docCount === 1 ? "" : "s"}` : "No Uploads Yet"}</Badge>
                      </div>
                      {followUp ? <div className="flex items-center justify-between gap-3 rounded-md border border-gold bg-internal p-3 text-sm"><div><p className="font-semibold text-internal-foreground">Follow-Up {new Date(followUp.due_at).toLocaleString()}</p>{followUp.note ? <p className="mt-1 text-muted-foreground">{followUp.note}</p> : null}</div><Button size="sm" variant="outline" onClick={() => void completeFollowUp(followUp.id)}><Check className="size-4" /> Complete</Button></div> : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                    <Button variant="ghost" size="sm" onClick={() => setFollowUpDeal({ id: deal.id, name: titleCaseName(deal.merchant_name) })}><CalendarClock className="size-4" /> {followUp ? "Update Follow-Up" : "Set Follow-Up"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => copyLink(deal.id)}><Copy className="size-4" /> Copy Link</Button>
                    <Button asChild variant="outline" size="sm"><Link to="/deals/$dealId" params={{ dealId: deal.id }}>Open Deal</Link></Button>
                    <Button asChild variant="outline" size="sm"><a href={`/offer/${deal.id}`} target="_blank" rel="noreferrer"><Eye className="size-4" /> Preview</a></Button>
                    <Button size="sm" onClick={() => setSendDeal({ id: deal.id, merchant_name: deal.merchant_name, merchant_email: deal.merchant_email, merchant_phone: deal.merchant_phone, expiration_date: deal.expiration_date })}><Send className="size-4" /> {sent ? "Resend" : "Send Offer"}</Button>
                  </div>
                </DealTile>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground"><span>Showing {rows.length} of {decorated.length} offers</span><span>Filters and sorting are saved on this device</span></div>
      </section>

      {sendDeal ? <SendOfferDialog deal={sendDeal} onOpenChange={(open) => { if (!open) setSendDeal(null); }} onSent={() => { void queryClient.invalidateQueries({ queryKey: ["deal-send-stats"] }); void queryClient.invalidateQueries({ queryKey: ["deals"] }); }} /> : null}
      <SaveViewDialog open={saveViewOpen} onOpenChange={setSaveViewOpen} onSave={saveCurrentView} />
      {followUpDeal ? <FollowUpDialog open merchantName={followUpDeal.name} existing={followUps?.find((item) => item.deal_id === followUpDeal.id && !item.completed_at) ? { dueAt: followUps.find((item) => item.deal_id === followUpDeal.id && !item.completed_at)?.due_at ?? "", note: followUps.find((item) => item.deal_id === followUpDeal.id && !item.completed_at)?.note ?? null } : null} saving={savingFollowUp} onOpenChange={(open) => { if (!open) setFollowUpDeal(null); }} onSave={(dueAt, note) => void saveFollowUp(dueAt, note)} /> : null}
    </AppShell>
  );
}
