import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PortalGuard } from "@/components/partner/portal-guard";
import { PartnerApplicationTable } from "@/components/partner/application-table";
import type { ApplicationRow } from "@/components/partner/application-table";
import { NewMemberDialog } from "@/components/partner/new-member-dialog";
import { PartnerStatusBadge } from "@/components/partner/status-badges";
import { PartnerAnalyticsView } from "@/components/partner/analytics-view";
import {
  CommissionList,
  exportCommissionsCsv,
  type CommissionRow,
} from "@/components/partner/commission-table";
import { PartnerKpiCard } from "@/components/partner/kpi-card";
import { currency, type CommissionStatus } from "@/lib/partner-portal";
import { Download } from "lucide-react";
import type { AnalyticsApplication, AnalyticsCommission } from "@/lib/partner-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { startPartnerView } from "@/lib/partner-view.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMBER_ROLE_LABEL,
  PARTNER_TYPE_LABEL,
  money,
  shortDate,
  type PartnerMemberRole,
  type PartnerOrgStatus,
  type PartnerType,
} from "@/lib/partner";
import { titleCaseName } from "@/lib/text";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/partners/$organizationId")({
  head: () => ({
    meta: [
      { title: "Partner Organization — Magenta Portal" },
      {
        name: "description",
        content:
          "Internal profile for a Magenta partner organization: members, applications, funded volume and activity.",
      },
      { property: "og:title", content: "Partner Organization — Magenta Portal" },
      {
        property: "og:description",
        content: "Members, applications and funded volume for a Magenta partner organization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">
        We couldn't load this organization.{" "}
        <Link className="underline" to="/partners">
          Back to Partner Network
        </Link>
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">That organization no longer exists.</p>
    </AppShell>
  ),
  component: () => (
    <PortalGuard audience="internal">
      <OrganizationDetail />
    </PortalGuard>
  ),
});

const TABS = ["Overview", "Members", "Applications", "Commissions", "Analytics"] as const;
type Tab = (typeof TABS)[number];

function OrganizationDetail() {
  const { organizationId } = Route.useParams();
  const { data: identity } = usePortalIdentity();
  const [tab, setTab] = useState<Tab>("Overview");

  const { data, isLoading } = useQuery({
    queryKey: ["partner-organization", organizationId],
    queryFn: async () => {
      const [org, members, apps, commissions] = await Promise.all([
        supabase
          .from("partner_organizations")
          .select("*")
          .eq("id", organizationId)
          .maybeSingle(),
        supabase
          .from("partner_members")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at"),
        supabase
          .from("partner_applications")
          .select(
            "id, reference, legal_business_name, dba, status, requested_amount, approved_amount, funded_amount, commission_amount, submitted_at, funded_at, created_at, updated_at, contact_first_name, contact_last_name, partner_status, completion_percent, referred_by_member_id",
          )
          .eq("organization_id", organizationId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("partner_commissions")
          .select(
            "id, amount, rate_percent, funded_amount, status, paid_at, payment_reference, note, organization_id, application_id, created_at, application:partner_applications(reference, legal_business_name)",
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }),
      ]);
      if (org.error) throw new Error(org.error.message);
      return {
        org: org.data,
        members: members.data ?? [],
        apps: (apps.data ?? []) as unknown as (ApplicationRow & AnalyticsApplication)[],
        commissions: (commissions.data ?? []) as unknown as (CommissionRow &
          AnalyticsCommission)[],
      };
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="card-elevated mt-6 h-64 animate-pulse" />
      </AppShell>
    );
  }

  const org = data?.org;
  if (!org) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Organization not found.</p>
      </AppShell>
    );
  }

  const apps = data.apps;
  const funded = apps.filter((a) => a.status === "funded");

  return (
    <AppShell>
      <PortalPageHeader
        title={titleCaseName(org.name)}
        subtitle={`${PARTNER_TYPE_LABEL[org.partner_type as PartnerType]}${
          org.legal_name ? ` · ${org.legal_name}` : ""
        }`}
        back={
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/partners">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Partner Network
            </Link>
          </Button>
        }
        actions={
          <>
            <PartnerStatusBadge status={org.status as PartnerOrgStatus} />
            {identity?.isAdmin ? (
              <NewMemberDialog
                organizationId={org.id}
                organizationName={titleCaseName(org.name)}
                defaultRole={data.members.length ? "broker" : "organization_admin"}
              />
            ) : null}
          </>
        }
      />

      <section aria-label="Summary" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Applications" value={String(apps.length)} />
        <Metric label="Funded" value={String(funded.length)} />
        <Metric
          label="Funded Volume"
          value={money(funded.reduce((s, a) => s + Number(a.funded_amount ?? 0), 0))}
        />
        <Metric
          label="Commission"
          value={money(funded.reduce((s, a) => s + Number(a.commission_amount ?? 0), 0))}
        />
      </section>

      <div role="tablist" aria-label="Organization sections" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "focus-ring min-h-11 rounded-full border px-4 text-sm",
              tab === t
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent/50",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Overview" ? (
          <div className="card-elevated p-5">
            <h2 className="font-display text-lg">Organization</h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              {(
                [
                  ["Primary Contact", org.primary_contact_name ?? "—"],
                  ["Contact Email", org.primary_contact_email ?? "—"],
                  ["Phone", org.phone ?? "—"],
                  ["Website", org.website ?? "—"],
                  ["Referral Slug", org.slug],
                  ["Created", shortDate(org.created_at)],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {identity?.isAdmin ? (
              <CommissionRateControl
                organizationId={org.id}
                rate={Number(org.commission_rate_percent ?? 0)}
              />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Commission rate: {Number(org.commission_rate_percent ?? 0)}%
              </p>
            )}
          </div>
        ) : null}

        {tab === "Members" ? (
          data.members.length ? (
            <ul className="card-elevated divide-y divide-border">
              {data.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {MEMBER_ROLE_LABEL[m.role as PartnerMemberRole]}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{m.status}</span>
                  {identity?.isAdmin && m.status === "active" ? (
                    <ViewAsPartnerButton
                      memberId={m.id}
                      name={m.full_name}
                      role={m.role as PartnerMemberRole}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-elevated p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No members have been added to this organization yet.
              </p>
            </div>
          )
        ) : null}

        {tab === "Applications" ? <PartnerApplicationTable rows={apps} /> : null}

        {tab === "Commissions" ? (
          <OrganizationCommissions
            organizationId={organizationId}
            organizationName={org.name}
            rows={data.commissions}
            isAdmin={Boolean(identity?.isAdmin)}
          />
        ) : null}

        {tab === "Analytics" ? (
          <PartnerAnalyticsView
            apps={apps}
            commissions={data.commissions}
            members={data.members.map((m) => ({ id: m.id, full_name: m.full_name }))}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

/**
 * Opens the partner portal as this person, read-only, without signing the
 * Magenta administrator out. The effective identity lives server-side.
 */
function ViewAsPartnerButton({
  memberId,
  name,
  role,
}: {
  memberId: string;
  name: string;
  role: PartnerMemberRole;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await startPartnerView({
            data: { memberId, returnPath: window.location.pathname },
          });
          window.location.href = "/portal";
        } catch (error) {
          toast.error((error as Error).message);
          setBusy(false);
        }
      }}
    >
      <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      {role === "organization_admin" ? "View As Org Admin" : "View As"}
      <span className="sr-only"> {name}</span>
    </Button>
  );
}

/** Every commission this partner has earned, with the same admin controls as /commissions. */
function OrganizationCommissions({
  organizationId,
  organizationName,
  rows,
  isAdmin,
}: {
  organizationId: string;
  organizationName: string;
  rows: CommissionRow[];
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const orgName = () => organizationName;
  const sum = (status: CommissionStatus) =>
    rows.filter((r) => r.status === status).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div>
      <section aria-label="Commission totals" className="grid gap-3 sm:grid-cols-3">
        <PartnerKpiCard label="Pending" value={currency(sum("pending"))} tone="gold" />
        <PartnerKpiCard label="Approved" value={currency(sum("approved"))} tone="brand" />
        <PartnerKpiCard label="Paid" value={currency(sum("paid"))} tone="success" />
      </section>

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={rows.length === 0}
          onClick={() => exportCommissionsCsv(rows, "partner-commissions", orgName)}
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
        </Button>
      </div>

      <div className="mt-4">
        <CommissionList
          rows={rows}
          isAdmin={isAdmin}
          orgName={orgName}
          enableBulk
          emptyMessage="This partner hasn't earned a commission yet."
          onRefresh={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["partner-organization", organizationId],
            });
          }}
        />
      </div>
    </div>
  );
}

/** Admin-only commission rate, applied to every future funded application. */
function CommissionRateControl({
  organizationId,
  rate,
}: {
  organizationId: string;
  rate: number;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(rate));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("partner_set_commission_rate", {
        _organization_id: organizationId,
        _rate: Number(value),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Commission rate updated.");
      await queryClient.invalidateQueries({ queryKey: ["partner-organization", organizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-sm font-medium">Commission Rate</p>
      <p className="text-xs text-muted-foreground">
        Applied automatically when an application from this organization funds. Existing
        commissions keep their original rate unless adjusted.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-24"
          inputMode="decimal"
          aria-label="Commission rate percent"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save Rate"}
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
