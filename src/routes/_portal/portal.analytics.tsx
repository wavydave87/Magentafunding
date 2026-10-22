import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PartnerAnalyticsView } from "@/components/partner/analytics-view";
import { portalDb } from "@/lib/portal-db";
import type { AnalyticsApplication, AnalyticsCommission } from "@/lib/partner-analytics";

export const Route = createFileRoute("/_portal/portal/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Magenta Portal" },
      {
        name: "description",
        content:
          "Approval and funding conversion, funded volume, commission earned and a team leaderboard for your partner organization.",
      },
      { property: "og:title", content: "Analytics — Magenta Portal" },
      {
        property: "og:description",
        content: "Conversion, volume and commission trends for your partner organization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerAnalytics,
});

/**
 * The partner-safe view only carries the partner-facing status, so analytics
 * works from that. Internal underwriting stages never reach the portal.
 */
const STAGE_FROM_PARTNER_STATUS: Record<string, AnalyticsApplication["status"]> = {
  referred: "started",
  application_started: "started",
  application_incomplete: "started",
  application_submitted: "submitted",
  under_review: "under_review",
  additional_information_needed: "missing_information",
  approved: "approved",
  funded: "funded",
  declined: "declined",
  closed_withdrawn: "offer_expired",
};

function PartnerAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-analytics"],
    queryFn: async () => {
      const [apps, commissions, members] = await Promise.all([
        portalDb
          .from("partner_application_summary")
          .select(
            "id, partner_status, funded_amount, submitted_at, funded_at, created_at, last_activity_at, attributed_member_id",
          ),
        portalDb.from("partner_commissions").select("amount, status, paid_at, created_at"),
        portalDb.from("partner_members").select("id, full_name"),
      ]);
      if (apps.error) throw new Error(apps.error.message);
      const mapped: AnalyticsApplication[] = (apps.data ?? []).map((a) => ({
        id: a.id as string,
        status: STAGE_FROM_PARTNER_STATUS[a.partner_status as string] ?? "started",
        requested_amount: null,
        funded_amount: a.funded_amount === null ? null : Number(a.funded_amount),
        submitted_at: a.submitted_at,
        funded_at: a.funded_at,
        created_at: a.created_at,
        updated_at: a.last_activity_at,
        referred_by_member_id: a.attributed_member_id,
      }));
      return {
        apps: mapped,
        commissions: (commissions.data ?? []) as AnalyticsCommission[],
        members: members.data ?? [],
      };
    },
  });

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Analytics"
        subtitle="How your submissions convert, what they fund, and who on your team is driving it."
      />
      <PartnerAnalyticsView
        apps={data?.apps ?? []}
        commissions={data?.commissions ?? []}
        members={data?.members ?? []}
        loading={isLoading}
      />
    </PartnerShell>
  );
}
