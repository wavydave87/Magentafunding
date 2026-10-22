# Accessibility + phone fallback on the merchant offer page

## 1. Keyboard and screen-reader support for the structure picker and slider

Frequency toggle (Daily / Weekly)
- Wrap in a labelled radio group so arrow keys move between options and the active one is announced as selected.
- Add a visible focus ring on each option (focus-visible outline in the brand color, not the browser default).

Preset cards
- Each card gets an accessible name from its label ("Lower Payment", etc.) and its select button announces the full context, e.g. "Select Lower Payment — $25,000 funded, daily payment $312.50".
- Selected card is announced as the current selection, not just visually highlighted.
- Cards become keyboard-reachable in reading order with a clear focus state.

Custom amount slider
- Keep the native range input (already fully keyboard operable) and add: an accessible name, a spoken current value in dollars (not the raw number), and min/max announcements.
- Announce the recalculated payment/payback politely as the slider settles, so screen-reader users hear the live preview update instead of silently missing it.
- Add a numeric input next to the slider for users who cannot drag precisely; both stay in sync and clamp to the funding range and $100 step.
- Visible focus ring on slider thumb and the numeric input.

Also
- "Customize your own" disclosure button announces expanded/collapsed state.
- When a structure is selected, move focus to the "Your Selected Structure" heading so screen-reader users land on the result.
- Skip-to-content link and a consistent focus-visible style for all buttons/links on the page.

## 2. Graceful fallback when the rep phone is missing

- In the contact line, when no usable phone exists, show the rep name and email only, with a short helpful note: "Prefer a call? Email {rep} and they'll ring you back." — no empty or broken `tel:` link.
- Same treatment in the accepted-offer and expired-offer messages, which currently name the rep without a way to reach them.
- On the rep-side builder, show an inline hint under the Rep phone field that the merchant page will fall back to email when it's blank (and flag it as a soft warning, not a blocking error).

## 3. Other additions and tests worth doing (pick any)

Additions
- Rep phone stored once on the profile with a "use my profile number" control, so it isn't retyped per deal.
- Optional SMS link alongside the call link on mobile.
- Print/PDF-friendly styling of the accepted offer for the merchant's records.
- Offer expiration countdown ("expires in 3 days") plus disabling acceptance after expiry in the UI as well as the database.
- Upload progress per file with retry on a failed file rather than restarting the batch.

Tests
- Automated accessibility scan (axe) on the public offer page in both default and accepted states, asserting zero critical violations.
- Keyboard-only end-to-end pass: tab to frequency toggle, choose weekly, select a preset, open customize, adjust with arrow keys, accept — no mouse.
- Screen-reader name/role/value assertions on the slider, toggle and select buttons.
- Fallback test: deal with a blank rep phone renders the email-only contact line and no `tel:` anchor.
- Phone normalization unit tests for `telHref` / `formatPhone` (10-digit, 11-digit, +international, junk input).
- Mobile viewport check that all controls meet 44x44 tap targets.

## Technical notes

- Files touched: `src/routes/offer.$dealId.tsx` (picker, slider, contact line), `src/routes/_authenticated/deals.$dealId.tsx` (phone hint), `src/styles.css` (focus-visible token/utility).
- No pricing logic changes: `src/lib/pricing.ts` and `src/lib/phone.ts` stay as-is except for any new unit tests.
- Frequency toggle uses `role="radiogroup"` with `role="radio"` buttons; slider uses native `input[type=range]` with `aria-label` and `aria-valuetext`; live preview uses an `aria-live="polite"` region.
