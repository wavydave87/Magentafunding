import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ApplicationStatusBadge, DocumentStatusBadge } from "@/components/partner/status-badges";
import { PartnerApplicationTimeline } from "@/components/partner/application-timeline";
import { InternalApplicationControls } from "@/components/partner/internal-application-controls";
import { Button } from "@/components/ui/button";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES, money, shortDate } from "@/lib/partner";
import type { ApplicationStatus, DocumentStatus } from "@/lib/partner";
import { titleCaseName } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Internal only. This page shows underwriting, financial and document detail,
 * so it is never rendered inside the partner portal — partners get the
 * referral detail built from the constrained partner-safe view.
 */
export type ApplicationDetailVariant = "internal";

export function ApplicationDetailShell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/partners">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Partner Network
      </Link>
    </Button>
  );
}

const TABS = [
  "Overview",
  "Business",
  "Owners",
  "Financials",
  "Documents",
  "Offers",
  "Activity",
] as const;
type Tab = (typeof TABS)[number];

export function ApplicationDetail({
  applicationId,
}: {
  applicationId: string;
  /** Kept for call-site clarity; this page is internal only. */
  variant?: ApplicationDetailVariant;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [notifying, setNotifying] = useState(false);
  const queryClient = useQueryClient();
  const { data: identity } = usePortalIdentity();

  const { data, isLoading } = useQuery({
    queryKey: ["partner-application", applicationId],
    queryFn: async () => {
      const [app, owners, docs, events] = await Promise.all([
        supabase.from("partner_applications").select("*").eq("id", applicationId).maybeSingle(),
        supabase
          .from("partner_application_owners")
          .select("*")
          .eq("application_id", applicationId)
          .order("sort_order"),
        supabase
          .from("partner_documents")
          .select("*")
          .eq("application_id", applicationId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("partner_application_events")
          .select("*")
          .eq("application_id", applicationId)
          .order("created_at", { ascending: false }),
      ]);
      if (app.error) throw new Error(app.error.message);
      return {
        app: app.data,
        owners: owners.data ?? [],
        docs: docs.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  /** Status moves are database-controlled; partners go through this RPC. */
  async function markInformationProvided() {
    setNotifying(true);
    const { error } = await supabase.rpc("partner_information_provided", {
      _application_id: applicationId,
    });
    setNotifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["partner-application", applicationId] });
    toast.success("Magenta has been notified that your items are in.");
  }

  async function download(path: string, name: string) {
    const { data: signed, error } = await supabase.storage
      .from("partner-documents")
      .createSignedUrl(path, 60);
    if (error || !signed) {
      toast.error("Could not prepare that download.");
      return;
    }
    const a = document.createElement("a");
    a.href = signed.signedUrl;
    a.download = name;
    a.click();
  }

  if (isLoading) {
    return (
      <ApplicationDetailShell>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="card-elevated mt-6 h-64 animate-pulse" />
      </ApplicationDetailShell>
    );
  }

  const app = data?.app;
  if (!app) {
    return (
      <ApplicationDetailShell>
        <p className="text-sm text-muted-foreground">Application not found.</p>
      </ApplicationDetailShell>
    );
  }

  const status = app.status as ApplicationStatus;

  return (
    <ApplicationDetailShell>
      <PortalPageHeader
        back={<BackLink />}
        title={titleCaseName(app.legal_business_name)}
        subtitle={`${app.reference}${app.dba ? ` · DBA ${titleCaseName(app.dba)}` : ""}`}
        actions={<ApplicationStatusBadge status={status} />}
      />

      {status === "missing_information" ? (
        <div className="card-revision mt-5 flex gap-3 rounded-xl p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-coral" aria-hidden="true" />
          <div>
            <p className="font-display text-lg">Additional Information Is Needed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Magenta has requested more detail before underwriting can continue. Check the activity
              timeline for the specific items, then upload them below.
            </p>
            {(app.missing_items ?? []).length ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                {(app.missing_items as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTab("Documents")}>
                Upload Requested Items
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={notifying}
                onClick={() => void markInformationProvided()}
              >
                {notifying ? "Sending…" : "I've Provided Everything"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {identity?.isInternal ? (
        <InternalApplicationControls
          app={{
            id: app.id,
            status,
            requested_amount: app.requested_amount,
            approved_amount: app.approved_amount,
            funded_amount: app.funded_amount,
            linked_deal_id: app.linked_deal_id,
            legal_business_name: app.legal_business_name,
          }}
        />
      ) : null}

      <section aria-label="Summary" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Requested" value={money(app.requested_amount)} />
        <Metric label="Approved" value={money(app.approved_amount)} />
        <Metric label="Funded" value={money(app.funded_amount)} />
        <Metric label="Commission" value={money(app.commission_amount)} />
      </section>

      <div role="tablist" aria-label="Application sections" className="mt-6 flex flex-wrap gap-2">
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="At A Glance"
              rows={[
                ["Status", app.status.replace(/_/g, " ")],
                ["Submitted", shortDate(app.submitted_at)],
                ["Last Updated", shortDate(app.updated_at)],
                ["Source", app.source ?? "Portal"],
                [
                  "Contact",
                  [app.contact_first_name, app.contact_last_name].filter(Boolean).join(" ") || "—",
                ],
                ["Contact Email", app.contact_email ?? "—"],
                ["Contact Phone", app.contact_phone ?? "—"],
              ]}
            />
            <div className="card-elevated p-5">
              <h2 className="font-display text-lg">Recent Activity</h2>
              <div className="mt-3">
                <PartnerApplicationTimeline events={data.events.slice(0, 5)} />
              </div>
            </div>
          </div>
        ) : null}

        {tab === "Business" ? (
          <Panel
            title="Business"
            rows={[
              ["Legal Name", titleCaseName(app.legal_business_name)],
              ["DBA", app.dba ? titleCaseName(app.dba) : "—"],
              [
                "Address",
                [app.business_address, app.address_2, app.city, app.state, app.zip]
                  .filter(Boolean)
                  .join(", ") || "—",
              ],
              ["Legal Entity", app.legal_entity ?? "—"],
              ["State Incorporated", app.state_incorporated ?? "—"],
              ["Business Started", shortDate(app.date_business_started)],
              ["Industry", app.industry ?? "—"],
              ["NAICS", app.naics_code ?? "—"],
              ["Website", app.website ?? "—"],
              ["Home Based", app.home_based_business ? "Yes" : "No"],
              ["Description", app.business_description ?? "—"],
            ]}
          />
        ) : null}

        {tab === "Owners" ? (
          data.owners.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.owners.map((o) => (
                <Panel
                  key={o.id}
                  title={`${o.first_name} ${o.last_name}`.trim() || "Owner"}
                  rows={[
                    ["Title", o.title ?? "—"],
                    ["Ownership", o.ownership_percent ? `${o.ownership_percent}%` : "—"],
                    ["Email", o.email ?? "—"],
                    ["Phone", o.phone ?? "—"],
                    [
                      "Address",
                      [o.home_address, o.city, o.state, o.zip].filter(Boolean).join(", ") || "—",
                    ],
                  ]}
                />
              ))}
            </div>
          ) : (
            <Empty message="No owners recorded on this application." />
          )
        ) : null}

        {tab === "Financials" ? (
          <Panel
            title="Financing"
            rows={[
              ["Requested Amount", money(app.requested_amount)],
              ["Average Monthly Revenue", money(app.average_monthly_revenue)],
              ["Use Of Funds", app.use_of_funds ?? "—"],
              ["Existing Positions", app.existing_positions ?? "—"],
              ["Current Balances", money(app.existing_balances)],
              ["Funding History", app.funding_history ?? "—"],
              ["Bank Verification", app.banking_connected ? "Connected" : "Not connected"],
            ]}
          />
        ) : null}

        {tab === "Documents" ? (
          data.docs.length ? (
            <ul className="card-elevated divide-y divide-border">
              {data.docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ?? "Other"} ·{" "}
                      {shortDate(d.uploaded_at)}
                    </p>
                  </div>
                  <DocumentStatusBadge status={d.status as DocumentStatus} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void download(d.storage_path, d.file_name)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Download
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty message="No documents on this application yet." />
          )
        ) : null}

        {tab === "Offers" ? (
          app.linked_deal_id ? (
            <Panel
              title="Offer"
              rows={[
                ["Offer Status", app.status === "funded" ? "Funded" : "Available"],
                ["Approved Amount", money(app.approved_amount)],
                ["Funded Amount", money(app.funded_amount)],
              ]}
            />
          ) : (
            <Empty message="No offer has been issued for this application yet." />
          )
        ) : null}

        {tab === "Activity" ? (
          <div className="card-elevated p-5">
            <PartnerApplicationTimeline events={data.events} />
          </div>
        ) : null}
      </div>
    </ApplicationDetailShell>
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

function Panel({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="card-elevated p-5">
      <h2 className="font-display text-lg">{title}</h2>
      <dl className="mt-3 divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-2 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right capitalize">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="card-elevated p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
