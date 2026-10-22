import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchPortalIdentity, portalHome } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import { validateNewPassword } from "@/lib/account-rules";
import {
  hashAtBoot,
  isRecoveryHash,
  parseRecoveryHash,
  signedInResetTarget,
} from "@/lib/password-recovery";

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

/**
 * checking: waiting for Supabase to finish reading the link.
 * ready:    arrived from a valid recovery link; show the new-password form.
 * expired:  the link was already used or has expired.
 * none:     opened without a link; offer to send one.
 */
type Mode = "checking" | "ready" | "expired" | "none";

function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase clears the hash once it has read it, so check both the boot
    // snapshot and whatever is still in the address bar.
    const hashes = [hashAtBoot(), window.location.hash];
    if (hashes.some((hash) => parseRecoveryHash(hash).error)) {
      setMode("expired");
      return;
    }
    const fromLink = hashes.some(isRecoveryHash);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("ready");
    });
    // The recovery event can fire before this listener attaches; check the session too.
    void supabase.auth.getSession().then(async ({ data: s }) => {
      if (s.session && fromLink) {
        setMode("ready");
        return;
      }
      if (s.session) {
        const target = signedInResetTarget(await fetchPortalIdentity());
        if (target) {
          navigate({ to: target, replace: true });
          return;
        }
      }
      setMode((m) => (m === "checking" ? "none" : m));
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      toast.error(problem);
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

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("New link sent. Each link works once — open only the newest email.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center bg-brand-wash px-5 py-16">
        <div className="card-elevated w-full max-w-md p-7">
          <h1 className="text-2xl">Set A New Password</h1>
          {mode === "checking" ? (
            <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
              Checking your reset link…
            </p>
          ) : mode === "ready" ? (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <p className="text-sm text-muted-foreground">
                Choose a new password for your Magenta Portal account.
              </p>
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
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Save New Password"}
              </Button>
            </form>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={resend}>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {mode === "expired"
                  ? "This link has expired or was already used. Each link works only once."
                  : "Open this page from the reset link in your email, or request a new one below."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="rs-email">Email</Label>
                <Input
                  id="rs-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send a new link"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </form>
          )}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
