import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Wallet } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PartnerKpiCard } from "@/components/partner/kpi-card";
import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import { portalDb } from "@/lib/portal-db";
import { shortDate } from "@/lib/partner";
import { COMMISSION_STATUS, currency, percent, type CommissionStatus } from "@/lib/partner-portal";
import { csvStamp, downloadCsv, toCsv } from "@/lib/csv";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_portal/portal/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Magenta Portal" },
      {
        name: "description",
        content:
          "Track pending and paid commissions on every funded application your organization submitted to Magenta.",
      },
      { property: "og:title", content: "Commissions — Magenta Portal" },
      {
        property: "og:description",
        content: "Pending and paid commission statements for your partner organization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommissionsPage,
});

interface CommissionRow {
  id: string;
  amount: number;
  rate_percent: number;
  funded_amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  scheduled_payment_date: string | null;
  payment_reference: string | null;
  created_at: string;
  application: { reference: string; legal_business_name: string } | null;
}

function CommissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-commissions"],
    queryFn: async () => {
      /**
       * Business names come from the partner-safe summary view and are joined
       * in memory — one application can carry several funded deals, so rows
       * are never collapsed by application id.
       */
      const [commissions, apps] = await Promise.all([
        portalDb
          .from("partner_commissions")
          .select(
            "id, application_id, amount, rate_percent, funded_amount, status, paid_at, scheduled_payment_date, payment_reference, created_at",
          )
          .order("created_at", { ascending: false }),
        portalDb
          .from("partner_application_summary")
          .select("id, reference, legal_business_name"),
      ]);
      if (commissions.error) throw new Error(commissions.error.message);
      const byId = new Map(
        (apps.data ?? []).map((a) => [
          a.id as string,
          {
            reference: (a.reference ?? "") as string,
            legal_business_name: (a.legal_business_name ?? "") as string,
          },
        ]),
      );
      return (commissions.data ?? []).map((c) => ({
        ...c,
        application: c.application_id ? (byId.get(c.application_id) ?? null) : null,
      })) as unknown as CommissionRow[];
    },
  });

  const rows = data ?? [];
  const paid = rows.filter((r) => r.status === "paid");
  const pending = rows.filter((r) => r.status === "pending" || r.status === "approved");
  const scheduled = rows.filter((r) => r.status === "scheduled");
  const total = (list: CommissionRow[]) => list.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  /** Total Earned counts everything that is not voided. */
  const earned = total(rows.filter((r) => r.status !== "void"));

  const now = new Date();
  const ytd = paid.filter((r) => r.paid_at && new Date(r.paid_at).getFullYear() === now.getFullYear());
  const mtd = ytd.filter((r) => r.paid_at && new Date(r.paid_at).getMonth() === now.getMonth());

  function exportCsv() {
    downloadCsv(
      `magenta-commissions-${csvStamp()}.csv`,
      toCsv(
        [
          "Application",
          "Business",
          "Funded Amount",
          "Rate",
          "Commission",
          "Status",
          "Expected On",
          "Paid On",
          "Reference",
        ],
        rows.map((r) => [
          r.application?.reference ?? "",
          r.application?.legal_business_name ?? "",
          Number(r.funded_amount ?? 0),
          `${r.rate_percent}%`,
          Number(r.amount ?? 0),
          COMMISSION_STATUS[r.status].label,
          r.scheduled_payment_date ?? "",
          r.paid_at ?? "",
          r.payment_reference ?? "",
        ]),
      ),
    );
  }

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Commissions"
        subtitle="Every funded application earns a commission at your organization's agreed rate."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />

      <section
        aria-label="Commission totals"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <PartnerKpiCard
          label="Total Earned"
          value={currency(earned)}
          hint={`${rows.length} commission${rows.length === 1 ? "" : "s"}`}
          tone="brand"
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Scheduled"
          value={currency(total(scheduled))}
          hint={
            scheduled.length
              ? `Next ${shortDate(
                  scheduled
                    .map((r) => r.scheduled_payment_date)
                    .filter((d): d is string => Boolean(d))
                    .sort()[0] ?? null,
                )}`
              : "Nothing scheduled"
          }
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Pending"
          value={currency(total(pending))}
          hint={`${pending.length} awaiting payment`}
          tone="gold"
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Paid"
          value={currency(total(paid))}
          icon={Wallet}
          tone="success"
          loading={isLoading}
        />
        <PartnerKpiCard label="Paid This Month" value={currency(total(mtd))} loading={isLoading} />
        <PartnerKpiCard label="Paid This Year" value={currency(total(ytd))} loading={isLoading} />
      </section>

      <section aria-label="Commission statement" className="mt-8">
        <h2 className="mb-3 font-display text-lg">Statement</h2>
        {isLoading ? (
          <div className="card-elevated divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Commissions appear here as soon as your first application funds.
            </p>
          </div>
        ) : (
          <>
            <div className="card-elevated hidden overflow-hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3 text-right">Funded</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expected</th>
                    <th className="px-4 py-3">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-mono text-xs">{r.application?.reference}</td>
                      <td className="px-4 py-3">
                        {titleCaseName(r.application?.legal_business_name ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-right">{currency(r.funded_amount)}</td>
                      <td className="px-4 py-3 text-right">{percent(r.rate_percent)}</td>
                      <td className="px-4 py-3 text-right font-medium">{currency(r.amount)}</td>
                      <td className="px-4 py-3">
                        <ToneBadge
                          label={COMMISSION_STATUS[r.status].label}
                          tone={COMMISSION_STATUS[r.status].tone}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.scheduled_payment_date ? shortDate(r.scheduled_payment_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{shortDate(r.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-3 lg:hidden">
              {rows.map((r) => (
                <li key={r.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg">
                        {titleCaseName(r.application?.legal_business_name ?? "—")}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {r.application?.reference}
                      </p>
                    </div>
                    <ToneBadge
                      label={COMMISSION_STATUS[r.status].label}
                      tone={COMMISSION_STATUS[r.status].tone}
                    />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Funded</dt>
                      <dd>{currency(r.funded_amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Commission</dt>
                      <dd className="font-medium">{currency(r.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {r.paid_at ? "Paid" : "Expected"}
                      </dt>
                      <dd>
                        {r.paid_at
                          ? shortDate(r.paid_at)
                          : r.scheduled_payment_date
                            ? shortDate(r.scheduled_payment_date)
                            : "To be scheduled"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </PartnerShell>
  );
}
