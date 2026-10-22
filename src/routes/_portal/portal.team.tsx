import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Copy, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PartnerShell } from "@/components/partner-shell";
import { ReferralToolsCard } from "@/components/partner/referral-tools";
import { PortalPageHeader } from "@/components/partner/page-header";
import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { portalDb } from "@/lib/portal-db";
import { updateTeamMember, type TeamRole } from "@/lib/partner-team.functions";
import {
  createPartnerInvitation,
  ORG_ADMIN_ASSIGNABLE_ROLES,
  resendPartnerInvitation,
  revokePartnerInvitation,
  type CreateInvitationInput,
  type InvitationResult,
  type InviteRole,
} from "@/lib/partner-invitations.functions";
import { MEMBER_ROLE_LABEL, money, shortDate, type PartnerMemberRole } from "@/lib/partner";
import { titleCaseName } from "@/lib/text";

export const Route = createFileRoute("/_portal/portal/team")({
  head: () => ({
    meta: [
      { title: "Team — Magenta Partner Portal" },
      {
        name: "description",
        content:
          "Invite colleagues to your Magenta partner workspace, set their role and manage who can refer businesses on your behalf.",
      },
      { property: "og:title", content: "Team — Magenta Partner Portal" },
      {
        property: "og:description",
        content: "Manage who from your organization can access the Magenta Partner Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamPage,
});

/** Roles an organization admin may assign. Never organization_admin. */
const ASSIGNABLE: TeamRole[] = [...ORG_ADMIN_ASSIGNABLE_ROLES] as TeamRole[];

function TeamPage() {
  const { data: identity } = usePortalIdentity();
  const queryClient = useQueryClient();
  const isOrgAdmin = identity?.member?.role === "organization_admin";

  const { data: members, isLoading } = useQuery({
    queryKey: ["partner-team"],
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_members")
        .select("id, full_name, email, role, status, created_at, user_id, code")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  /**
   * Per-member performance from the partner-safe stats view. The database
   * decides who may read which rows — an org admin sees the whole team, a
   * member sees only their own.
   */
  const { data: stats } = useQuery({
    queryKey: ["partner-member-stats"],
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_member_stats")
        .select(
          "member_id, referral_count, submitted_count, funded_count, funded_volume, commission_earned",
        );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const statFor = (memberId: string) => stats?.find((s) => s.member_id === memberId) ?? null;

  const { data: invitations } = useQuery({
    queryKey: ["partner-invitations"],
    enabled: Boolean(isOrgAdmin),
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_invitations")
        .select("id, invited_email, full_name, intended_role, status, expires_at, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: useServerFn(updateTeamMember),
    onSuccess: async () => {
      toast.success("Team member updated.");
      await queryClient.invalidateQueries({ queryKey: ["partner-team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendFn = useServerFn(resendPartnerInvitation);
  const resend = useMutation({
    mutationFn: (vars: { data: { invitation_id: string } }) =>
      resendFn(vars) as Promise<InvitationResult>,
    onSuccess: async (result) => {
      await copyInviteLink(result.invite_url);
      await queryClient.invalidateQueries({ queryKey: ["partner-invitations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: useServerFn(revokePartnerInvitation),
    onSuccess: async () => {
      toast.success("Invitation withdrawn.");
      await queryClient.invalidateQueries({ queryKey: ["partner-invitations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Team"
        subtitle="Everyone from your organization with access to the Magenta Partner Portal."
        actions={isOrgAdmin ? <InviteDialog /> : null}
      />

      {!isOrgAdmin ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Only an organization admin can invite or change team members.
        </p>
      ) : null}

      {isOrgAdmin && (invitations ?? []).length > 0 ? (
        <section aria-label="Pending invitations" className="mb-6">
          <h2 className="font-display mb-3 text-lg">Pending Invitations</h2>
          <ul className="grid gap-3">
            {(invitations ?? []).map((inv) => (
              <li key={inv.id} className="card-elevated flex flex-wrap items-center gap-3 p-4">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium">{titleCaseName(inv.full_name ?? inv.invited_email)}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.invited_email} · expires {shortDate(inv.expires_at)}
                  </p>
                </div>
                <ToneBadge
                  label={MEMBER_ROLE_LABEL[inv.intended_role as PartnerMemberRole]}
                  tone="muted"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resend.isPending}
                  onClick={() => resend.mutate({ data: { invitation_id: inv.id } })}
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> New Link
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ data: { invitation_id: inv.id } })}
                >
                  Withdraw
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <h2 className="font-display mb-3 text-lg">Team Members</h2>
      {isLoading ? (
        <div className="card-elevated divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-3">
          {(members ?? []).map((m) => (
            <li key={m.id} className="card-elevated p-4">
              <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[12rem] flex-1">
                <p className="font-medium">{titleCaseName(m.full_name)}</p>
                <p className="text-xs text-muted-foreground">
                  {m.email}
                  {m.code ? ` · ${m.code}` : ""}
                </p>
              </div>
              <ToneBadge
                label={MEMBER_ROLE_LABEL[m.role as PartnerMemberRole]}
                tone={m.role === "organization_admin" ? "primary" : "muted"}
              />
              <ToneBadge
                label={m.status === "active" ? "Active" : "Inactive"}
                tone={m.status === "active" ? "success" : "muted"}
              />
              <span className="text-xs text-muted-foreground">
                Joined {shortDate(m.created_at)}
              </span>
              {isOrgAdmin &&
              m.user_id !== identity?.userId &&
              m.role !== "organization_admin" ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Role for ${m.full_name}`}
                    className="focus-ring h-9 rounded-md border border-input bg-card px-2 text-sm"
                    value={m.role}
                    onChange={(e) =>
                      update.mutate({
                        data: { member_id: m.id, role: e.target.value as TeamRole },
                      })
                    }
                  >
                    {/* A role Magenta assigned (e.g. Manager) stays visible so the
                        control never misreports someone's current role. */}
                    {!(ASSIGNABLE as readonly string[]).includes(m.role) ? (
                      <option value={m.role} disabled>
                        {MEMBER_ROLE_LABEL[m.role as PartnerMemberRole]} (set by Magenta)
                      </option>
                    ) : null}
                    {ASSIGNABLE.map((r) => (
                      <option key={r} value={r}>
                        {MEMBER_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update.mutate({
                        data: {
                          member_id: m.id,
                          status: m.status === "active" ? "inactive" : "active",
                        },
                      })
                    }
                  >
                    {m.status === "active" ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              ) : null}
              </div>

              <MemberStats stat={statFor(m.id)} />

              {m.code && identity?.member?.organization?.code ? (
                <MemberLink
                  memberName={titleCaseName(m.full_name)}
                  memberCode={m.code}
                  organizationCode={identity.member.organization.code}
                  organizationName={identity.member.organization.name}
                  active={
                    m.status === "active" &&
                    identity.member.organization.status === "active"
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PartnerShell>
  );
}

interface MemberStat {
  referral_count: number | null;
  submitted_count: number | null;
  funded_count: number | null;
  funded_volume: number | null;
  commission_earned: number | null;
}

/** Referral performance for one seat, from the partner-safe stats view. */
function MemberStats({ stat }: { stat: MemberStat | null }) {
  if (!stat) return null;
  const items: Array<[string, string]> = [
    ["Referrals", String(stat.referral_count ?? 0)],
    ["Submitted", String(stat.submitted_count ?? 0)],
    ["Funded", String(stat.funded_count ?? 0)],
    ["Funded volume", money(Number(stat.funded_volume ?? 0))],
    ["Commission", money(Number(stat.commission_earned ?? 0))],
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-display text-base">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Collapsible personal referral link and QR code for one team member. */
function MemberLink({
  memberName,
  memberCode,
  organizationCode,
  organizationName,
  active,
}: {
  memberName: string;
  memberCode: string;
  organizationCode: string;
  organizationName: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-primary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {open ? "Hide" : "Show"} referral link &amp; QR for {memberName}
      </button>
      {open ? (
        <div className="mt-3">
          <ReferralToolsCard
            organizationCode={organizationCode}
            organizationName={organizationName}
            memberCode={memberCode}
            memberName={memberName}
            active={active}
            lockToMember
          />
        </div>
      ) : null}
    </div>
  );
}

/** Copies the full invitation URL, which is only ever shown once. */
async function copyInviteLink(path: string) {
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Invitation link copied — send it to your colleague.");
  } catch {
    toast.message("Invitation link", { description: url });
  }
}

function InviteDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "referral_rep" as InviteRole,
  });

  const inviteFn = useServerFn(createPartnerInvitation);
  const invite = useMutation({
    mutationFn: (vars: { data: CreateInvitationInput }) =>
      inviteFn(vars) as Promise<InvitationResult>,
    onSuccess: async (result) => {
      setLink(`${window.location.origin}${result.invite_url}`);
      await copyInviteLink(result.invite_url);
      await queryClient.invalidateQueries({ queryKey: ["partner-invitations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setLink(null);
          setForm({ full_name: "", email: "", role: "referral_rep" });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Team Member</DialogTitle>
          <DialogDescription>
            They'll set their own password and get their own referral link. Only Magenta can add
            another organization admin.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send this one-time invitation link. It works for seven days and can only be used
              once.
            </p>
            <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => void copyInviteLink(link.replace(window.location.origin, ""))}
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy Again
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate({ data: form });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="member-name">Full name</Label>
              <Input
                id="member-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="member-role">Role</Label>
              <select
                id="member-role"
                className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as InviteRole })}
              >
                {ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Creating…" : "Create Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
