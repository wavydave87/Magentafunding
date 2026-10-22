import { describe, expect, it } from "vitest";

import {
  computeStructure,
  nextBusinessDay,
  paymentSchedule,
  toISODate,
  type PricingTerms,
} from "./pricing";

const terms: PricingTerms = {
  sell_rate: 1.45,
  weekly_rate_increase_points: 2,
  term_days: 10,
  origination_fee_percent: 5,
  other_fees: 0,
};

describe("nextBusinessDay", () => {
  it("skips weekends", () => {
    // 2026-01-02 is a Friday.
    expect(toISODate(nextBusinessDay(new Date("2026-01-02T00:00:00")))).toBe("2026-01-05");
  });
});

describe("paymentSchedule", () => {
  it("totals exactly the payback, with the final payment absorbing rounding", () => {
    const structure = computeStructure(terms, 33333, "daily");
    const { rows } = paymentSchedule(structure, "2026-01-05");
    const total = rows.reduce((sum, r) => sum + r.payment, 0);
    expect(Math.round(total * 100) / 100).toBe(Math.round(structure.payback * 100) / 100);
    expect(rows[rows.length - 1]!.remaining).toBe(0);
  });

  it("steps daily payments across business days only", () => {
    const structure = computeStructure(terms, 25000, "daily");
    const { rows, firstDate, payoffDate } = paymentSchedule(structure, "2026-01-02");
    expect(firstDate).toBe("2026-01-05"); // Monday after Friday funding
    expect(rows.map((r) => r.date)).not.toContain("2026-01-10"); // Saturday
    expect(rows).toHaveLength(10);
    expect(payoffDate).toBe("2026-01-16");
  });

  it("keeps weekly payments on the same weekday", () => {
    const structure = computeStructure(terms, 25000, "weekly");
    const { rows } = paymentSchedule(structure, "2026-01-05");
    expect(rows).toHaveLength(2); // 10 business days / 5
    expect(rows[0]!.date).toBe("2026-01-06");
    expect(rows[1]!.date).toBe("2026-01-13");
  });

  it("returns relative rows with no dates until a funding date is chosen", () => {
    const structure = computeStructure(terms, 25000, "daily");
    const { rows, payoffDate } = paymentSchedule(structure, null);
    expect(payoffDate).toBeNull();
    expect(rows.every((r) => r.date === null)).toBe(true);
  });

  it("reports 25/50/75/100 percent milestones", () => {
    const structure = computeStructure(terms, 25000, "daily");
    const { milestones } = paymentSchedule(structure, "2026-01-05");
    expect(milestones.map((m) => m.row.index)).toEqual([3, 5, 8, 10]);
    expect(milestones[3]!.row.remaining).toBe(0);
  });
});
