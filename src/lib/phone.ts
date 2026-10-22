/** Shared phone helpers so the merchant-facing tel: link is tappable everywhere. */

const digitsOf = (value: string) => value.replace(/\D/g, "");

/** Digits-only (plus optional leading +) href value, normalized to E.164 for US numbers. */
export function telHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const hadPlus = trimmed.startsWith("+");
  const digits = digitsOf(trimmed);
  if (digits.length < 7) return null;
  if (hadPlus) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

/** Human display format: (555) 123-4567, +1 (555) 123-4567, or the raw value when unusual. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  const digits = digitsOf(trimmed);
  const local =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) {
    const pretty = `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    return digits.length === 11 || trimmed.startsWith("+") ? `+1 ${pretty}` : pretty;
  }
  if (trimmed.startsWith("+")) return `+${digits}`;
  return trimmed;
}

/** Progressive formatting while typing in the rep builder. */
export function formatPhoneInput(value: string): string {
  if (value.trim().startsWith("+")) return `+${digitsOf(value)}`;
  const d = digitsOf(value).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
