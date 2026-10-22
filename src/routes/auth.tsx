import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SignInCard } from "@/components/sign-in-card";
import { fetchPortalIdentity, portalHome } from "@/hooks/use-portal-identity";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search['redirect'] === "string" ? { redirect: search['redirect'] } : {},

  head: () => ({
    meta: [
      { title: "Sign In — Magenta Portal" },
      {
        name: "description",
        content:
          "Sign in to Magenta Portal — funding offers for Magenta staff and applications for ISO and referral partners.",
      },
      { property: "og:title", content: "Sign In — Magenta Portal" },
      {
        property: "og:description",
        content: "One sign-in for Magenta staff and Magenta partners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** Same-origin paths only — never bounce a user to an external URL. */
function safeRedirect(target: string | undefined) {
  if (!target) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  if (target.startsWith("/auth")) return null;
  return target;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  /** Route by portal identity, never straight to the internal dashboard. */
  async function routeByIdentity() {
    const back = safeRedirect(redirect);
    if (back) {
      navigate({ to: back, replace: true });
      return;
    }
    const identity = await fetchPortalIdentity();
    navigate({ to: portalHome(identity), replace: true });
  }

  return (
    <SignInCard
      title="Sign In To Magenta Portal"
      intro="Magenta staff and partner organizations use the same sign-in. Accounts are created by Magenta."
      onSignedIn={routeByIdentity}
    />
  );
}
