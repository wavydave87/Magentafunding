import { describe, expect, it } from "vitest";

import { legacyPartnerTarget, signInDestination } from "@/lib/portal-routing";
import type { PortalIdentity } from "@/hooks/use-portal-identity";

const base: PortalIdentity = {
  userId: null,
  email: null,
  isInternal: false,
  isAdmin: false,
  member: null,
  orgPaused: false,
};

const member = (status: string): PortalIdentity["member"] => ({
  id: "m1",
  organization_id: "o1",
  full_name: "Pat Partner",
  email: "pat@example.com",
  role: "broker" as PortalIdentity["member"] extends null ? never : never as never,
  status,
  code: "PP101",
  organization: {
    id: "o1",
    name: "Northgate",
    slug: "northgate",
    code: "NCP001",
    status: "active",
    partner_type: "iso",
  },
});

describe("legacyPartnerTarget", () => {
  it("maps the partner root to the portal root", () => {
    expect(legacyPartnerTarget(undefined)).toBe("/portal");
    expect(legacyPartnerTarget("")).toBe("/portal");
  });

  it("preserves nested paths and route parameters", () => {
    expect(legacyPartnerTarget("applications")).toBe("/portal/applications");
    expect(legacyPartnerTarget("applications/ABC123")).toBe("/portal/applications/ABC123");
    expect(legacyPartnerTarget("support/9f0c")).toBe("/portal/support/9f0c");
  });

  it("preserves query strings and hashes", () => {
    expect(legacyPartnerTarget("applications", "?status=funded")).toBe(
      "/portal/applications?status=funded",
    );
    expect(legacyPartnerTarget("applications", "status=funded")).toBe(
      "/portal/applications?status=funded",
    );
    expect(legacyPartnerTarget("training/1", "?tab=modules", "#module-2")).toBe(
      "/portal/training/1?tab=modules#module-2",
    );
  });
});

describe("signInDestination", () => {
  it("sends internal staff to the internal dashboard", () => {
    expect(signInDestination({ ...base, userId: "u", isInternal: true })).toBe("/dashboard");
  });

  it("sends internal staff to the dashboard even with a partner membership", () => {
    expect(
      signInDestination({ ...base, userId: "u", isInternal: true, member: member("active") }),
    ).toBe("/dashboard");
  });

  it("sends active partners to the partner workspace", () => {
    expect(signInDestination({ ...base, userId: "u", member: member("active") })).toBe("/portal");
  });

  it("sends inactive partners to account status", () => {
    expect(signInDestination({ ...base, userId: "u", member: member("inactive") })).toBe(
      "/pending-access",
    );
  });

  it("sends users with neither identity to account status", () => {
    expect(signInDestination({ ...base, userId: "u" })).toBe("/pending-access");
  });
});
