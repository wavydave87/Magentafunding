import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PartnerKpiCard } from "@/components/partner/kpi-card";
import { money } from "@/lib/partner";
import { currency, percent } from "@/lib/partner-portal";
import {
  conversionSummary,
  memberLeaderboard,
  monthlySeries,
  type AnalyticsApplication,
  type AnalyticsCommission,
} from "@/lib/partner-analytics";

export interface AnalyticsViewProps {
  apps: AnalyticsApplication[];
  commissions: AnalyticsCommission[];
  members: { id: string; full_name: string }[];
  loading?: boolean;
  /** Hide the per-member leaderboard for organizations without referral reps. */
  showLeaderboard?: boolean;
}

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

/**
 * Shared analytics surface. Partners see their own organization; Magenta staff
 * see the identical figures on a partner organization profile.
 */
export function PartnerAnalyticsView({
  apps,
  commissions,
  members,
  loading = false,
  showLeaderboard = true,
}: AnalyticsViewProps) {
  const series = monthlySeries(apps, commissions, 6);
  const summary = conversionSummary(apps);
  const leaders = memberLeaderboard(apps, members).slice(0, 8);

  return (
    <div className="grid gap-6">
      <section aria-label="Performance summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PartnerKpiCard
          label="Approval Rate"
          value={percent(summary.approvalRate)}
          hint={`${summary.approved} of ${summary.submitted} submitted`}
          tone="brand"
          loading={loading}
        />
        <PartnerKpiCard
          label="Funding Rate"
          value={percent(summary.fundingRate)}
          hint={`${summary.funded} funded`}
          tone="success"
          loading={loading}
        />
        <PartnerKpiCard
          label="Average Funded"
          value={money(summary.averageFunded)}
          loading={loading}
        />
        <PartnerKpiCard
          label="Avg Days To Fund"
          value={summary.avgDaysToFund === null ? "—" : String(summary.avgDaysToFund)}
          hint="From submission to funding"
          tone="gold"
          loading={loading}
        />
      </section>

      <section aria-label="Submissions and funding by month" className="card-elevated p-4 sm:p-5">
        <h2 className="font-display text-lg">Submissions &amp; Funding</h2>
        <p className="text-xs text-muted-foreground">Last six months</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="submissions" name="Submissions" fill="var(--plum)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="funded" name="Funded" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-label="Funded volume and commission by month" className="card-elevated p-4 sm:p-5">
        <h2 className="font-display text-lg">Volume &amp; Commission</h2>
        <p className="text-xs text-muted-foreground">Funded volume against commission earned</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis
                {...axis}
                width={64}
                tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
              />
              <Tooltip
                formatter={(value: number, name) => [currency(value), name as string]}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                name="Funded Volume"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="commission"
                name="Commission"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {showLeaderboard ? (
        <section aria-label="Team leaderboard" className="card-elevated overflow-hidden">
          <div className="p-4 sm:p-5">
            <h2 className="font-display text-lg">Team Leaderboard</h2>
            <p className="text-xs text-muted-foreground">
              Attribution comes from the referral link and application owner.
            </p>
          </div>
          {leaders.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3 text-right">Submissions</th>
                  <th className="px-4 py-3 text-right">Funded</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaders.map((row) => (
                  <tr key={row.memberId ?? "unattributed"}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-right">{row.submissions}</td>
                    <td className="px-4 py-3 text-right">{row.funded}</td>
                    <td className="px-4 py-3 text-right font-medium">{money(row.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}
