import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { PartnerFacingStatusBadge } from "@/components/partner/status-badges";
import { ToneBadge } from "@/components/partner/tone-badge";
import type { ReferralRow } from "@/hooks/use-partner-referrals";
import { money, shortDate } from "@/lib/partner";
import { COMMISSION_STATUS } from "@/lib/partner-portal";
import { titleCaseName } from "@/lib/text";

/** Completion only means something while the merchant is still filling it in. */
const IN_PROGRESS_STATUSES = new Set([
  "referred",
  "application_started",
  "application_incomplete",
]);

function Progress({ value }: { value: number }) {
  return (
    <div className="min-w-[6rem]">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Application progress"
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{value}% complete</p>
    </div>
  );
}

/**
 * Every row opens, including a manually recorded referral that has no
 * application yet — its key carries the `manual:` prefix.
 */
function OpenLink({ row, children }: { row: ReferralRow; children: React.ReactNode }) {
  return (
    <Link
      to="/portal/referrals/$referralId"
      params={{ referralId: row.key }}
      className="focus-ring rounded underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}

/**
 * The partner referral CRM list. A real table on large screens, stacked cards
 * on phones — the same rows either way, never a horizontal scroll.
 */
export function ReferralTable({
  rows,
  loading,
  emptyState,
}: {
  rows: ReferralRow[];
  loading?: boolean;
  emptyState?: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="card-elevated divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop */}
      <div className="card-elevated hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Business</th>
              <th scope="col" className="px-4 py-3 font-medium">Owner</th>
              <th scope="col" className="px-4 py-3 font-medium">Referred</th>
              <th scope="col" className="px-4 py-3 font-medium">Progress</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Last Activity</th>
              <th scope="col" className="px-4 py-3 font-medium">Funded</th>
              <th scope="col" className="px-4 py-3 font-medium">Commission</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-accent/40 focus-within:bg-accent/40">
                <td className="px-4 py-3 font-medium">
                  <OpenLink row={row}>{titleCaseName(row.business)}</OpenLink>
                  {row.reference ? (
                    <p className="text-xs text-muted-foreground">{row.reference}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{titleCaseName(row.ownerName)}</td>
                <td className="px-4 py-3 text-muted-foreground">{shortDate(row.referredAt)}</td>
                <td className="px-4 py-3">
                  {IN_PROGRESS_STATUSES.has(row.partnerStatus) ? (
                    <Progress value={row.completion} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Complete</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PartnerFacingStatusBadge status={row.partnerStatus} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{shortDate(row.lastActivity)}</td>
                <td className="px-4 py-3">{row.fundedAmount ? money(row.fundedAmount) : "—"}</td>
                <td className="px-4 py-3">
                  {row.commissionAmount ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{money(row.commissionAmount)}</span>
                      {row.commissionStatus ? (
                        <ToneBadge
                          label={COMMISSION_STATUS[row.commissionStatus].label}
                          tone={COMMISSION_STATUS[row.commissionStatus].tone}
                        />
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/portal/referrals/$referralId"
                    params={{ referralId: row.key }}
                    className="focus-ring inline-flex items-center gap-1 rounded text-sm text-primary"
                  >
                    View <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <li key={row.key} className="card-elevated p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <OpenLink row={row}>{titleCaseName(row.business)}</OpenLink>
                </p>
                <p className="text-xs text-muted-foreground">
                  {titleCaseName(row.ownerName)} · Referred {shortDate(row.referredAt)}
                </p>
              </div>
              <PartnerFacingStatusBadge status={row.partnerStatus} />
            </div>
            {IN_PROGRESS_STATUSES.has(row.partnerStatus) ? (
              <div className="mt-3">
                <Progress value={row.completion} />
              </div>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Funded</dt>
                <dd>{row.fundedAmount ? money(row.fundedAmount) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Commission</dt>
                <dd>{row.commissionAmount ? money(row.commissionAmount) : "—"}</dd>
              </div>
            </dl>
            <Link
              to="/portal/referrals/$referralId"
              params={{ referralId: row.key }}
              className="focus-ring mt-3 inline-flex min-h-11 items-center gap-1 rounded text-sm text-primary"
            >
              View referral <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {row.applicationId ? null : (
              <p className="mt-1 text-xs text-muted-foreground">Awaiting their application.</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
