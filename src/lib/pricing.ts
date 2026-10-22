/**
 * Authoritative pricing/business logic for the Magenta Client Offer Tool.
 * Ported verbatim from the legacy HTML tool — do not re-derive these formulas.
 */

export type Frequency = "daily" | "weekly";

export interface PricingTerms {
  sell_rate: number;
  weekly_rate_increase_points: number;
  term_days: number;
  origination_fee_percent: number;
  other_fees: number;
}

export const sellRate = (buyRate: number, upsellPoints: number) =>
  buyRate + upsellPoints / 100;

export const weeklySellRate = (sell: number, weeklyIncreasePoints: number) =>
  sell + weeklyIncreasePoints / 100;

export const effectiveRate = (terms: PricingTerms, frequency: Frequency) =>
  frequency === "weekly"
    ? weeklySellRate(terms.sell_rate, terms.weekly_rate_increase_points)
    : terms.sell_rate;

export const paymentCount = (termDays: number, frequency: Frequency) =>
  frequency === "weekly" ? Math.max(1, Math.round(termDays / 5)) : termDays;

export interface Structure {
  amount: number;
  frequency: Frequency;
  rate: number;
  payments: number;
  payback: number;
  payment: number;
  originationFee: number;
  otherFees: number;
  totalFees: number;
  netFunded: number;
}

export function computeStructure(
  terms: PricingTerms,
  amount: number,
  frequency: Frequency,
): Structure {
  const rate = effectiveRate(terms, frequency);
  const payments = paymentCount(terms.term_days, frequency);
  const payback = amount * rate;
  const originationFee = (amount * terms.origination_fee_percent) / 100;
  const otherFees = terms.other_fees;
  const totalFees = originationFee + otherFees;

  return {
    amount,
    frequency,
    rate,
    payments,
    payback,
    payment: payments > 0 ? payback / payments : 0,
    originationFee,
    otherFees,
    totalFees,
    netFunded: amount - totalFees,
  };
}

export function pifOutcome(payback: number, discountPercent: number) {
  const savings = (payback * discountPercent) / 100;
  return { discountPercent, savings, payoffAmount: payback - savings };
}

/** Presets are always derived from min/max — amounts are never hand-edited. */
export function presetAmounts(minFunded: number, maxFunded: number) {
  const balanced = Math.round((minFunded + maxFunded) / 2 / 100) * 100;
  return [minFunded, balanced, maxFunded];
}

export const PRESET_LABEL_DEFAULTS = [
  "Lower Payment",
  "Balanced",
  "Maximum Funding",
];

export { formatMoney } from "./format";

export const formatRate = (value: number) => value.toFixed(3);

export interface DealDraft {
  merchant_name: string;
  rep_name: string;
  rep_email: string;
  expiration_date: string;
  buy_rate: number;
  upsell_points: number;
  min_funded: number;
  max_funded: number;
  term_days: number;
  allow_weekly: boolean;
  weekly_rate_increase_points: number;
  origination_fee_percent: number;
  other_fees: number;
  pif_enabled: boolean;
  pif_tiers: { label: string; discount_percent: number }[];
  checklist: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hard errors block sending. Ported exactly from the legacy tool. */
export function validateDeal(draft: DealDraft): string[] {
  const errors: string[] = [];
  if (!draft.merchant_name.trim()) errors.push("Merchant name is required.");
  if (!draft.rep_name.trim()) errors.push("Rep name is required.");
  if (!draft.rep_email.trim() || !EMAIL_RE.test(draft.rep_email))
    errors.push("A valid rep email is required.");
  if (!(draft.buy_rate > 0)) errors.push("Buy rate must be greater than 0.");
  if (!(draft.min_funded > 0)) errors.push("Minimum funded amount must be greater than 0.");
  if (!(draft.max_funded > 0)) errors.push("Maximum funded amount must be greater than 0.");
  if (draft.min_funded > draft.max_funded)
    errors.push("Minimum funded amount cannot exceed the maximum.");
  if (draft.max_funded > 500000)
    errors.push("Maximum funded amount cannot exceed $500,000 (company funding cap).");
  if (!(draft.term_days > 0) || draft.term_days > 400)
    errors.push("Term must be between 1 and 400 business days.");
  if (draft.origination_fee_percent < 0 || draft.origination_fee_percent > 100)
    errors.push("Origination fee percent must be between 0 and 100.");
  if (!draft.expiration_date) {
    errors.push("Expiration date is required.");
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${draft.expiration_date}T00:00:00`) < today)
      errors.push("Expiration date cannot be in the past.");
  }
  if (draft.pif_enabled) {
    for (const tier of draft.pif_tiers) {
      if (tier.discount_percent < 0 || tier.discount_percent > 99)
        errors.push(
          `Early payoff tier "${tier.label || "untitled"}" must have a discount between 0 and 99%.`,
        );
    }
  }
  return errors;
}

/** Soft warnings are shown but never block sending. */
export function warnDeal(draft: DealDraft): string[] {
  const warnings: string[] = [];
  if (draft.buy_rate < 1 || draft.buy_rate > 2.5)
    warnings.push("Buy rate is outside the usual 1.00–2.50 range.");
  if (draft.upsell_points > 20) warnings.push("Upsell is above 20 points.");
  if (draft.origination_fee_percent > 10)
    warnings.push("Origination fee is above 10%.");
  if (draft.checklist.length === 0)
    warnings.push("No closing documents are selected.");
  if (draft.pif_enabled && draft.pif_tiers.some((t) => t.discount_percent >= 40))
    warnings.push("An early payoff tier discounts 40% or more.");
  return warnings;
}

/* ------------------------------------------------------------------ *
 * Payment amortization schedule (client-facing).
 * Derived entirely from the structure math above — no new pricing rules.
 * ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const isBusinessDay = (date: Date) => date.getDay() !== 0 && date.getDay() !== 6;

/** Next business day strictly after `date`. */
export function nextBusinessDay(date: Date): Date {
  const next = new Date(date.getTime() + DAY_MS);
  while (!isBusinessDay(next)) next.setTime(next.getTime() + DAY_MS);
  return next;
}

export interface ScheduleRow {
  index: number;
  /** null when no funding date has been chosen yet. */
  date: string | null;
  payment: number;
  paidToDate: number;
  remaining: number;
}

export interface PaymentSchedule {
  rows: ScheduleRow[];
  firstDate: string | null;
  payoffDate: string | null;
  /** 25 / 50 / 75 / 100 percent progress rows. */
  milestones: { percent: number; row: ScheduleRow }[];
}

/**
 * Even payments with the final payment absorbing rounding, so the schedule
 * always totals the exact payback figure.
 *
 * Daily payments land on business days only; weekly payments land on the same
 * weekday each week. Payments start the next business day after funding.
 */
export function paymentSchedule(
  structure: Structure,
  fundingDate?: string | null,
): PaymentSchedule {
  const count = Math.max(1, Math.round(structure.payments));
  const payback = Math.round(structure.payback * 100) / 100;
  const per = Math.floor((payback / count) * 100) / 100;

  let cursor: Date | null = null;
  if (fundingDate) {
    const funded = toDate(fundingDate);
    if (!Number.isNaN(funded.getTime())) cursor = nextBusinessDay(funded);
  }

  const rows: ScheduleRow[] = [];
  let paid = 0;

  for (let i = 1; i <= count; i += 1) {
    const isLast = i === count;
    const payment = isLast ? Math.round((payback - paid) * 100) / 100 : per;
    paid = Math.round((paid + payment) * 100) / 100;

    let date: string | null = null;
    if (cursor) {
      date = toISODate(cursor);
      if (!isLast) {
        cursor =
          structure.frequency === "weekly"
            ? new Date(cursor.getTime() + 7 * DAY_MS)
            : nextBusinessDay(cursor);
      }
    }

    rows.push({
      index: i,
      date,
      payment,
      paidToDate: paid,
      remaining: Math.round((payback - paid) * 100) / 100,
    });
  }

  const milestones = [25, 50, 75, 100].map((percent) => {
    const target = Math.max(1, Math.ceil((count * percent) / 100));
    return { percent, row: rows[Math.min(rows.length, target) - 1]! };
  });

  return {
    rows,
    firstDate: rows[0]?.date ?? null,
    payoffDate: rows[rows.length - 1]?.date ?? null,
    milestones,
  };
}

export const formatScheduleDate = (iso: string) =>
  toDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
