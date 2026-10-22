import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const offer = readFileSync("src/routes/offer.$dealId.tsx", "utf8");
const schedule = readFileSync("src/components/payment-schedule.tsx", "utf8");
const send = readFileSync("src/components/send-offer-dialog.tsx", "utf8");

describe("funding date picker", () => {
  it("renders a labelled date input bounded by the funding window", () => {
    expect(offer).toMatch(/htmlFor="funding-date"/);
    expect(offer).toMatch(/min=\{windowStart\}/);
    expect(offer).toMatch(/max: windowEnd/);
  });

  it("gives the date input a 44px tap target and focus style", () => {
    const slice = offer.slice(offer.indexOf('id="funding-date"'));
    const className = /className="([^"]*)"/.exec(slice)?.[1] ?? "";
    expect(className).toContain("min-h-11");
    expect(className).toContain("focus-ring");
  });

  it("locks the date once the offer is accepted", () => {
    expect(offer).toMatch(/disabled=\{!!accepted \|\| expired\}/);
  });

  it("passes the funding date to acceptance and revision requests", () => {
    const matches = offer.match(/_funding_date: fundingDate/g) ?? [];
    expect(matches.length).toBe(2);
  });
});

describe("payment schedule panel", () => {
  it("is collapsible with accessible toggle wiring", () => {
    expect(schedule).toMatch(/aria-expanded=\{open\}/);
    expect(schedule).toMatch(/aria-controls=\{panelId\}/);
  });

  it("gives the toggle a 44px tap target and focus style", () => {
    const className = /className="([^"]*)"/.exec(
      schedule.slice(schedule.indexOf("aria-controls={panelId}")),
    )?.[1];
    expect(className).toContain("min-h-11");
    expect(className).toContain("focus-ring");
  });

  it("scrolls the full table instead of overflowing on mobile", () => {
    expect(schedule).toMatch(/max-h-80 overflow-y-auto/);
    expect(schedule).toMatch(/overflow-x-auto/);
  });

  it("labels both tables for screen readers", () => {
    expect((schedule.match(/<caption className="sr-only">/g) ?? []).length).toBe(2);
  });
});

describe("send offer dialog", () => {
  it("offers link, email and text paths", () => {
    for (const value of ['value="manual"', 'value="email"', 'value="sms"']) {
      expect(send).toContain(value);
    }
  });

  it("describes the QR code for screen readers", () => {
    expect(send).toMatch(/alt=\{`QR code linking to the offer/);
  });

  it("logs every send against the deal", () => {
    expect(send).toMatch(/from\("deal_sends"\)\s*\.insert/);
    expect(send).toMatch(/sent_by: userId/);
  });
});
