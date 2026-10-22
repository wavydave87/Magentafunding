import type { PortalIdentity } from "@/hooks/use-portal-identity";

/**
 * Supabase puts a failed recovery link's reason in the URL hash
 * (`#error=…&error_description=Email+link+is+invalid+or+has+expired`).
 * Returns that reason, or null when the hash carries no error.
 */
export function parseRecoveryHash(hash: string): { error: string | null } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const description = params.get("error_description");
  return { error: description ? description : null };
}

/** True when a URL hash is a Supabase password-recovery link. */
export function isRecoveryHash(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

/**
 * The URL hash as it was when the app booted. The Supabase client clears the
 * hash as soon as it initialises, which can happen before the reset page
 * mounts, so the page reads this snapshot instead of window.location.hash.
 * This module is imported by src/router.tsx so the snapshot is taken first.
 */
const bootHash = typeof window === "undefined" ? "" : window.location.hash;

export function hashAtBoot(): string {
  return bootHash;
}

/**
 * Where a signed-in visitor who is not mid-recovery should change their
 * password instead. Internal identity wins, matching signInDestination.
 */
export function signedInResetTarget(
  identity: PortalIdentity | null,
): "/account" | "/portal/settings" | null {
  if (!identity?.userId) return null;
  if (identity.isInternal) return "/account";
  if (identity.member) return "/portal/settings";
  return null;
}
