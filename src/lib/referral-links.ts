/**
 * Referral link building for the partner portal.
 *
 * Links are built from the permanent short codes (SFB001 / MR102) — never from
 * internal ids. Codes are case-insensitive on the server.
 */
import QRCode from "qrcode";

export function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** `/apply?ref=SFB001` or `/apply?ref=SFB001&user=MR102`. */
export function referralLink(orgCode: string, memberCode?: string | null): string {
  const query = new URLSearchParams({ ref: orgCode.toUpperCase() });
  if (memberCode) query.set("user", memberCode.toUpperCase());
  return `${origin()}/apply?${query.toString()}`;
}

/** PNG data URL for the exact link shown beside it. */
export async function referralQrDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, {
    width: 512,
    margin: 1,
    color: { dark: "#1c1b1f", light: "#ffffff" },
  });
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Stable, privacy-minimal visitor key. No fingerprinting. */
export function visitorKey(): string {
  const key = "magenta-visitor-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

/** Where the merchant's live application token is remembered between visits. */
const TOKEN_KEY = "magenta-application-token";

export function rememberApplicationToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private browsing — the emailed resume link still works */
  }
}

export function forgetApplicationToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
