import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { portalDb } from "@/lib/portal-db";
import type { CommissionStatus, PartnerFacingStatus } from "@/lib/partner-portal";

/**
 * One referral row for the partner CRM.
 *
 * Sourced from `partner_application_summary`, a partner-safe view: factor
 * rates, paybacks, payment schedules, requested financials, bank and credit
 * data are not columns of that view, so they cannot reach the portal even by
 * accident. Which rows come back is decided in the database by the entitlement
 * rule, not by anything on this page.
 */
export interface ReferralRow {
  /** Row key: the application id, or `manual:<id>` for a recorded referral. */
  key: string;
  applicationId: string | null;
  business: string;
  reference: string | null;
  ownerMemberId: string | null;
  ownerName: string;
  referredAt: string;
  completion: number;
  partnerStatus: PartnerFacingStatus;
  lastActivity: string;
  fundedAmount: number | null;
  /** Sum of every commission on the application — one application can fund more than once. */
  commissionAmount: number | null;
  /** Status of the most recent commission, when there is at least one. */
  commissionStatus: CommissionStatus | null;
  commissionCount: number;
}

const APPLICATION_FIELDS =
  "id, reference, legal_business_name, dba, partner_status, completion_percent, started_at, last_activity_at, submitted_at, funded_amount, funded_at, created_at, attributed_member_id, organization_id";

export function usePartnerReferrals(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["partner-referral-records", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<ReferralRow[]> => {
      const [apps, manual, members, commissions] = await Promise.all([
        portalDb
          .from("partner_application_summary")
          .select(APPLICATION_FIELDS)
          .order("last_activity_at", { ascending: false }),
        portalDb
          .from("partner_referrals")
          .select(
            "id, merchant_business_name, member_id, created_at, updated_at, application_id",
          )
          .is("application_id", null)
          .order("created_at", { ascending: false }),
        portalDb.from("partner_members").select("id, full_name"),
        portalDb
          .from("partner_commissions")
          .select("application_id, amount, status, created_at"),
      ]);

      if (apps.error) throw new Error(apps.error.message);

      const nameOf = new Map(
        (members.data ?? []).map((m) => [m.id as string, m.full_name as string]),
      );

      /**
       * An application can have several funded deals, and therefore several
       * commissions. Totals add them up; the badge shows the latest status.
       */
      const commissionFor = new Map<
        string,
        { amount: number; status: CommissionStatus; at: number; count: number }
      >();
      for (const c of commissions.data ?? []) {
        if (!c.application_id) continue;
        const at = new Date(c.created_at ?? 0).getTime();
        const existing = commissionFor.get(c.application_id);
        if (!existing) {
          commissionFor.set(c.application_id, {
            amount: Number(c.amount ?? 0),
            status: c.status as CommissionStatus,
            at,
            count: 1,
          });
          continue;
        }
        existing.amount += Number(c.amount ?? 0);
        existing.count += 1;
        if (at >= existing.at) {
          existing.at = at;
          existing.status = c.status as CommissionStatus;
        }
      }

      const rows: ReferralRow[] = (apps.data ?? []).map((a) => {
        const commission = a.id ? commissionFor.get(a.id) : undefined;
        return {
          key: a.id as string,
          applicationId: a.id as string,
          business: (a.dba || a.legal_business_name) as string,
          reference: a.reference,
          ownerMemberId: a.attributed_member_id,
          ownerName: a.attributed_member_id
            ? (nameOf.get(a.attributed_member_id) ?? "Organization")
            : "Organization",
          referredAt: (a.started_at ?? a.created_at) as string,
          completion: Number(a.completion_percent ?? 0),
          partnerStatus: a.partner_status as PartnerFacingStatus,
          lastActivity: (a.last_activity_at ?? a.created_at) as string,
          fundedAmount: a.funded_amount === null ? null : Number(a.funded_amount),
          commissionAmount: commission?.amount ?? null,
          commissionStatus: commission?.status ?? null,
          commissionCount: commission?.count ?? 0,
        };
      });

      for (const r of manual.data ?? []) {
        rows.push({
          key: `manual:${r.id}`,
          applicationId: null,
          business: r.merchant_business_name,
          reference: null,
          ownerMemberId: r.member_id,
          ownerName: r.member_id ? (nameOf.get(r.member_id) ?? "Organization") : "Organization",
          referredAt: r.created_at,
          completion: 0,
          partnerStatus: "referred",
          lastActivity: r.updated_at ?? r.created_at,
          fundedAmount: null,
          commissionAmount: null,
          commissionStatus: null,
          commissionCount: 0,
        });
      }

      return rows.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
      );
    },
  });
}

/** The five funnel stages a partner cares about, in order. */
export const FUNNEL: { key: string; label: string; match: PartnerFacingStatus[] }[] = [
  { key: "referred", label: "Referred", match: ["referred"] },
  {
    key: "started",
    label: "Application Started",
    match: ["application_started", "application_incomplete"],
  },
  {
    key: "submitted",
    label: "Application Submitted",
    match: [
      "application_submitted",
      "under_review",
      "additional_information_needed",
    ],
  },
  { key: "approved", label: "Approved", match: ["approved"] },
  { key: "funded", label: "Funded", match: ["funded"] },
];

export function funnelCounts(rows: ReferralRow[]) {
  return FUNNEL.map((stage) => ({
    ...stage,
    count: rows.filter((r) => stage.match.includes(r.partnerStatus)).length,
  }));
}
