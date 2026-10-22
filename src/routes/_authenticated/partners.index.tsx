import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { NewOrganizationDialog } from "@/components/partner/new-organization-dialog";
import { PortalGuard } from "@/components/partner/portal-guard";
import { PartnerStatusBadge } from "@/components/partner/status-badges";
import { Input } from "@/components/ui/input";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import {
  PARTNER_TYPE_LABEL,
  money,
  shortDate,
  type PartnerOrgStatus,
  type PartnerType,
} from "@/lib/partner";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_authenticated/partners/")({
  head: () => ({
    meta: [
      { title: "Partner Network — Magenta Portal" },
      {
        name: "description",
        content:
          "Internal view of every ISO, referral and strategic partner organization, their pipeline and funded volume.",
      },
      { property: "og:title", content: "Partner Network — Magenta Portal" },
      {
        property: "og:description",
        content: "Every partner organization, their pipeline and funded volume.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <PartnerNetwork />
    </PortalGuard>
  ),
});

function PartnerNetwork() {
  const { data: identity } = usePortalIdentity();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PartnerOrgStatus>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["partner-network"],
    queryFn: async () => {
      const [orgs, apps, reps] = await Promise.all([
        supabase.from("partner_organizations").select("*").order("name"),
        supabase
          .from("partner_applications")
          .select("organization_id, status, requested_amount, funded_amount, commission_amount"),
        supabase.from("rep_profiles").select("id, full_name"),
      ]);
      if (orgs.error) throw new Error(orgs.error.message);
      return { orgs: orgs.data ?? [], apps: apps.data ?? [], reps: reps.data ?? [] };
    },
  });

  const rows = useMemo(() => {
    const orgs = data?.orgs ?? [];
    const apps = data?.apps ?? [];
    const repName = new Map((data?.reps ?? []).map((r) => [r.id, r.full_name]));

    return orgs
      .map((org) => {
        const mine = apps.filter((a) => a.organization_id === org.id);
        const funded = mine.filter((a) => a.status === "funded");
        return {
          org,
          rep: org.assigned_rep_id ? (repName.get(org.assigned_rep_id) ?? "—") : "—",
          applications: mine.length,
          approved: mine.filter((a) =>
            ["approved", "contract_signed", "contract_sent", "funded"].includes(a.status),
          ).length,
          funded: funded.length,
          fundedVolume: funded.reduce((s, a) => s + Number(a.funded_amount ?? 0), 0),
          commission: funded.reduce((s, a) => s + Number(a.commission_amount ?? 0), 0),
        };
      })
      .filter((r) => (status === "all" ? true : r.org.status === status))
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [r.org.name, r.org.legal_name ?? "", r.org.primary_contact_name ?? "", r.rep]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [data, query, status]);

  return (
    <AppShell>
      <PortalPageHeader
        title="Partner Network"
        subtitle={isLoading ? "Loading…" : `${rows.length} partner organizations`}
        actions={identity?.isAdmin ? <NewOrganizationDialog reps={data?.reps ?? []} /> : null}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[15rem] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organization, contact or assigned rep"
            aria-label="Search partner organizations"
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Filter by partner status"
          className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="restricted">Restricted</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="card-elevated mt-5 divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card-elevated mt-5 p-10 text-center">
          <p className="text-sm text-muted-foreground">No partner organizations match.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card-elevated mt-5 hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Primary Contact</th>
                  <th className="px-4 py-3">Assigned Rep</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Apps</th>
                  <th className="px-4 py-3 text-right">Approved</th>
                  <th className="px-4 py-3 text-right">Funded</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.org.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/partners/$organizationId"
                        params={{ organizationId: r.org.id }}
                        className="focus-ring font-medium underline-offset-2 hover:underline"
                      >
                        {titleCaseName(r.org.name)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {PARTNER_TYPE_LABEL[r.org.partner_type as PartnerType]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.org.primary_contact_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.rep}</td>
                    <td className="px-4 py-3">
                      <PartnerStatusBadge status={r.org.status as PartnerOrgStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">{r.applications}</td>
                    <td className="px-4 py-3 text-right">{r.approved}</td>
                    <td className="px-4 py-3 text-right">{r.funded}</td>
                    <td className="px-4 py-3 text-right">{money(r.fundedVolume)}</td>
                    <td className="px-4 py-3 text-right">{money(r.commission)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {shortDate(r.org.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet */}
          <ul className="mt-5 grid gap-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.org.id} className="card-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/partners/$organizationId"
                      params={{ organizationId: r.org.id }}
                      className="focus-ring font-display text-lg underline-offset-2 hover:underline"
                    >
                      {titleCaseName(r.org.name)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {PARTNER_TYPE_LABEL[r.org.partner_type as PartnerType]} · {r.rep}
                    </p>
                  </div>
                  <PartnerStatusBadge status={r.org.status as PartnerOrgStatus} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Stat label="Apps" value={String(r.applications)} />
                  <Stat label="Funded" value={String(r.funded)} />
                  <Stat label="Volume" value={money(r.fundedVolume)} />
                  <Stat label="Commission" value={money(r.commission)} />
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
