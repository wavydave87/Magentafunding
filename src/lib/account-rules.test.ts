import { describe, expect, it } from "vitest";

import { assertNotSelfLockout, validateNewPassword } from "./account-rules";

describe("validateNewPassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validateNewPassword("short7!", "short7!")).toMatch(/at least 8/);
  });
  it("rejects mismatched confirmation", () => {
    expect(validateNewPassword("longenough1", "longenough2")).toMatch(/do not match/);
  });
  it("rejects a 7-character password with the exact message", () => {
    expect(validateNewPassword("1234567", "1234567")).toBe(
      "Password must be at least 8 characters.",
    );
  });
  it("rejects an empty password", () => {
    expect(validateNewPassword("", "")).toBe("Password must be at least 8 characters.");
  });
  it("accepts an 8+ character matching password", () => {
    expect(validateNewPassword("longenough", "longenough")).toBeNull();
  });
});

describe("assertNotSelfLockout", () => {
  it("blocks an admin removing their own admin role", () => {
    expect(() => assertNotSelfLockout("a", "a", "remove_admin")).toThrow();
  });
  it("blocks an admin disabling their own sign-in", () => {
    expect(() => assertNotSelfLockout("a", "a", "disable")).toThrow();
  });
  it("explains why self-disable is refused", () => {
    expect(() => assertNotSelfLockout("a", "a", "disable")).toThrow(
      "You can't turn off your own sign-in.",
    );
  });
  it("allows acting on another user", () => {
    expect(() => assertNotSelfLockout("a", "b", "disable")).not.toThrow();
  });
});
