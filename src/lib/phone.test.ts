import { describe, expect, it } from "vitest";

import { formatPhone, formatPhoneInput, telHref } from "./phone";

describe("telHref", () => {
  it("normalizes a 10-digit US number to E.164", () => {
    expect(telHref("(555) 867-5309")).toBe("tel:+15558675309");
  });

  it("normalizes an 11-digit number that already has the country code", () => {
    expect(telHref("1-555-867-5309")).toBe("tel:+15558675309");
  });

  it("keeps an explicit international prefix", () => {
    expect(telHref("+44 20 7946 0958")).toBe("tel:+442079460958");
  });

  it("returns null for missing or unusable values", () => {
    expect(telHref("")).toBeNull();
    expect(telHref(null)).toBeNull();
    expect(telHref(undefined)).toBeNull();
    expect(telHref("call me")).toBeNull();
    expect(telHref("12345")).toBeNull();
  });
});

describe("formatPhone", () => {
  it("formats 10-digit numbers", () => {
    expect(formatPhone("5558675309")).toBe("(555) 867-5309");
  });

  it("formats 11-digit numbers with the country code", () => {
    expect(formatPhone("15558675309")).toBe("+1 (555) 867-5309");
  });

  it("passes through empty and unusual values", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone("ext 4")).toBe("ext 4");
  });
});

describe("formatPhoneInput", () => {
  it("formats progressively while typing", () => {
    expect(formatPhoneInput("555")).toBe("555");
    expect(formatPhoneInput("5558")).toBe("(555) 8");
    expect(formatPhoneInput("5558675309")).toBe("(555) 867-5309");
  });
});
