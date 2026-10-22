# Bank verification link on the closing checklist

## How it works

- The closing checklist gains a new item: **Bank Verification (Secure Link)** under Business Financials.
- When the rep checks that item on the deal builder, a link field appears right below it. The rep pastes their bank verification link (Plaid, Decision Logic, or anything else) — prefilled from the rep's saved default so it's one click for the usual case, and fully editable per deal (so a replacement link can be dropped in if the merchant fails the first one).
- Editing the link on a deal saves it for that deal only; a separate "Save As My Default" action updates the rep's saved default.
- If the item is checked but no link is saved yet, the deal builder shows a soft warning ("Bank verification is on the checklist but has no link") and the merchant page falls back to a plain checklist line with no button — never a broken link.

## Merchant side

- Inside "What We'll Need to Move Forward", bank verification renders as its own highlighted card at the top of the list: brand-tinted surface, magenta border, short explanation ("Connect your bank securely — takes about 2 minutes"), and a full-width **Verify My Bank** button that opens the link in a new tab.
- The remaining checklist items render below exactly as they do today.
- Every open of that link is recorded (with the same 30-minute de-duplication and anonymous visitor ID already used for offer views). Nothing is blocked: the merchant can accept the offer before, after, or without verifying.
- After a click is recorded, the card shows a quiet confirmation line ("Bank verification opened — you can return to it any time").

## Sales side

- Deal builder: the link field with a "Test Link" button that opens it, so the rep can confirm it works before sending.
- Merchant Activity timeline: a "Bank Verification Opened" entry with count and timestamps, next to the existing offer-view entries, plus a badge on the deal card so the rep can see at a glance whether the merchant started verification.
- CSV report gains "Bank Verification Clicks" and "Bank Verification Last Opened" columns.

## Technical notes

- Migration: `deals.bank_verification_url` (text, nullable), `rep_profiles.default_bank_verification_url` (text, nullable), and a `deal_bank_verification_clicks` table (deal_id, visitor_id, clicked_at) with grants, RLS, rep-scoped read policy, and a `record_bank_verification_click` security-definer function callable by anonymous merchants — mirroring the existing `record_deal_view` design so no anonymous insert policy is needed.
- `public_deal_view` is extended with `bank_verification_url` only; no internal rate or commission field is added.
- URL validation before save: trimmed, max 500 chars, must parse as an absolute `https://` URL. Anything else is rejected with a clear message, and the merchant page also re-checks the `https://` prefix before rendering the button, so a bad value can never become a live link.
- Files: `src/lib/deal-defaults.ts` (new checklist option + its constant label), `src/routes/_authenticated/deals.$dealId.tsx` (link field, default save, activity entry), `src/routes/offer.$dealId.tsx` (highlighted card + click recording), `src/routes/_authenticated/dashboard.tsx` (badge + CSV columns), `src/lib/view-tracking.ts` (reuse of the visitor ID helper).
- Tests: URL validation unit tests, plus additions to the mobile tap-target guards for the new merchant button and rep link controls.
- No pricing, acceptance, revision, or upload behavior changes.
