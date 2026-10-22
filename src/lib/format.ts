/**
 * Single source of truth for money formatting across sales, partner and
 * customer surfaces. Previously three modules formatted dollars three
 * different ways, so the same figure could read differently per screen.
 */
export const formatMoney = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);

/** Whole-dollar money with an em dash for missing values. */
export function formatMoneyOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return formatMoney(Number(value));
}

/** Two-decimal money (commissions, fees) with an em dash for missing values. */
export function formatMoneyPrecise(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return formatMoney(Number(value), 2);
}
