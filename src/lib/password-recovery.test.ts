import { describe, expect, it } from "vitest";

import type { PortalIdentity } from "@/hooks/use-portal-identity";

import { isRecoveryHash, parseRecoveryHash, signedInResetTarget } from "./password-recovery";

function identity(overrides: Partial<PortalIdentity>): PortalIdentity {
  return {
    userId: "user-1",
    email: "person@example.com",
    isInternal: false,
    isAdmin: false,
    orgPaused: false,
    member: null,
    ...overrides,
  };
}

const partnerMember: PortalIdentity["member"] = {
  id: "member-1",
  organization_id: "org-1",
  full_name: "Pat Partner",
  email: "pat@example.com",
  role: "broker",
  status: "active",
  code: null,
  organization: null,
};

describe("parseRecoveryHash", () => {
  it("reads an expired-link error from the URL hash", () => {
    expect(
      parseRecoveryHash(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({ error: "Email link is invalid or has expired" });
  });

  it("returns no error for a normal recovery hash", () => {
    expect(parseRecoveryHash("#access_token=x&type=recovery")).toEqual({ error: null });
  });

  it("returns no error for an empty hash", () => {
    expect(parseRecoveryHash("")).toEqual({ error: null });
  });
});

describe("isRecoveryHash", () => {
  it("recognises a recovery link", () => {
    expect(isRecoveryHash("#access_token=x&refresh_token=y&type=recovery")).toBe(true);
  });

  it("ignores a normal sign-in link", () => {
    expect(isRecoveryHash("#access_token=x&type=magiclink")).toBe(false);
  });

  it("ignores an empty hash", () => {
    expect(isRecoveryHash("")).toBe(false);
  });
});

describe("signedInResetTarget", () => {
  it("sends Magenta staff to their account page", () => {
    expect(signedInResetTarget(identity({ isInternal: true }))).toBe("/account");
  });

  it("sends partner members to portal settings", () => {
    expect(signedInResetTarget(identity({ member: partnerMember }))).toBe("/portal/settings");
  });

  it("returns null when nobody is signed in", () => {
    expect(signedInResetTarget(null)).toBeNull();
  });

  it("returns null for a session with no staff or partner identity", () => {
    expect(signedInResetTarget(identity({}))).toBeNull();
  });
});
