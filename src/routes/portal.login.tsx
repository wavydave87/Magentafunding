import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeDollarSign, Share2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandFooter, logoAsset } from "@/components/brand";
import { SignInForm } from "@/components/sign-in-form";
import { Button } from "@/components/ui/button";
import { fetchPortalIdentity, hasPortalAccess } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/login")({
  head: () => ({
    meta: [
      { title: "Magenta Referral Partner Portal — Sign In" },
      {
        name: "description",
        content:
          "Sign in to the Magenta Referral Partner Portal to refer businesses, track applications through funding and follow your commissions.",
      },
      { property: "og:title", content: "Magenta Referral Partner Portal — Sign In" },
      {
        property: "og:description",
        content: "Refer, track and earn with Magenta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerLogin,
});

const VALUE_POINTS = [
  {
    icon: Share2,
    title: "Refer",
    body: "Share your personalized Magenta application link or QR code.",
  },
  {
    icon: TrendingUp,
    title: "Track",
    body: "Follow referrals from application through funding.",
  },
  {
    icon: BadgeDollarSign,
    title: "Earn",
    body: "Monitor funded deals and commission payouts.",
  },
];

const LIFECYCLE = ["Refer", "Apply", "Approved", "Funded", "Earn"];

function PartnerLogin() {
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState<string | null>(null);

  // Someone already signed in should never be shown the sign-in form again.
  // Runs after hydration only: the session lives in browser storage.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const identity = await fetchPortalIdentity();
      if (cancelled) return;
      if (identity.isInternal) {
        navigate({ to: "/dashboard", replace: true });
      } else if (hasPortalAccess(identity)) {
        navigate({ to: "/portal", replace: true });
      } else if (identity.member) {
        navigate({ to: "/pending-access", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /** Route by identity, and explain plainly when an account can't get in. */
  async function onSignedIn() {
    const identity = await fetchPortalIdentity();
    if (identity.isInternal) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    const member = identity.member;
    if (!member) {
      setBlocked(
        "This account isn't linked to a partner organization yet. Your Magenta rep can invite you.",
      );
      await supabase.auth.signOut();
      return;
    }
    // A deactivated member or a paused organization keeps the session and lands
    // on the paused-access page, which names the organization and its status.
    if (!hasPortalAccess(identity)) {
      navigate({ to: "/pending-access", replace: true });
      return;
    }
    navigate({ to: "/portal", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="grid flex-1 lg:grid-cols-2">
        {/* Brand and value proposition */}
        <section className="bg-brand-wash relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-lg">
            <img
              src={logoAsset.url}
              alt="Magenta — Invest in Possible"
              className="h-11 w-auto"
            />
            <p className="mt-8 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Magenta Referral Partner Portal
            </p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl">
              Grow Your Business With Magenta
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Refer businesses, track every opportunity, and manage your commissions from one
              place.
            </p>

            <ul className="mt-8 space-y-5">
              {VALUE_POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display text-base">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <ol className="mt-9 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
              {LIFECYCLE.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-3 py-1">
                    {step}
                  </span>
                  {i < LIFECYCLE.length - 1 ? (
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Sign in */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="card-elevated p-7">
              <h2 className="font-display text-2xl">Partner Sign In</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Access your Magenta referral dashboard.
              </p>

              {blocked ? (
                <p
                  role="alert"
                  className="border-coral/40 bg-coral/10 mt-4 rounded-md border px-3 py-2 text-sm"
                >
                  {blocked}
                </p>
              ) : null}

              <SignInForm emailLabel="Email" rememberMe onSignedIn={onSignedIn} />
            </div>

            <div className="mt-6 rounded-lg border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Interested in becoming a Magenta referral partner?
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/partners/inquiry">Become a Partner</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Partner accounts are created by Magenta or invited by your organization admin.
            </p>
          </div>
        </section>
      </main>
      <BrandFooter note="Magenta Referral Partner Portal · Invest in Possible." />
    </div>
  );
}
