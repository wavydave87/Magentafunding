/**
 * Anonymous merchant view tracking for public offer pages.
 *
 * A random visitor id lives in localStorage so repeat opens from the same
 * device are distinguishable from a new device. No personal data is stored.
 */

const VISITOR_KEY = "magenta.visitor_id";

export function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / storage blocked: still count the visit, just as a new device.
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

/** Relative "2h ago" style label for last-viewed timestamps. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "Just Now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m Ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h Ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d Ago`;
  return new Date(iso).toLocaleDateString();
}

/** Full local timestamp for the rep-facing activity timeline. */
export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Rough device label from a stored user agent string. */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "Unknown Device";
  if (/iphone|android.*mobile|windows phone/.test(ua)) return "Phone";
  if (/ipad|tablet|android/.test(ua)) return "Tablet";
  return "Desktop";
}
