import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptPartnerInvitation,
  lookupPartnerInvitation,
} from "@/lib/partner-invitations.functions";
import { MEMBER_ROLE_LABEL, type PartnerMemberRole } from "@/lib/partner";

export const Route = createFileRoute("/portal/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept Your Magenta Partner Invitation" },
      {
        name: "description",
        content: "Confirm your details and set a password to join your organization's Magenta Referral Partner Portal workspace.",
      },
      { property: "og:title", content: "Accept Your Magenta Partner Invitation" },
      { property: "og:description", content: "Join your organization's Magenta partner workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

const DEAD_STATE_COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invitation has expired",
    body: "Invitations are valid for seven days. Ask your organization admin or Magenta rep to send a new one.",
  },
  revoked: {
    title: "This invitation was withdrawn",
    body: "The link is no longer active. Ask your organization admin for a fresh invitation.",
  },
  accepted: {
    title: "This invitation was already used",
    body: "Your account is set up — sign in to reach your referral workspace.",
  },
  unknown: {
    title: "We couldn't find that invitation",
    body: "Double-check the link in your email, or ask for a new invitation.",
  },
};

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const lookup = useServerFn(lookupPartnerInvitation);
  const accept = useServerFn(acceptPartnerInvitation);

  const { data, isLoading } = useQuery({
    queryKey: ["partner-invitation", token],
    queryFn: () => lookup({ data: { token } }),
    retry: false,
  });

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    if (data?.full_name) setFullName(data.full_name);
  }, [data?.full_name]);

  const submit = useMutation({
    mutationFn: async () => {
      const result = await accept({
        data: {
          token,
          full_name: fullName,
          accepted_terms: terms,
          ...(password ? { password } : {}),
        },
      });
      if (result.can_sign_in && data?.email && password) {
        await supabase.auth.signInWithPassword({ email: data.email, password });
      }
      return result;
    },
    onSuccess: async (result) => {
      if (result.can_sign_in && password) {
        toast.success("Welcome to Magenta.");
        navigate({ to: "/portal", search: { welcome: true }, replace: true });
        return;
      }
      toast.success("Invitation accepted. Sign in to continue.");
      navigate({ to: "/portal/login", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dead = data && data.state !== "valid" ? DEAD_STATE_COPY[data.state] : null;

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="bg-brand-wash flex flex-1 items-center justify-center px-5 py-14">
        <div className="card-elevated w-full max-w-md p-7">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : dead ? (
            <>
              <h1 className="font-display text-2xl">{dead.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{dead.body}</p>
              <Button asChild className="mt-6 w-full">
                <Link to="/portal/login">Go To Partner Sign In</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Magenta Referral Partner Portal
              </p>
              <h1 className="font-display mt-2 text-2xl">
                Join {data?.organization_name ?? "your organization"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You've been invited as{" "}
                {data?.role ? MEMBER_ROLE_LABEL[data.role as PartnerMemberRole] : "a partner user"}
                {data?.email ? ` (${data.email})` : ""}. Confirm your details to get your referral
                link and QR code.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Your name</Label>
                  <Input
                    id="invite-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {data?.has_account ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    This email already has a Magenta sign-in. Leave the password blank to keep
                    your current one.
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="invite-password">
                    {data?.has_account ? "New password (optional)" : "Create a password"}
                  </Label>
                  <Input
                    id="invite-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required={!data?.has_account}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                </div>

                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="focus-ring mt-0.5 h-4 w-4 rounded border-input"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    required
                  />
                  I agree to the Magenta partner terms and to keeping merchant information
                  confidential.
                </label>

                <Button type="submit" className="w-full" disabled={submit.isPending}>
                  {submit.isPending ? "Setting up…" : "Accept Invitation"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <BrandFooter note="Magenta Referral Partner Portal · Invest in Possible." />
    </div>
  );
}
