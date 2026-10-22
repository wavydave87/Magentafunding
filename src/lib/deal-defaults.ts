export const DEFAULT_PIF_TIERS = [
  { label: "Within 30 days", discount_percent: 15 },
  { label: "Within 60 days", discount_percent: 10 },
  { label: "Within 90 days", discount_percent: 5 },
];

/**
 * Bank verification is a checklist item with a secure link attached (Plaid,
 * Decision Logic, etc). The label is a constant because both surfaces match on it.
 */
export const BANK_VERIFICATION_LABEL = "Bank Verification (Secure Link)";

/** Only absolute https links may ever become a live button on the merchant page. */
export function normalizeBankVerificationUrl(raw: string): {
  url: string | null;
  error: string | null;
} {
  const value = raw.trim();
  if (!value) return { url: null, error: null };
  if (value.length > 500)
    return { url: null, error: "Bank verification link must be under 500 characters." };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { url: null, error: "Bank verification link must be a full URL." };
  }
  if (parsed.protocol !== "https:")
    return { url: null, error: "Bank verification link must start with https://" };
  return { url: parsed.toString(), error: null };
}

/** Merchant-side guard: never render a button for anything but an https link. */
export const isSafeBankVerificationUrl = (value: string | null | undefined) =>
  typeof value === "string" && normalizeBankVerificationUrl(value).url !== null;

export interface ChecklistOption {
  label: string;
  defaultOn?: boolean;
}

export const CHECKLIST_GROUPS: { group: string; items: ChecklistOption[] }[] = [
  {
    group: "Application & Identity",
    items: [
      { label: "Signed application (additional business owner)", defaultOn: true },
      { label: "Government-issued photo ID", defaultOn: true },
      { label: "Driver's license (front and back)" },
    ],
  },
  {
    group: "Business Financials",
    items: [
      { label: "Voided business check", defaultOn: true },
      { label: "Last 4 months of credit card processing statements", defaultOn: true },
      { label: "Most recent business tax return" },
      { label: "Proof of business insurance" },
      { label: BANK_VERIFICATION_LABEL },
    ],
  },
  {
    group: "Business Registration",
    items: [
      { label: "Business license" },
      { label: "EIN documentation" },
      { label: "Articles of incorporation / formation documents" },
      { label: "Landlord or lease agreement" },
    ],
  },
  {
    group: "Proof of Ownership",
    items: [
      {
        label:
          "Proof of ownership (Schedule K-1, Schedule C, or Operating Agreement)",
      },
    ],
  },
];

export const DEFAULT_CHECKLIST = CHECKLIST_GROUPS.flatMap((g) =>
  g.items.filter((i) => i.defaultOn).map((i) => i.label),
);
