# Sending offers, amortization schedule, and funding date

## Today's send process (verified in code)

Sending is entirely manual: on Your Deals the rep clicks "Copy Link", which writes `/offer/:dealId` to the clipboard, then pastes it into their own email or text. Nothing records that an offer was sent, the merchant has no email or phone stored on the deal, and there is no reminder or resend path. The only feedback loop is the view tracking added earlier.

## 1. Real send flow

**Merchant contact on the deal.** Add merchant email and merchant phone to the offer builder (phone reuses the existing formatting helper). Both optional for drafts, email required to email-send.

**Send Offer action.** Replace the bare "Copy Link" with a Send Offer dialog on both the dashboard card and the deal page:
- Email tab: sends a branded offer email from the app to the merchant (rep name, merchant name, expiry date, big "View Your Offer" button, rep phone/email in the footer), with an optional personal note the rep can type.
- Text tab: sends the offer link by SMS to the merchant phone.
- Manual tab: copy link, a QR code the merchant can scan from a screen, and pre-written email and text copy the rep can paste into their own inbox.

**Send tracking.** Record every send attempt (channel, destination, who sent it, when, delivery outcome) and surface it on the deal page next to Merchant Activity: "Emailed to … · 2h Ago", plus a Resend button and an at-a-glance state on the dashboard (Not Sent / Sent / Viewed / Accepted). Sending also flips a draft to sent, so status stops depending on the rep remembering to hit Send.

**Nudge.** A "Send Reminder" action on offers that were sent but not viewed, or viewed but not accepted, reusing the same email/text templates with reminder copy.

Notes on the two paid paths:
- Email uses Lovable's built-in email sending. It needs an email domain connected to this project first — a short DNS step you do once, and I will walk you through it before any email can actually leave the app.
- SMS needs a third-party texting provider (Twilio). It requires a Twilio account and credentials from you, and Twilio charges per message. The Text tab ships disabled with a clear "Connect texting" note until you add those credentials.

## 2. Payment amortization schedule (client side)

On the offer page, inside the selected-structure block, add a toggle: "Show Payment Schedule". Collapsed by default so the page stays clean.

When on, the client sees:
- A summary strip: number of payments, payment amount, first payment date, final payment date (payoff date), total payback.
- Milestone rows at 25% / 50% / 75% / 100% paid: date, amount paid to date, remaining balance.
- The full per-payment table below, scrollable: payment number, date, payment amount, cumulative paid, remaining balance — daily payments skip weekends (business days), weekly payments land on the same weekday each week.

The schedule recalculates instantly with the daily/weekly toggle and the custom-amount slider, and comes from the existing pricing math — no new formulas, no rate or commission data exposed. Keyboard and screen-reader accessible like the rest of the picker, and it prints/screenshots cleanly.

## 3. Proposed funding date

The rep sets an allowed funding window in the builder (earliest and latest date, defaulting to the next business day through the offer expiry). On the offer page, above the schedule, the client picks a "Requested Funding Date" inside that window with a date picker; weekends and out-of-window dates are blocked.

That date drives the schedule: payments begin the next business day after funding, and the payoff date is calculated from it. Before a date is chosen, the schedule shows relative days (Day 1 … Day N) with a hint to pick a funding date for exact dates.

The chosen date is saved with the acceptance and with revision requests, shows on the rep's deal page and dashboard, and is included in the CSV export so it can be tracked for reporting.

## Technical notes

- Migration: `deals` gains merchant_email, merchant_phone, funding_window_start, funding_window_end; `deal_acceptances` and `deal_revision_requests` gain requested_funding_date; new `deal_sends` table (deal_id, channel, destination, sent_by, status, created_at) with rep/admin-only read policies and GRANTs. The public offer view exposes only the funding window and merchant-safe fields — no rates.
- Amortization lives in `src/lib/pricing.ts` as a pure `paymentSchedule(structure, fundingDate)` helper with unit tests for business-day stepping, weekly cadence, rounding of the final payment, and payoff-date correctness.
- Sends go through a server function (rep-authenticated) that renders the email template and writes the `deal_sends` row; the app email template lives in `src/lib/email-templates/`. SMS is behind the same server function with a provider check that returns a clear "not configured" state.
- Existing acceptance, revision, upload, view-tracking and highlight behaviour is untouched.
- Tests extended: mobile tap targets for the schedule toggle, date picker and Send dialog; role tests that only the owning rep and admins can send or read send history.

## Order of work

1. Migration + amortization helper and tests.
2. Client schedule toggle and funding-date picker.
3. Builder fields, Send Offer dialog with manual tab + QR, send tracking and dashboard states.
4. Email domain connection, then live email sending and reminders.
5. SMS once Twilio credentials exist.
