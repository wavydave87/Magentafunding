export const MIN_PASSWORD_LENGTH = 8;

/** Returns an error message, or null when the new password is acceptable. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export type SelfSensitiveAction = "remove_admin" | "disable";

/** Admins may never strip their own admin role or disable their own sign-in. */
export function assertNotSelfLockout(
  actorId: string,
  targetId: string,
  action: SelfSensitiveAction,
): void {
  if (actorId === targetId) {
    throw new Error(
      action === "remove_admin"
        ? "You can't remove your own admin role."
        : "You can't turn off your own sign-in.",
    );
  }
}

/**
 * Admins may not change their own sign-in in either direction: a disabled
 * admin's access token stays valid for up to an hour and must not be able to
 * lift their own ban.
 */
export function assertMayChangeSignIn(actorId: string, targetId: string): void {
  if (actorId === targetId) throw new Error("You can't change your own sign-in.");
}

/** True while a Supabase `banned_until` timestamp is still in the future. */
export function isBanned(bannedUntil: string | null | undefined, now: Date = new Date()): boolean {
  return Boolean(bannedUntil && new Date(bannedUntil) > now);
}
