import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired. Partners work from the referral CRM, which reads the constrained
 * partner-safe view; the old authenticated application list read application
 * records directly. Old links keep working by landing on Referrals.
 */
export const Route = createFileRoute("/_portal/portal/applications/")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/referrals", replace: true });
  },
});
