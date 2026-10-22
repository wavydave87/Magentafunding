import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldQuestion } from "lucide-react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { fetchPortalIdentity, portalHome } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pending-access")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account Access — Magenta Portal" },
      {
        name: "description",
        content:
          "Your Magenta Portal account is signed in but has not been assigned a workspace yet.",
      },
      { property: "og:title", content: "Account Access — Magenta Portal" },
      {
        property: "og:description",
        content: "Your Magenta Portal account is awaiting workspace access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PendingAccessPage,
});

function PendingAccessPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [paused, setPaused] = useState<{ organization: string; status: string } | null>(null);

  // If access was granted since sign-in, send the user straight to their portal.
  useEffect(() => {
    let active = true;
    void (async () => {
      const identity = await fetchPortalIdentity();
      if (!active) return;
      if (!identity.userId) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setEmail(identity.email);
      setPaused(
        identity.orgPaused && identity.member?.organization
          ? {
              organization: identity.member.organization.name,
              status: identity.member.organization.status,
            }
          : null,
      );
      const home = portalHome(identity);
      if (home !== "/pending-access") navigate({ to: home, replace: true });
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center bg-brand-wash px-5 py-16">
        <div className="card-elevated w-full max-w-md p-8 text-center">
          <ShieldQuestion className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
          {paused ? (
            <>
              <h1 className="mt-3 font-display text-2xl">Partner Access Paused</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">{paused.organization}</span> is currently{" "}
                {paused.status}, so partner records are not available to{" "}
                {email ? <span className="font-medium">{email}</span> : "this account"} right now.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Your Magenta relationship manager can restore access. Email{" "}
                <a className="underline" href="mailto:partners@magentafunding.com">
                  partners@magentafunding.com
                </a>{" "}
                and we'll pick it up from there.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-3 font-display text-2xl">Account Awaiting Access</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {email ? <span className="font-medium">{email}</span> : "This account"} is signed
                in to Magenta Portal but hasn't been assigned to a Magenta team or a partner
                organization yet.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Your Magenta contact can provision access from the Partner Network. Once that's
                done, sign in again and you'll land on your dashboard automatically.
              </p>
            </>
          )}
          <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
            Sign Out
          </Button>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
