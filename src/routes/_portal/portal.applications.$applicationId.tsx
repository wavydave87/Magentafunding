import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired. The partner-facing detail is the referral detail, built entirely
 * from the constrained partner-safe view.
 */
export const Route = createFileRoute("/_portal/portal/applications/$applicationId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/portal/referrals/$referralId",
      params: { referralId: params.applicationId },
      replace: true,
    });
  },
});
