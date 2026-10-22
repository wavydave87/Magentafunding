import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import {
  ApplicationStatusBadge,
  PartnerFacingStatusBadge,
} from "@/components/partner/status-badges";
import { money, shortDate } from "@/lib/partner";
import type { ApplicationStatus } from "@/lib/partner";
import type { PartnerFacingStatus } from "@/lib/partner-portal";
import { titleCaseName } from "@/lib/text";

export interface ApplicationRow {
  id: string;
  reference: string;
  legal_business_name: string;
  dba: string | null;
  status: ApplicationStatus;
  requested_amount: number | null;
  approved_amount: number | null;
  funded_amount: number | null;
  commission_amount: number | null;
  submitted_at: string | null;
  updated_at: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  /** Simplified status shown to referral partners. */
  partner_status?: PartnerFacingStatus | null;
  completion_percent?: number | null;
}

/**
 * Partners see the simplified partner-facing status; internal staff see the
 * full underwriting pipeline status.
 */
function StatusCell({
  row,
  variant,
}: {
  row: ApplicationRow;
  variant: ApplicationTableVariant;
}) {
  const showProgress =
    variant === "partner" &&
    (row.partner_status === "application_started" ||
      row.partner_status === "application_incomplete") &&
    typeof row.completion_percent === "number";

  return (
    <div className="grid justify-items-start gap-1">
      {variant === "partner" && row.partner_status ? (
        <PartnerFacingStatusBadge status={row.partner_status} />
      ) : (
        <ApplicationStatusBadge status={row.status} />
      )}
      {showProgress ? (
        <span className="text-xs text-muted-foreground">{row.completion_percent}% complete</span>
      ) : null}
    </div>
  );
}

export type ApplicationTableVariant = "partner" | "internal";

/**
 * Typed detail link. Partner and internal surfaces render the same table but
 * resolve to different routes, so the route literal stays static in both arms.
 */
function DetailLink({
  variant,
  applicationId,
  className,
  ariaLabel,
  children,
}: {
  variant: ApplicationTableVariant;
  applicationId: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  if (variant === "internal") {
    return (
      <Link
        to="/partners/applications/$applicationId"
        params={{ applicationId }}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/portal/applications/$applicationId"
      params={{ applicationId }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

function ownerName(row: ApplicationRow) {
  const name = [row.contact_first_name, row.contact_last_name].filter(Boolean).join(" ");
  return name || "—";
}

/**
 * Desktop table / mobile card list for partner applications. Kept in one
 * component so both surfaces can never drift.
 */
export function PartnerApplicationTable({
  rows,
  loading,
  variant = "partner",
  emptyMessage = "No applications match these filters yet.",
}: {
  rows: ApplicationRow[];
  loading?: boolean;
  variant?: ApplicationTableVariant;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="card-elevated divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-6 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="card-elevated hidden overflow-hidden lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Requested</th>
              <th className="px-4 py-3 text-right font-medium">Approved</th>
              <th className="px-4 py-3 text-right font-medium">Funded</th>
              <th className="px-4 py-3 text-right font-medium">Commission</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-accent/40">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {shortDate(row.submitted_at)}
                </td>
                <td className="px-4 py-3">
                  <DetailLink
                    variant={variant}
                    applicationId={row.id}
                    className="focus-ring font-medium text-foreground hover:text-primary"
                  >
                    {titleCaseName(row.legal_business_name || "Untitled Application")}
                  </DetailLink>
                  <p className="text-xs text-muted-foreground">{row.reference}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{ownerName(row)}</td>
                <td className="px-4 py-3">
                  <StatusCell row={row} variant={variant} />
                </td>
                <td className="px-4 py-3 text-right">{money(row.requested_amount)}</td>
                <td className="px-4 py-3 text-right">{money(row.approved_amount)}</td>
                <td className="px-4 py-3 text-right">{money(row.funded_amount)}</td>
                <td className="px-4 py-3 text-right">{money(row.commission_amount)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {shortDate(row.updated_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DetailLink
                    variant={variant}
                    applicationId={row.id}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    ariaLabel={`Open ${row.legal_business_name}`}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </DetailLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <DetailLink
            key={row.id}
            variant={variant}
            applicationId={row.id}
            className="card-elevated focus-ring block p-4 transition-shadow hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {titleCaseName(row.legal_business_name || "Untitled Application")}
                </p>
                <p className="text-xs text-muted-foreground">{row.reference}</p>
              </div>
              <StatusCell row={row} variant={variant} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Requested</dt>
                <dd>{money(row.requested_amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Approved</dt>
                <dd>{money(row.approved_amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Funded</dt>
                <dd>{money(row.funded_amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Updated</dt>
                <dd>{shortDate(row.updated_at)}</dd>
              </div>
            </dl>
          </DetailLink>
        ))}
      </div>
    </>
  );
}
