import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired. There is one merchant application — the personalized `/apply`
 * flow a partner shares — so this second authenticated application form is
 * gone. Old links land on Referral Tools, where that link lives.
 */
export const Route = createFileRoute("/_portal/portal/applications/new")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/referral-tools", replace: true });
  },
});
