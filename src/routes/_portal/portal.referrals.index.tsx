import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users2 } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PartnerEmptyState } from "@/components/partner/empty-state";
import { ReferBusinessDialog } from "@/components/partner/refer-business-dialog";
import { ReferralTable } from "@/components/partner/referral-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePartnerReferrals, type ReferralRow } from "@/hooks/use-partner-referrals";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { PARTNER_FACING_STATUS, type PartnerFacingStatus } from "@/lib/partner-portal";
import { portalDb } from "@/lib/portal-db";
import { useQuery } from "@tanstack/react-query";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_portal/portal/referrals/")({
  validateSearch: (search: Record<string, unknown>): { stage?: string } =>
    typeof search['stage'] === "string" ? { stage: search['stage'] } : {},
  head: () => ({
    meta: [
      { title: "Referrals — Magenta Partner Portal" },
      {
        name: "description",
        content:
          "Track every business you referred to Magenta from application through funding, with progress, status and commission in one list.",
      },
      { property: "og:title", content: "Referrals — Magenta Partner Portal" },
      {
        property: "og:description",
        content: "Your referred businesses from application through funding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralsPage,
});

const STAGE_GROUPS: Record<string, PartnerFacingStatus[]> = {
  referred: ["referred"],
  started: ["application_started", "application_incomplete"],
  submitted: [
    "application_submitted",
    "under_review",
    "additional_information_needed",
  ],
  approved: ["approved"],
  funded: ["funded"],
};

const PROGRESS_FILTERS = [
  { value: "all", label: "Any progress" },
  { value: "incomplete", label: "Not finished" },
  { value: "complete", label: "Finished" },
];

const DATE_FILTERS = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

function ReferralsPage() {
  const { stage } = Route.useSearch();
  const { data: identity } = usePortalIdentity();
  const org = identity?.member?.organization ?? null;
  const isOrgAdmin = identity?.member?.role === "organization_admin";
  const myMemberId = identity?.member?.id ?? null;

  const { data: rows, isLoading } = usePartnerReferrals(org?.id);
  const { data: members } = useQuery({
    queryKey: ["partner-team-names", org?.id],
    enabled: Boolean(org?.id),
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(stage ?? "all");
  // Always start on everything the member is entitled to see; identity loads
  // after first render, so a role-derived default would stick at "mine".
  const [owner, setOwner] = useState<string>("all");
  const [progress, setProgress] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sort, setSort] = useState("recent");

  const filtered = useMemo(() => {
    const all = rows ?? [];
    const needle = query.trim().toLowerCase();
    const cutoff =
      dateRange === "all" ? null : Date.now() - Number(dateRange) * 86_400_000;

    const list = all.filter((r: ReferralRow) => {
      if (needle && !r.business.toLowerCase().includes(needle)) return false;
      if (status !== "all") {
        const group = STAGE_GROUPS[status];
        if (group) {
          if (!group.includes(r.partnerStatus)) return false;
        } else if (r.partnerStatus !== status) return false;
      }
      if (owner === "mine" && r.ownerMemberId !== myMemberId) return false;
      if (owner === "organization" && r.ownerMemberId !== null) return false;
      if (owner !== "all" && owner !== "mine" && owner !== "organization" && r.ownerMemberId !== owner)
        return false;
      if (progress === "incomplete" && r.completion >= 100) return false;
      if (progress === "complete" && r.completion < 100) return false;
      if (cutoff && new Date(r.referredAt).getTime() < cutoff) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sort === "business") return a.business.localeCompare(b.business);
      if (sort === "funded") return (b.fundedAmount ?? 0) - (a.fundedAmount ?? 0);
      if (sort === "oldest")
        return new Date(a.referredAt).getTime() - new Date(b.referredAt).getTime();
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [rows, query, status, owner, progress, dateRange, sort, myMemberId]);

  const selectClass =
    "focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm min-w-[9rem]";

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Referrals"
        subtitle="Track your referred businesses from application through funding."
        actions={<ReferBusinessDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchant or business"
          aria-label="Search merchant or business"
          className="min-w-[14rem] flex-1"
        />
        <select
          aria-label="Status"
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.entries(PARTNER_FACING_STATUS).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Referral owner"
          className={selectClass}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="all">Everyone</option>
          <option value="mine">Mine</option>
          <option value="organization">Organization link</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {titleCaseName(m.full_name)}
            </option>
          ))}
        </select>
        <select
          aria-label="Application progress"
          className={selectClass}
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
        >
          {PROGRESS_FILTERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Date referred"
          className={selectClass}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          {DATE_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Most recent activity</option>
          <option value="oldest">Oldest referred</option>
          <option value="business">Business name</option>
          <option value="funded">Funded amount</option>
        </select>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {(rows ?? []).length} referrals
        {isOrgAdmin ? " across your organization." : "."}
      </p>

      <ReferralTable
        rows={filtered}
        loading={isLoading}
        emptyState={
          <PartnerEmptyState
            icon={Users2}
            title={(rows ?? []).length === 0 ? "No referrals yet" : "Nothing matches those filters"}
            body={
              (rows ?? []).length === 0
                ? "Share your referral link to start sending businesses to Magenta."
                : "Try a wider date range or clear the status filter."
            }
            action={
              <Button asChild variant="outline">
                <Link to="/portal/referral-tools">View Referral Tools</Link>
              </Button>
            }
          />
        }
      />
    </PartnerShell>
  );
}
