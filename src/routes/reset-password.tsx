import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchPortalIdentity, portalHome } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set A New Password — Magenta Portal" },
      {
        name: "description",
        content: "Choose a new password for your Magenta Portal account.",
      },
      { property: "og:title", content: "Set A New Password — Magenta Portal" },
      {
        property: "og:description",
        content: "Choose a new password for your Magenta Portal account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Both passwords must match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    const identity = await fetchPortalIdentity();
    navigate({ to: portalHome(identity), replace: true });
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center bg-brand-wash px-5 py-16">
        <div className="card-elevated w-full max-w-md p-7">
          <h1 className="text-2xl">Set A New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Choose a new password for your Magenta Portal account."
              : "Open this page from the reset link in your email to continue."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy ? "Saving…" : "Save New Password"}
            </Button>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
