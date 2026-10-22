/**
 * Merchant referral application — step definitions and progress maths.
 *
 * The merchant never sees an application id: everything travels on an opaque
 * token issued by the database. This module only describes the form.
 */

export const TOTAL_STEPS = 7;

export interface StepDef {
  id: number;
  title: string;
  blurb: string;
}

export const STEPS: StepDef[] = [
  { id: 1, title: "Business", blurb: "Where you trade and how you're registered." },
  { id: 2, title: "Owner", blurb: "The person who signs for the business." },
  { id: 3, title: "Funding", blurb: "How much you need and what it's for." },
  { id: 4, title: "Financials", blurb: "A quick picture of your revenue." },
  { id: 5, title: "Contact", blurb: "How we reach you with a decision." },
  { id: 6, title: "Documents", blurb: "Bank connection and statements." },
  { id: 7, title: "Review", blurb: "Check everything and submit." },
];

/** Draft payload is free-form JSON; these are the keys the wizard writes. */
export type DraftPayload = Record<string, string | boolean | null | undefined>;

export function completionFor(step: number): number {
  return Math.min(100, Math.round((step / TOTAL_STEPS) * 100));
}

const REQUIRED: Record<number, string[]> = {
  1: ["legal_business_name", "business_address", "city", "state", "zip", "legal_entity"],
  2: ["owner_first_name", "owner_last_name", "owner_email"],
  3: ["requested_amount", "use_of_funds"],
  4: ["average_monthly_revenue"],
  5: ["contact_first_name", "contact_last_name", "contact_email", "contact_phone"],
  6: [],
  7: [],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a human message when the step can't be advanced, else null. */
export function validateStep(step: number, payload: DraftPayload): string | null {
  for (const key of REQUIRED[step] ?? []) {
    const value = String(payload[key] ?? "").trim();
    if (!value) return "Fill in the highlighted fields before continuing.";
  }
  if (step === 2 && !EMAIL.test(String(payload["owner_email"] ?? "").trim())) {
    return "Enter a valid owner email address.";
  }
  if (step === 3 && !(Number(payload["requested_amount"]) > 0)) {
    return "Enter how much funding you need.";
  }
  if (step === 4 && !(Number(payload["average_monthly_revenue"]) > 0)) {
    return "Enter your average monthly revenue.";
  }
  if (step === 5) {
    if (!EMAIL.test(String(payload["contact_email"] ?? "").trim()))
      return "Enter a valid contact email address.";
    if (String(payload["contact_phone"] ?? "").replace(/\D/g, "").length < 10)
      return "Enter a valid contact phone number.";
  }
  return null;
}

/** Fields that are missing on a step, used to mark inputs as invalid. */
export function missingFields(step: number, payload: DraftPayload): Set<string> {
  const missing = new Set<string>();
  for (const key of REQUIRED[step] ?? []) {
    if (!String(payload[key] ?? "").trim()) missing.add(key);
  }
  return missing;
}
