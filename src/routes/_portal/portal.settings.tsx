import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import { portalDb, portalAction, isPartnerViewActive } from "@/lib/portal-db";
import { PARTNER_TYPE_LABEL } from "@/lib/partner";
import { updateOrganizationContact } from "@/lib/partner-team.functions";

export const Route = createFileRoute("/_portal/portal/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Magenta Portal" },
      {
        name: "description",
        content:
          "Manage your Magenta Portal profile, review your organization details and choose which updates you receive.",
      },
      { property: "og:title", content: "Settings — Magenta Portal" },
      {
        property: "og:description",
        content: "Profile, organization details and notification preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

interface Prefs {
  application_updates: boolean;
  commission_updates: boolean;
  missing_information: boolean;
  training_updates: boolean;
}

const PREF_LABELS: { key: keyof Prefs; label: string; hint: string }[] = [
  {
    key: "application_updates",
    label: "Application Updates",
    hint: "Status changes on applications your organization submitted.",
  },
  {
    key: "commission_updates",
    label: "Commission Updates",
    hint: "When a commission is created, approved or paid.",
  },
  {
    key: "missing_information",
    label: "Missing Information",
    hint: "When Magenta needs more detail before underwriting can continue.",
  },
  {
    key: "training_updates",
    label: "Training",
    hint: "New training modules and partner resources.",
  },
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: identity } = usePortalIdentity();
  const member = identity?.member ?? null;
  const org = member?.organization ?? null;
  const canEditOrganization = member?.role === "organization_admin";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const saveOrgContact = useServerFn(updateOrganizationContact);

  const { data: profile } = useQuery({
    queryKey: ["portal-my-member", member?.id],
    enabled: Boolean(member?.id),
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_members")
        .select("id, full_name, email, phone, role")
        .eq("id", member!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: orgDetail } = useQuery({
    queryKey: ["portal-my-org", org?.id],
    enabled: Boolean(org?.id),
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_organizations")
        .select(
          "id, name, partner_type, primary_contact_name, primary_contact_email, phone, website, assigned_rep_id, rep:rep_profiles(full_name, email)",
        )
        .eq("id", org!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ["portal-notification-prefs"],
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_notification_preferences")
        .select("application_updates, commission_updates, missing_information, training_updates")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (
        data ?? {
          application_updates: true,
          commission_updates: true,
          missing_information: true,
          training_updates: true,
        }
      );
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (orgDetail) {
      setOrgName(orgDetail.primary_contact_name ?? "");
      setOrgEmail(orgDetail.primary_contact_email ?? "");
      setOrgPhone(orgDetail.phone ?? "");
      setOrgWebsite(orgDetail.website ?? "");
    }
  }, [orgDetail]);

  async function saveProfile() {
    if (!member) return;
    setSavingProfile(true);
    const { error } = await portalDb
      .from("partner_members")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", member.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["portal-my-member", member.id] });
    await queryClient.invalidateQueries({ queryKey: ["portal-identity"] });
    toast.success("Profile updated.");
  }

  /** Org contact edits go through a server function; partners cannot write this table directly. */
  async function saveOrganization() {
    setSavingOrg(true);
    try {
      await portalAction({ action: "update_organization_contact", payload: {
        primary_contact_name: orgName, primary_contact_email: orgEmail, phone: orgPhone, website: orgWebsite,
      } }, () => saveOrgContact({
        data: {
          primary_contact_name: orgName,
          primary_contact_email: orgEmail,
          phone: orgPhone,
          website: orgWebsite,
        },
      }));
      await queryClient.invalidateQueries({ queryKey: ["portal-my-org", org?.id] });
      toast.success("Organization details updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save those details.");
    } finally {
      setSavingOrg(false);
    }
  }

  async function changePassword() {
    if (isPartnerViewActive()) { toast.error("Account security changes require the partner's own sign-in."); return; }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Those passwords don't match.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  }

  /** Ends every other signed-in session, leaving this one active. */
  async function signOutOtherDevices() {
    if (isPartnerViewActive()) { toast.error("Account security changes require the partner's own sign-in."); return; }
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out everywhere else.");
  }

  async function togglePref(key: keyof Prefs, value: boolean) {
    if (!identity?.userId) return;
    const next = { ...(prefs as Prefs), [key]: value };
    queryClient.setQueryData(["portal-notification-prefs"], next);
    const { error } = await portalDb.from("partner_notification_preferences").upsert(
      {
        user_id: identity.userId,
        organization_id: org?.id ?? null,
        ...next,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      toast.error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["portal-notification-prefs"] });
    }
  }

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Settings"
        subtitle="Your profile, your organization on file with Magenta, and what we notify you about."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Profile" className="card-elevated p-5">
          <h2 className="font-display text-lg">Profile</h2>
          <p className="text-xs text-muted-foreground">
            Your name and phone are visible to your team and your Magenta rep.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={profile?.email ?? identity?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email is your sign-in and can only be changed by Magenta.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button disabled={savingProfile} onClick={() => void saveProfile()}>
              {savingProfile ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </section>

        <section aria-label="Organization" className="card-elevated p-5">
          <h2 className="font-display text-lg">Organization</h2>
          <p className="text-xs text-muted-foreground">
            {canEditOrganization
              ? "You can keep your contact details current. Ask your Magenta rep to change anything else."
              : "Organization details are managed by your organization admin and Magenta."}
          </p>
          <dl className="mt-4 divide-y divide-border text-sm">
            <Row label="Organization Name" value={orgDetail?.name ?? org?.name ?? "—"} />
            <Row
              label="Partner Type"
              value={
                orgDetail?.partner_type
                  ? (PARTNER_TYPE_LABEL[orgDetail.partner_type as keyof typeof PARTNER_TYPE_LABEL] ??
                    orgDetail.partner_type)
                  : "—"
              }
            />
            {!canEditOrganization ? (
              <Row
                label="Primary Contact"
                value={
                  [orgDetail?.primary_contact_name, orgDetail?.primary_contact_email]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
            ) : null}
            <Row
              label="Assigned Magenta Rep"
              value={
                orgDetail?.rep
                  ? [orgDetail.rep.full_name, orgDetail.rep.email].filter(Boolean).join(" · ")
                  : "Not yet assigned"
              }
            />
          </dl>

          {canEditOrganization ? (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="org-contact-name">Primary Contact Name</Label>
                <Input
                  id="org-contact-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-contact-email">Primary Contact Email</Label>
                <Input
                  id="org-contact-email"
                  type="email"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Organization Phone</Label>
                  <Input
                    id="org-phone"
                    type="tel"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-website">Website</Label>
                  <Input
                    id="org-website"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                  />
                </div>
              </div>
              <Button disabled={savingOrg} onClick={() => void saveOrganization()}>
                {savingOrg ? "Saving…" : "Save Organization Details"}
              </Button>
            </div>
          ) : null}
        </section>

        <section aria-label="Security" className="card-elevated p-5 lg:col-span-2">
          <h2 className="font-display text-lg">Security</h2>
          <p className="text-xs text-muted-foreground">
            Your sign-in is managed by Magenta's authentication service.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={savingPassword} onClick={() => void changePassword()}>
              {savingPassword ? "Updating…" : "Update Password"}
            </Button>
            <Button variant="outline" onClick={() => void signOutOtherDevices()}>
              Sign Out Other Devices
            </Button>
          </div>
        </section>

        <section aria-label="Notifications" className="card-elevated p-5 lg:col-span-2">
          <h2 className="font-display text-lg">Notifications</h2>
          <p className="text-xs text-muted-foreground">
            These choices configure future delivery. Email and text notifications are not switched
            on yet, so today you'll see updates in the portal when you sign in.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {PREF_LABELS.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-6 py-3">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <Switch
                  aria-label={row.label}
                  checked={Boolean(prefs?.[row.key])}
                  onCheckedChange={(v) => void togglePref(row.key, v)}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PartnerShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
