import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PartnerApplicationTimeline } from "@/components/partner/application-timeline";
import type { TimelineEvent } from "@/components/partner/application-timeline";
import { PartnerFacingStatusBadge } from "@/components/partner/status-badges";
import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import { portalDb } from "@/lib/portal-db";
import { money, shortDate } from "@/lib/partner";
import {
  COMMISSION_STATUS,
  type CommissionStatus,
  type PartnerFacingStatus,
} from "@/lib/partner-portal";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_portal/portal/referrals/$referralId")({
  head: () => ({
    meta: [
      { title: "Referral Detail — Magenta Partner Portal" },
      {
        name: "description",
        content:
          "Follow one referred business through application, review, approval and funding, with its full partner-facing timeline.",
      },
      { property: "og:title", content: "Referral Detail — Magenta Partner Portal" },
      { property: "og:description", content: "One referral, start to finish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralDetailPage,
});

/**
 * Partner-safe columns only: this is the constrained summary view, so
 * banking, credit, requested financials, pricing and internal notes are not
 * reachable from the portal at all.
 */
const SAFE_FIELDS =
  "id, reference, legal_business_name, dba, partner_status, completion_percent, started_at, last_activity_at, submitted_at, funded_amount, funded_at, created_at, attributed_member_id";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

interface CommissionRow {
  id: string;
  amount: number | null;
  rate_percent: number | null;
  status: CommissionStatus;
  scheduled_payment_date: string | null;
  paid_at: string | null;
  created_at: string;
}

function ReferralDetailPage() {
  const { referralId } = Route.useParams();
  /** A manually recorded referral has no application yet. */
  const manualId = referralId.startsWith("manual:") ? referralId.slice("manual:".length) : null;
  const applicationId = manualId ? null : referralId;

  const { data, isLoading } = useQuery({
    queryKey: ["partner-referral-detail", referralId],
    queryFn: async () => {
      const members = await portalDb.from("partner_members").select("id, full_name");

      if (manualId) {
        // The referral may since have been linked to an application; follow it.
        const referral = await portalDb
          .from("partner_referrals")
          .select(
            "id, merchant_business_name, merchant_contact_name, member_id, note, origin, created_at, application_id",
          )
          .eq("id", manualId)
          .maybeSingle();
        if (referral.error) throw new Error(referral.error.message);
        const linkedId = referral.data?.application_id ?? null;
        const linked = linkedId
          ? await portalDb
              .from("partner_application_summary")
              .select(SAFE_FIELDS)
              .eq("id", linkedId)
              .maybeSingle()
          : null;
        return {
          referral: referral.data,
          application: linked?.data ?? null,
          events: [] as TimelineEvent[],
          commissions: [] as CommissionRow[],
          members: members.data ?? [],
        };
      }

      const [app, events, commissions] = await Promise.all([
        portalDb
          .from("partner_application_summary")
          .select(SAFE_FIELDS)
          .eq("id", applicationId!)
          .maybeSingle(),
        portalDb
          .from("partner_application_events")
          .select("id, event_type, title, description, visibility, created_at")
          .eq("application_id", applicationId!)
          .order("created_at", { ascending: true }),
        // One application can fund more than once, so this is a list.
        portalDb
          .from("partner_commissions")
          .select("id, amount, rate_percent, status, scheduled_payment_date, paid_at, created_at")
          .eq("application_id", applicationId!)
          .order("created_at", { ascending: true }),
      ]);
      if (app.error) throw new Error(app.error.message);
      return {
        referral: null,
        application: app.data,
        events: (events.data ?? []) as TimelineEvent[],
        commissions: (commissions.data ?? []) as CommissionRow[],
        members: members.data ?? [],
      };
    },
  });

  const referral = data?.referral ?? null;
  const application = data?.application ?? null;
  const commissions = data?.commissions ?? [];
  const commissionTotal = commissions.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);

  const ownerMemberId = application?.attributed_member_id ?? referral?.member_id ?? null;
  const ownerName = ownerMemberId
    ? (data?.members.find((m) => m.id === ownerMemberId)?.full_name ?? "Organization")
    : "Organization";

  const incomplete =
    application?.partner_status === "application_incomplete" ||
    application?.partner_status === "application_started";

  const title = isLoading
    ? "Loading…"
    : titleCaseName(
        application?.dba ||
          application?.legal_business_name ||
          referral?.merchant_business_name ||
          "Referral",
      );

  const notFound = !isLoading && !application && !referral;

  return (
    <PartnerShell>
      <PortalPageHeader
        back={
          <Link
            to="/portal/referrals"
            className="focus-ring inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All referrals
          </Link>
        }
        title={title}
        subtitle={
          application ? (
            <span className="flex flex-wrap items-center gap-2">
              <PartnerFacingStatusBadge
                status={application.partner_status as PartnerFacingStatus}
              />
              <span>Referred {shortDate(application.started_at ?? application.created_at)}</span>
            </span>
          ) : referral ? (
            <span className="flex flex-wrap items-center gap-2">
              <PartnerFacingStatusBadge status="referred" />
              <span>Recorded {shortDate(referral.created_at)}</span>
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="card-elevated h-72 animate-pulse" />
      ) : notFound ? (
        <div className="card-elevated p-8 text-center">
          <h2 className="font-display text-xl">We couldn't find that referral</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It may belong to another organization, or the link is out of date.
          </p>
          <Button asChild className="mt-5">
            <Link to="/portal/referrals">Back To Referrals</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section aria-label="Referral summary" className="space-y-6">
            <div className="card-elevated p-5">
              <h2 className="font-display text-lg">Summary</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Fact label="Referral owner" value={titleCaseName(ownerName)} />
                <Fact label="Reference" value={application?.reference ?? "—"} />
                {application ? (
                  <>
                    {/* Completion only means something while the merchant is
                        still filling the application in. */}
                    <Fact
                      label="Application completion"
                      value={
                        incomplete ? `${Number(application.completion_percent ?? 0)}%` : "Complete"
                      }
                    />
                    <Fact label="Last updated" value={shortDate(application.last_activity_at)} />
                    <Fact
                      label="Funding amount"
                      value={
                        application.funded_amount ? money(Number(application.funded_amount)) : "—"
                      }
                    />
                    <Fact
                      label="Funded on"
                      value={application.funded_at ? shortDate(application.funded_at) : "—"}
                    />
                  </>
                ) : (
                  <>
                    <Fact label="Recorded" value={shortDate(referral!.created_at)} />
                    <Fact
                      label="Contact"
                      value={
                        referral!.merchant_contact_name
                          ? titleCaseName(referral!.merchant_contact_name)
                          : "—"
                      }
                    />
                    <Fact label="Source" value={titleCaseName(referral!.origin ?? "manual")} />
                  </>
                )}
              </dl>
              {referral?.note ? (
                <p className="mt-4 text-sm text-muted-foreground">{referral.note}</p>
              ) : null}
            </div>

            {!application && referral ? (
              <div className="card-elevated p-5">
                <h2 className="font-display text-lg">No Application Yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You recorded this referral, and it will link up here automatically as soon as
                  the business starts their application through your link.
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/portal/referral-tools">Share Your Link Again</Link>
                </Button>
              </div>
            ) : null}

            {incomplete ? (
              <div className="card-elevated border-gold/45 p-5">
                <div className="flex items-center gap-2">
                  <Clock className="text-gold-foreground h-4 w-4" aria-hidden="true" />
                  <h2 className="font-display text-lg">Application Incomplete</h2>
                </div>
                <p className="mt-1 text-2xl font-display">
                  {Number(application?.completion_percent ?? 0)}% Complete
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The merchant started their application but has not completed all required
                  steps.
                </p>
                <Button className="mt-4" variant="outline" disabled>
                  Send Reminder (coming soon)
                </Button>
              </div>
            ) : null}

            {commissions.length > 0 ? (
              <div className="card-elevated p-5">
                <h2 className="font-display text-lg">
                  {commissions.length > 1 ? "Your Commissions" : "Your Commission"}
                </h2>
                {commissions.length > 1 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {commissions.length} fundings · {money(commissionTotal)} total
                  </p>
                ) : null}
                <ul className="mt-4 space-y-4">
                  {commissions.map((c) => (
                    <li key={c.id} className="border-t border-border/60 pt-4 first:border-0 first:pt-0">
                      <dl className="grid grid-cols-2 gap-4">
                        <Fact label="Amount" value={money(Number(c.amount ?? 0))} />
                        <Fact label="Rate" value={`${Number(c.rate_percent ?? 0)}%`} />
                        <Fact
                          label="Status"
                          value={
                            <ToneBadge
                              label={COMMISSION_STATUS[c.status].label}
                              tone={COMMISSION_STATUS[c.status].tone}
                            />
                          }
                        />
                        <Fact
                          label={c.paid_at ? "Paid" : "Expected payment"}
                          value={
                            c.paid_at
                              ? shortDate(c.paid_at)
                              : c.scheduled_payment_date
                                ? shortDate(c.scheduled_payment_date)
                                : "To be scheduled"
                          }
                        />
                      </dl>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section aria-label="Timeline" className="card-elevated p-5">
            <h2 className="font-display text-lg">Timeline</h2>
            <div className="mt-4">
              {application ? (
                <PartnerApplicationTimeline events={data?.events ?? []} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The timeline begins once the business starts their application.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </PartnerShell>
  );
}
