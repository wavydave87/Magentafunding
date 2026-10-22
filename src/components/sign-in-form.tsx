import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/** Autofill, stray spaces and capitalized addresses must never block sign-in. */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const CREDENTIAL_HELP =
  "That email and password don't match. Check for an autofilled old password, or use Forgot Password.";

const REMEMBER_KEY = "magenta-portal-remembered-email";

/**
 * The shared email + password form. Both the staff sign-in card and the
 * partner split-screen page render this so the two never drift apart.
 */
export function SignInForm({
  emailLabel = "Work email",
  submitLabel = "Sign In",
  rememberMe,
  onSignedIn,
}: {
  emailLabel?: string;
  submitLabel?: string;
  /** Remembers only the email address — never the password. */
  rememberMe?: boolean;
  onSignedIn: () => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(rememberMe));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Until React attaches its submit handler, a click would perform a plain
  // browser form submission: the page silently reloads and nothing is signed
  // in. Keeping the submit button disabled in the server-rendered markup also
  // blocks Enter-key implicit submission, so an early click can never look
  // like "the button did nothing".
  const [ready, setReady] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Anything typed or autofilled before this point lives only in the DOM.
    // Adopt it, or the first submit would run with empty values.
    const typedEmail = emailRef.current?.value ?? "";
    const typedPassword = passwordRef.current?.value ?? "";
    if (typedEmail) setEmail((current) => current || typedEmail);
    if (typedPassword) setPassword((current) => current || typedPassword);
    setReady(true);
  }, []);

  // Read after hydration only: the server has no localStorage, so seeding the
  // initial state from it would mismatch and throw away the hydrated tree.
  useEffect(() => {
    if (!rememberMe) return;
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail((current) => current || saved);
    } catch {
      /* private browsing — nothing remembered */
    }
  }, [rememberMe]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const address = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (error) {
      setBusy(false);
      const message = /invalid login credentials/i.test(error.message)
        ? CREDENTIAL_HELP
        : error.message;
      setNotice(message);
      toast.error(message);
      return;
    }
    if (rememberMe) {
      try {
        if (remember) window.localStorage.setItem(REMEMBER_KEY, address);
        else window.localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* private browsing — nothing to remember */
      }
    }
    try {
      await onSignedIn();
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const address = normalizeEmail(email);
    if (!address) {
      toast.error("Enter your email first, then choose Forgot Password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotice("If that email has a Magenta Portal account, a reset link is on its way.");
    toast.success("If that email has a Magenta Portal account, a reset link is on its way.");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={signIn}>
      <div className="space-y-2">
        <Label htmlFor="email">{emailLabel}</Label>
        <Input
          id="email"
          ref={emailRef}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          ref={passwordRef}
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {rememberMe ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="focus-ring h-4 w-4 rounded border-input"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me on this device
        </label>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy || !ready}>
        {busy ? "Signing in…" : !ready ? "Loading…" : submitLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={!ready}
        onClick={() => void forgotPassword()}
      >
        Forgot Password?
      </Button>
    </form>
  );
}
