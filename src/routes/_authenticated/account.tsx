import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PortalGuard } from "@/components/partner/portal-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateNewPassword } from "@/lib/account-rules";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account — Magenta Portal" },
      { name: "description", content: "Update your rep profile and change your password." },
      { property: "og:title", content: "My Account — Magenta Portal" },
      { property: "og:description", content: "Update your rep profile and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <AccountPage />
    </PortalGuard>
  ),
});

function AccountPage() {
  const { data: profile, refetch } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("rep_profiles")
        .select("id, full_name, email, phone")
        .eq("id", u.user.id)
        .maybeSingle();
      return data ?? { id: u.user.id, full_name: "", email: u.user.email ?? "", phone: null };
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase
      .from("rep_profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved.");
    refetch();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const msg = validateNewPassword(next, confirm);
    if (msg) {
      toast.error(msg);
      return;
    }
    if (!profile?.email) return;
    setBusy(true);
    // Verify the current password first so a wrong entry gives a clear message.
    const check = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: current,
    });
    if (check.error) {
      setBusy(false);
      {
        toast.error("Your current password is incorrect.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({
      password: next,
      current_password: current,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password changed.");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <AppShell>
      <h1 className="text-3xl">My account</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form className="card-elevated space-y-4 p-6" onSubmit={saveProfile}>
          <h2 className="text-xl">Profile</h2>
          <div className="space-y-2">
            <Label htmlFor="acc-email">Email</Label>
            <Input id="acc-email" value={profile?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">Ask an admin to change your email.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-name">Full name</Label>
            <Input id="acc-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-phone">Phone (shown to clients)</Label>
            <Input id="acc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit">Save profile</Button>
        </form>

        <form className="card-elevated space-y-4 p-6" onSubmit={changePassword}>
          <h2 className="text-xl">Change password</h2>
          <div className="space-y-2">
            <Label htmlFor="cur-pw">Current password</Label>
            <Input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw2">Confirm new password</Label>
            <Input
              id="new-pw2"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
