/**
 * Display-only text helpers. These never change stored data — a merchant name
 * typed as "mercahnt 1" stays exactly that in the database, it just renders as
 * "Mercahnt 1" so the rep list doesn't look broken.
 */

/** "daily" -> "Daily". */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const SMALL = new Set(["and", "of", "the", "for", "at", "in", "on", "a", "an", "to"]);

/** Title-cases a business name while leaving ALL-CAPS acronyms alone. */
export function titleCaseName(value: string): string {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      if (part.length > 1 && part === part.toUpperCase() && /[A-Z]/.test(part)) return part;
      const lower = part.toLowerCase();
      if (SMALL.has(lower)) return lower;
      return part
        .split("-")
        .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join("-");
    })
    .join("")
    .replace(/^([a-z])/, (c) => c.toUpperCase());
}
