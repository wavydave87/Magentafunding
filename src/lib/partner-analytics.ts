/**
 * Pure aggregation helpers for partner analytics. Everything is derived from
 * rows already loaded through RLS — there are no reporting tables.
 */
import type { ApplicationStatus } from "@/lib/partner";

export interface AnalyticsApplication {
  id: string;
  status: ApplicationStatus;
  requested_amount: number | null;
  funded_amount: number | null;
  submitted_at: string | null;
  funded_at?: string | null;
  created_at?: string | null;
  updated_at: string | null;
  referred_by_member_id?: string | null;
}

export interface AnalyticsCommission {
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

/** Last `count` months, oldest first, as `{ key, label }`. */
export function monthBuckets(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABEL(d) };
  });
}

const bucketKey = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}`;
};

export interface MonthlyPoint {
  label: string;
  submissions: number;
  funded: number;
  volume: number;
  commission: number;
}

export function monthlySeries(
  apps: AnalyticsApplication[],
  commissions: AnalyticsCommission[],
  months = 6,
): MonthlyPoint[] {
  const buckets = monthBuckets(months);
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const points: MonthlyPoint[] = buckets.map((b) => ({
    label: b.label,
    submissions: 0,
    funded: 0,
    volume: 0,
    commission: 0,
  }));

  for (const app of apps) {
    const submitted = index.get(bucketKey(app.submitted_at ?? app.created_at) ?? "");
    if (submitted !== undefined) points[submitted]!.submissions += 1;
    if (app.status === "funded") {
      const funded = index.get(bucketKey(app.funded_at ?? app.updated_at) ?? "");
      if (funded !== undefined) {
        points[funded]!.funded += 1;
        points[funded]!.volume += Number(app.funded_amount ?? 0);
      }
    }
  }

  for (const c of commissions) {
    const key = index.get(bucketKey(c.paid_at ?? c.created_at) ?? "");
    if (key !== undefined) points[key]!.commission += Number(c.amount ?? 0);
  }

  return points;
}

const APPROVED_OR_BETTER: ApplicationStatus[] = [
  "approved",
  "contract_requested",
  "contract_sent",
  "contract_signed",
  "funded",
];

export interface ConversionSummary {
  submitted: number;
  approved: number;
  funded: number;
  declined: number;
  approvalRate: number;
  fundingRate: number;
  averageFunded: number;
  avgDaysToFund: number | null;
}

export function conversionSummary(apps: AnalyticsApplication[]): ConversionSummary {
  const submitted = apps.filter((a) => a.status !== "started").length;
  const approved = apps.filter((a) => APPROVED_OR_BETTER.includes(a.status)).length;
  const fundedApps = apps.filter((a) => a.status === "funded");
  const declined = apps.filter((a) => a.status === "declined").length;
  const volume = fundedApps.reduce((s, a) => s + Number(a.funded_amount ?? 0), 0);

  const spans = fundedApps
    .map((a) => {
      if (!a.submitted_at || !a.funded_at) return null;
      const start = new Date(a.submitted_at).getTime();
      const end = new Date(`${a.funded_at}T00:00:00`).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
      return (end - start) / 86_400_000;
    })
    .filter((n): n is number => n !== null);

  return {
    submitted,
    approved,
    funded: fundedApps.length,
    declined,
    approvalRate: submitted ? (approved / submitted) * 100 : 0,
    fundingRate: submitted ? (fundedApps.length / submitted) * 100 : 0,
    averageFunded: fundedApps.length ? volume / fundedApps.length : 0,
    avgDaysToFund: spans.length
      ? Math.round(spans.reduce((s, n) => s + n, 0) / spans.length)
      : null,
  };
}

export interface LeaderRow {
  memberId: string | null;
  name: string;
  submissions: number;
  funded: number;
  volume: number;
}

export function memberLeaderboard(
  apps: AnalyticsApplication[],
  members: { id: string; full_name: string }[],
): LeaderRow[] {
  const names = new Map(members.map((m) => [m.id, m.full_name]));
  const totals = new Map<string, LeaderRow>();

  for (const app of apps) {
    const id = app.referred_by_member_id ?? "unattributed";
    const row =
      totals.get(id) ??
      ({
        memberId: app.referred_by_member_id ?? null,
        name: names.get(id) ?? "Unattributed",
        submissions: 0,
        funded: 0,
        volume: 0,
      } satisfies LeaderRow);
    row.submissions += 1;
    if (app.status === "funded") {
      row.funded += 1;
      row.volume += Number(app.funded_amount ?? 0);
    }
    totals.set(id, row);
  }

  return [...totals.values()].sort((a, b) => b.volume - a.volume || b.submissions - a.submissions);
}

/** Stages where the ball is in Magenta's court but nothing has moved lately. */
const STALE_DAYS = 7;
const ACTIVE_STAGES: ApplicationStatus[] = [
  "started",
  "missing_information",
  "submitted",
  "under_review",
  "offer_available",
  "contract_requested",
  "contract_sent",
];

export function staleApplications<T extends AnalyticsApplication>(
  apps: T[],
  days = STALE_DAYS,
): T[] {
  const cutoff = Date.now() - days * 86_400_000;
  return apps.filter((a) => {
    if (!ACTIVE_STAGES.includes(a.status)) return false;
    const touched = new Date(a.updated_at ?? a.created_at ?? "").getTime();
    return !Number.isNaN(touched) && touched < cutoff;
  });
}

export const daysSince = (value: string | null | undefined) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
};
