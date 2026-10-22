import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Copy,
  FileStack,
  Send,
  Sparkles,
  Users2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PartnerKpiCard } from "@/components/partner/kpi-card";
import { PartnerEmptyState } from "@/components/partner/empty-state";
import { ReferBusinessDialog } from "@/components/partner/refer-business-dialog";
import { ReferralToolsCard } from "@/components/partner/referral-tools";
import { PartnerFacingStatusBadge } from "@/components/partner/status-badges";
import { Button } from "@/components/ui/button";
import { funnelCounts, usePartnerReferrals } from "@/hooks/use-partner-referrals";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { portalDb } from "@/lib/portal-db";
import { money, shortDate } from "@/lib/partner";
import { referralLink } from "@/lib/referral-links";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_portal/portal/")({
  validateSearch: (search: Record<string, unknown>): { welcome?: boolean } =>
    search['welcome'] ? { welcome: true } : {},
  head: () => ({
    meta: [
      { title: "Partner Overview — Magenta Partner Portal" },
      {
        name: "description",
        content:
          "See your Magenta referrals at a glance: applications started and submitted, approvals, funded volume and commissions earned.",
      },
      { property: "og:title", content: "Partner Overview — Magenta Partner Portal" },
      {
        property: "og:description",
        content: "Referrals, approvals, funded volume and commissions in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerOverview,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function PartnerOverview() {
  const { welcome } = Route.useSearch();
  const navigate = useNavigate();
  const { data: identity } = usePortalIdentity();
  const member = identity?.member ?? null;
  const org = member?.organization ?? null;
  const isOrgAdmin = member?.role === "organization_admin";
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  const { data: rows, isLoading } = usePartnerReferrals(org?.id);
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ["partner-commission-totals", org?.id],
    enabled: Boolean(org?.id),
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_commissions")
        .select("amount, status, created_at, application_id");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const all = rows ?? [];
  const stages = funnelCounts(all);
  const submitted = all.filter((r) =>
    [
      "application_submitted",
      "under_review",
      "additional_information_needed",
      "approved",
      "funded",
    ].includes(r.partnerStatus),
  );
  const incomplete = all.filter((r) => r.partnerStatus === "application_incomplete");
  const approved = all.filter((r) => ["approved", "funded"].includes(r.partnerStatus));
  const funded = all.filter((r) => r.partnerStatus === "funded");
  const fundedVolume = funded.reduce((s, r) => s + (r.fundedAmount ?? 0), 0);

  const commissionRows = commissions ?? [];
  const earned = commissionRows
    .filter((c) => c.status !== "void")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const pending = commissionRows
    .filter((c) => c.status === "pending" || c.status === "approved" || c.status === "scheduled")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  const firstName = member?.full_name?.split(" ")[0] ?? identity?.email?.split("@")[0] ?? "there";
  const link = org?.code ? referralLink(org.code, member?.code ?? null) : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Couldn't copy — open Referral Tools to copy it manually.");
    }
  }

  const recent = all.slice(0, 6);

  return (
    <PartnerShell>
      <PortalPageHeader
        title={`${greeting()}, ${titleCaseName(firstName)}`}
        subtitle="Here's what's happening with your Magenta referrals."
        actions={
          <>
            <ReferBusinessDialog />
            <Button variant="outline" onClick={() => void copyLink()} disabled={!link}>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy My Referral Link
            </Button>
          </>
        }
      />

      {welcome && !dismissedWelcome ? (
        <section className="card-elevated border-primary/30 mb-6 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-display text-lg">
                Welcome to Magenta, {titleCaseName(firstName)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your referral workspace is ready. Your referral link, QR code, referrals and
                commissions all live here.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/portal/referral-tools">View My Referral Tools</Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDismissedWelcome(true);
                    navigate({ to: "/portal", search: {}, replace: true });
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PartnerKpiCard
          label="Funded Volume"
          value={money(fundedVolume)}
          icon={Wallet}
          tone="brand"
          loading={isLoading}
          hint={`${funded.length} funded`}
        />
        <PartnerKpiCard
          label="Commissions Earned"
          value={money(earned)}
          icon={BadgeDollarSign}
          tone="success"
          loading={commissionsLoading}
        />
        <PartnerKpiCard
          label="Pending Commission"
          value={money(pending)}
          tone="gold"
          loading={commissionsLoading}
          hint="Not yet paid"
        />
        <PartnerKpiCard
          label="Total Referrals"
          value={String(all.length)}
          icon={Users2}
          loading={isLoading}
        />
      </section>

      <section aria-label="Application counts" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PartnerKpiCard
          label="Applications Submitted"
          value={String(submitted.length)}
          icon={FileStack}
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Applications Incomplete"
          value={String(incomplete.length)}
          icon={Clock}
          tone="gold"
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Approved"
          value={String(approved.length)}
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
        />
        <PartnerKpiCard
          label="Funded"
          value={String(funded.length)}
          icon={Wallet}
          tone="brand"
          loading={isLoading}
        />
      </section>

      <section aria-label="Referral funnel" className="mt-6">
        <h2 className="font-display mb-3 text-lg">Referral Funnel</h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {stages.map((stage, i) => (
            <Link
              key={stage.key}
              to="/portal/referrals"
              search={{ stage: stage.key }}
              className="card-elevated focus-ring hover:border-primary/40 flex items-center justify-between gap-2 p-4 transition-colors"
            >
              <div>
                <p className="text-xs text-muted-foreground">{stage.label}</p>
                <p className="font-display mt-1 text-2xl">{stage.count}</p>
              </div>
              {i < stages.length - 1 ? (
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground lg:block" aria-hidden="true" />
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section aria-label="Recent activity">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg">Recent Activity</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/portal/referrals">View All</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="card-elevated h-56 animate-pulse" />
          ) : recent.length === 0 ? (
            <PartnerEmptyState
              icon={Send}
              title="No referrals yet"
              body="Share your referral link to start sending businesses to Magenta."
              action={
                <Button asChild variant="outline">
                  <Link to="/portal/referral-tools">View Referral Tools</Link>
                </Button>
              }
            />
          ) : (
            <ul className="card-elevated divide-y divide-border">
              {recent.map((row) => (
                <li key={row.key} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[10rem] flex-1">
                    {row.applicationId ? (
                      <Link
                        to="/portal/referrals/$referralId"
                        params={{ referralId: row.applicationId }}
                        className="focus-ring rounded font-medium underline-offset-2 hover:underline"
                      >
                        {titleCaseName(row.business)}
                      </Link>
                    ) : (
                      <span className="font-medium">{titleCaseName(row.business)}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {shortDate(row.lastActivity)} · {titleCaseName(row.ownerName)}
                    </p>
                  </div>
                  {row.commissionAmount ? (
                    <span className="text-success text-sm">
                      {money(row.commissionAmount)} commission
                    </span>
                  ) : null}
                  <PartnerFacingStatusBadge status={row.partnerStatus} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Your referral link">
          <h2 className="font-display mb-3 text-lg">Your Referral Link</h2>
          <ReferralToolsCard
            organizationCode={org?.code}
            organizationName={org?.name}
            memberCode={member?.code}
            memberName={member?.full_name}
            active={org?.status === "active" && member?.status === "active"}
            {...(isOrgAdmin ? {} : { lockToMember: true })}
          />
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/portal/referral-tools">Open Referral Tools</Link>
          </Button>
        </section>
      </div>
    </PartnerShell>
  );
}
