/**
 * Client-side wizard validation. These rules deliberately mirror the checks in
 * the `submit_partner_application` database function — the database is the
 * authority, this layer just gives partners the errors before they submit.
 */

export interface WizardDraft {
  legal_business_name: string;
  business_address: string;
  city: string;
  state: string;
  zip: string;
  legal_entity: string;
  ein: string;
  date_business_started: string;
  industry: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  requested_amount: string;
  use_of_funds: string;
  average_monthly_revenue: string;
}

export interface WizardOwner {
  first_name: string;
  last_name: string;
  ownership_percent: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  zip: string;
}

export const EIN_PATTERN = /^\d{2}-?\d{7}$/;
export const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 10 digits, optional +1 and any separators. */
export const PHONE_PATTERN = /^(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

export const ACCEPTED_UPLOAD_TYPES = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Returns an error string for a file that can't be uploaded, or null. */
export function validateUploadFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_UPLOAD_TYPES.some((ext) => name.endsWith(ext))) {
    return `${file.name} isn't an accepted file type. Upload a PDF, JPG or PNG.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is larger than 25MB. Please upload a smaller file.`;
  }
  if (file.size === 0) return `${file.name} appears to be empty.`;
  return null;
}

function nonEmpty(value: string | undefined | null) {
  return Boolean(value && value.trim());
}

function amount(value: string) {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && String(value).trim() !== "" ? n : null;
}

/** Field-keyed errors for a single wizard step. Empty object means valid. */
export function validateStep(
  step: number,
  draft: WizardDraft,
  owners: WizardOwner[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!nonEmpty(draft.legal_business_name))
      errors["legal_business_name"] = "Legal business name is required.";
    if (!nonEmpty(draft.business_address))
      errors["business_address"] = "Business address is required.";
    if (!nonEmpty(draft.city)) errors["city"] = "City is required.";
    if (!nonEmpty(draft.state)) errors["state"] = "State is required.";
    if (!ZIP_PATTERN.test(draft.zip.trim())) errors["zip"] = "Enter a 5 or 9 digit ZIP code.";
    if (!nonEmpty(draft.legal_entity)) errors["legal_entity"] = "Choose a legal entity type.";
    if (!EIN_PATTERN.test(draft.ein.trim()))
      errors["ein"] = "Enter a 9 digit EIN, for example 12-3456789.";
    if (!nonEmpty(draft.date_business_started))
      errors["date_business_started"] = "Business start date is required.";
    else if (new Date(draft.date_business_started) > new Date())
      errors["date_business_started"] = "Business start date can't be in the future.";
    if (!nonEmpty(draft.industry)) errors["industry"] = "Industry is required.";
    if (!nonEmpty(draft.contact_first_name))
      errors["contact_first_name"] = "Contact first name is required.";
    if (!nonEmpty(draft.contact_last_name))
      errors["contact_last_name"] = "Contact last name is required.";
    if (!EMAIL_PATTERN.test(draft.contact_email.trim()))
      errors["contact_email"] = "Enter a valid contact email address.";
    if (!PHONE_PATTERN.test(draft.contact_phone.trim()))
      errors["contact_phone"] = "Enter a 10 digit contact phone number.";
  }

  if (step === 1) {
    const primary = owners[0];
    if (!primary || !nonEmpty(primary.first_name))
      errors["owner_first_name"] = "Owner first name is required.";
    if (!primary || !nonEmpty(primary.last_name))
      errors["owner_last_name"] = "Owner last name is required.";
    if (!primary || !EMAIL_PATTERN.test((primary.email ?? "").trim()))
      errors["owner_email"] = "Enter a valid owner email address.";
    if (!primary || !PHONE_PATTERN.test((primary.phone ?? "").trim()))
      errors["owner_phone"] = "Enter a 10 digit owner phone number.";
    if (primary && nonEmpty(primary.zip) && !ZIP_PATTERN.test(primary.zip.trim()))
      errors["owner_zip"] = "Enter a 5 or 9 digit ZIP code.";

    const total = owners.reduce((sum, o) => sum + (amount(o.ownership_percent) ?? 0), 0);
    if (total <= 0) errors["ownership_percent"] = "Enter each owner's ownership percentage.";
    else if (total > 100) errors["ownership_percent"] = "Ownership can't total more than 100%.";
  }

  if (step === 2) {
    const requested = amount(draft.requested_amount);
    if (requested === null || requested < 5000)
      errors["requested_amount"] = "Requested amount must be at least $5,000.";
    else if (requested > 5_000_000)
      errors["requested_amount"] = "Requested amount can't exceed $5,000,000.";
    if (!nonEmpty(draft.use_of_funds)) errors["use_of_funds"] = "Tell us how the funds be used.";
    const revenue = amount(draft.average_monthly_revenue);
    if (revenue === null || revenue <= 0)
      errors["average_monthly_revenue"] = "Average monthly revenue is required.";
  }

  return errors;
}

/** Every blocking error across the whole application, for the Review step. */
export function validateAll(draft: WizardDraft, owners: WizardOwner[]) {
  return { ...validateStep(0, draft, owners), ...validateStep(1, draft, owners), ...validateStep(2, draft, owners) };
}
