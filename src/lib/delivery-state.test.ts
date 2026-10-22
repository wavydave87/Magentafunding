import { describe, expect, it } from "vitest";

import { delivery, deliveryState } from "./delivery-state";

const ago = () => "just now";

describe("deliveryState", () => {
  it("is draft with no signals", () => {
    expect(deliveryState({})).toBe("draft");
  });

  it("treats a manually marked status as sent when no send is logged", () => {
    expect(deliveryState({ status: "sent" })).toBe("sent");
  });

  it("never contradicts a logged send", () => {
    expect(deliveryState({ status: "draft", sentAt: "2026-01-01" })).toBe("sent");
  });

  it("advances to opened on a first view even without a logged send", () => {
    expect(deliveryState({ firstViewedAt: "2026-01-01" })).toBe("opened");
  });

  it("prefers accepted over opened", () => {
    expect(deliveryState({ firstViewedAt: "a", acceptedAt: "b" })).toBe("accepted");
  });

  it("prefers a revision request over acceptance", () => {
    expect(deliveryState({ acceptedAt: "b", revisionRequested: true })).toBe(
      "revision_requested",
    );
  });

  it("reports expired only when nothing further happened", () => {
    expect(deliveryState({ status: "expired" })).toBe("expired");
    expect(deliveryState({ status: "expired", firstViewedAt: "a" })).toBe("opened");
  });
});

describe("delivery line", () => {
  it("says draft when nothing was sent", () => {
    expect(delivery({}, ago).line).toBe("Draft · Not Sent Yet");
  });

  it("flags a manual mark with no logged delivery", () => {
    expect(delivery({ status: "sent" }, ago).line).toContain("No Delivery Logged");
  });

  it("names the first open", () => {
    expect(delivery({ sentAt: "a", firstViewedAt: "b" }, ago).line).toContain("First Opened");
  });

  it("keeps badge label and tone in sync with state", () => {
    const d = delivery({ acceptedAt: "b" }, ago);
    expect(d.label).toBe("Accepted");
    expect(d.tone).toContain("bg-primary");
  });
});
