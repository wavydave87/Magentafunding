import { createFileRoute } from "@tanstack/react-router";
import { Building2, Info } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ReferralToolsCard } from "@/components/partner/referral-tools";
import { usePortalIdentity } from "@/hooks/use-portal-identity";

export const Route = createFileRoute("/_portal/portal/referral-tools")({
  head: () => ({
    meta: [
      { title: "Referral Tools — Magenta Partner Portal" },
      {
        name: "description",
        content:
          "Copy your personalized Magenta application link, generate a QR code for print or mobile, and preview exactly what a merchant sees.",
      },
      { property: "og:title", content: "Referral Tools — Magenta Partner Portal" },
      {
        property: "og:description",
        content: "Your personal referral link and QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralToolsPage,
});

function ReferralToolsPage() {
  const { data: identity } = usePortalIdentity();
  const member = identity?.member ?? null;
  const org = member?.organization ?? null;
  const isOrgAdmin = member?.role === "organization_admin";
  const active = org?.status === "active" && member?.status === "active";

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Referral Tools"
        subtitle="Share your personalized Magenta application link with businesses you refer."
      />

      <div className="space-y-6">
        <div>
          <h2 className="font-display mb-3 text-lg">Your Personal Referral Link</h2>
          <ReferralToolsCard
            organizationCode={org?.code}
            organizationName={org?.name}
            memberCode={member?.code}
            memberName={member?.full_name}
            active={Boolean(active)}
            lockToMember
          />
        </div>

        <div className="card-elevated flex gap-3 p-5">
          <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base">How attribution works</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Businesses that apply through your link or QR code are automatically attributed to
              you and your organization. Your code never changes, so printed QR codes and old
              emails keep crediting you.
            </p>
          </div>
        </div>

        {isOrgAdmin ? (
          <div className="border-plum/25 bg-plum/5 rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="text-plum h-4 w-4" aria-hidden="true" />
              <h2 className="font-display text-lg">Organization Referral Link</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Use this on your website or shared marketing. Applications are credited to{" "}
              {org?.name ?? "your organization"} rather than an individual.
            </p>
            <ReferralToolsCard
              organizationCode={org?.code}
              organizationName={org?.name}
              memberCode={null}
              memberName={null}
              active={Boolean(active)}
              lockToMember
            />
          </div>
        ) : null}
      </div>
    </PartnerShell>
  );
}
