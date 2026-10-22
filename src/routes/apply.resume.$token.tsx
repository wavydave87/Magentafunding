import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { rememberApplicationToken } from "@/lib/referral-links";

export const Route = createFileRoute("/apply/resume/$token")({
  head: () => ({
    meta: [
      { title: "Resume Your Application — Magenta" },
      {
        name: "description",
        content: "Pick up your Magenta funding application exactly where you left off.",
      },
      { property: "og:title", content: "Resume Your Application — Magenta" },
      { property: "og:description", content: "Continue your Magenta funding application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResumeApplication,
});

function ResumeApplication() {
  const { token } = useParams({ from: "/apply/resume/$token" });
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("merchant_redeem_resume_token", {
        _token: token,
      });
      if (cancelled) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      const fresh = String(data);
      rememberApplicationToken(fresh);
      void navigate({ to: "/apply/start/$token", params: { token: fresh }, replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-5 py-16">
          {failed ? (
            <div className="card-elevated p-8">
              <h1 className="font-display text-2xl">This resume link has already been used</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Each resume link works once, for your security. Email{" "}
                <a className="underline" href="mailto:hello@magentafunding.com">
                  hello@magentafunding.com
                </a>{" "}
                and we'll send you a fresh one.
              </p>
            </div>
          ) : (
            <div className="card-elevated flex items-center gap-3 p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Opening your application…</p>
            </div>
          )}
        </div>
      </main>
      <BrandFooter note="Magenta · Invest in Possible." />
    </div>
  );
}
