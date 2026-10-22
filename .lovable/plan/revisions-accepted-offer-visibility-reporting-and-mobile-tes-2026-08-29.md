# Revisions, accepted-offer visibility, reporting, and mobile tests

## 1. Merchant can revise their choice

- On the offer page, add a "Revise My Choice" button.
  - Before acceptance: reopens the picker (clears the current selection, keeps the slider value) so they can choose again.
  - After acceptance: opens a short form — new structure (preset or custom amount + daily/weekly) and an optional note — and submits a revision request. The original acceptance stays untouched as the record of truth.
- After submitting, the merchant sees a confirmation ("Your rep has been notified") and the requested change summarized on the page, so a refresh still shows it.
- Only one open revision request per offer at a time; submitting again replaces the open request.

Notification to the rep:
- The deal is flagged as "Revision Requested" in the dashboard (highlighted card).
- An email is sent to the rep with the merchant name, current accepted structure, the requested structure, and the note. Requires a sending domain for this project; if none is configured yet, the email setup dialog is shown first and the in-app flag works regardless.

## 2. Selected offer highlight (matching the uploaded picture)

- Selected preset/custom card gets a soft pink-tinted background with a magenta border and ring, matching the reference: brand-colored title, dark payment figure, divided rows, full-width "Select This Option" button.
- Unselected cards stay white with a light border. Highlight is done with existing brand tokens (new soft-pink surface token added to the design system rather than hardcoded colors).
- The "Your Selected Structure" panel uses the same tinted surface so the chosen offer reads as one highlighted block.

## 3. Title casing

- Card titles, stat labels, section headings, and button labels on the offer page use Title Case ("Daily Payment", "Total Payback", "Select This Option", "Your Selected Structure", "Early Payoff Options", "Upload Your Closing Documents").
- Sales-side pages get the same pass: "Your Deals", "New Offer", "Copy Link", "Buy / Upsell / Sell" internal chip, status badges ("Draft", "Sent", "Accepted", "Expired", "Revision Requested").
- Merchant-entered values (business names) are never re-cased.

## 4. Sales side: accepted offers stand out

- Accepted deals render with a highlighted card (success-tinted surface + accent left edge) plus the accepted amount, frequency, payment, payback and acceptance date on the row.
- Revision-requested deals get their own highlight (gold/attention tint) and show the requested change inline.

## 5. Reporting and tracking

- Dashboard gains a filter bar: All / Pending / Accepted / Revision Requested / Expired, plus sorting by newest, merchant name, amount accepted, or expiration.
- A summary strip shows counts and total accepted funding.
- "Export CSV" button downloads the current filtered/sorted list: merchant, status, funded range, term, buy/upsell/sell (internal), accepted amount, frequency, payment, payback, accepted date, expiration, rep, document count. Generated in the browser from the data already loaded — no server round trip.

## 6. Accepted offer documents for the rep

- On the deal page, an "Uploaded Documents" section lists each client upload with file name, size and upload time.
- Each row has a Download action using a short-lived signed URL from the private documents bucket (reps can only reach their own deals' files).
- A "Download All" action fetches the files and saves them individually; empty state explains no documents have been uploaded yet.

## 7. Mobile tap-target and layout test in CI

- Add a Playwright test run at a 390x844 mobile viewport asserting:
  - Every interactive control on the offer page (frequency radios, preset "Select This Option" buttons, slider thumb, exact-amount input, revise button, accept button, tel/email links, upload drop-zone button) has a hit box of at least 44x44 CSS px.
  - No horizontal overflow (document scroll width equals viewport width) and no card content clipping.
  - Controls remain visible and non-overlapping in both the pre-acceptance and accepted states.
- Wire it as a script so it runs alongside the existing unit tests.

## Technical notes

- Migration: new `deal_revision_requests` table (deal_id, requested_amount, frequency, computed payment/payback, note, status, created_at) with GRANTs, RLS allowing anon insert/read when the deal is open and rep/admin read+update on owned deals; a `request_revision` security-definer function to write the row and set `deals.status = 'revision_requested'`.
- Email send goes through a server function that reads the rep email server-side; merchant input is validated with Zod. Requires the project email domain scaffold.
- Files touched: `src/routes/offer.$dealId.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/deals.$dealId.tsx`, `src/styles.css` (selected/accepted surface tokens), new `src/lib/revisions.functions.ts`, `src/lib/csv.ts`, and a new mobile Playwright spec.
- Pricing logic in `src/lib/pricing.ts` is unchanged; revision math reuses `computeStructure`.
