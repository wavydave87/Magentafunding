import type { PortalIdentity } from "@/hooks/use-portal-identity";

/**
 * Maps a legacy `/partner/*` path onto its `/portal/*` equivalent, preserving
 * the remaining path, query string and hash. Legacy links live in old
 * notifications and bookmarks, so this mapping must stay lossless.
 */
export function legacyPartnerTarget(splat?: string | null, search = "", hash = ""): string {
  const rest = (splat ?? "").replace(/^\/+/, "");
  const base = rest ? `/portal/${rest}` : "/portal";
  const query = search && !search.startsWith("?") ? `?${search}` : search;
  const fragment = hash && !hash.startsWith("#") ? `#${hash}` : hash;
  return `${base}${query}${fragment}`;
}

/**
 * Where a signed-in identity belongs. Internal identity always wins, and a
 * paused organization sends the member to the paused-access page.
 */
export function signInDestination(identity: PortalIdentity | null | undefined) {
  if (identity?.isInternal) return "/dashboard" as const;
  if (
    identity?.member &&
    identity.member.status === "active" &&
    identity.member.organization?.status === "active"
  )
    return "/portal" as const;
  return "/pending-access" as const;
}
