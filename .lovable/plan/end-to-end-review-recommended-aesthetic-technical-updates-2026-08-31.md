# End-to-End Review: Recommended Aesthetic + Technical Updates

I walked the three real surfaces in the running app (deals dashboard, deal detail page, merchant offer page) and captured what they actually render today. Below is what I found and what I would change, in priority order.

## What's already strong

- Brand system is coherent: one token set in `src/styles.css`, sticky brand header on both sides, gradient rule, Questrial/Jost pairing.
- Internal pricing is genuinely walled off from the merchant view; tracking (views, sends, bank-verification clicks, uploads) is all real data.
- Mobile tap-target tests and pricing/schedule unit tests exist.

## Priority 1 — Fix contradictory status (correctness, not cosmetics)

On the dashboard, "mercahnt 1" shows a `Sent` badge next to an activity line reading `Draft · Not Sent Yet`, and its progress caption reads `Viewed · 2 Of 5 Steps` while the Sent segment is dark. On the deal page the same deal says "Status: Sent" above "This offer hasn't been sent yet."

Cause: two independent notions of sent — `deals.status` (set by "Save & Mark Sent") and `deal_sends` rows (set by the Send Offer dialog).

- One derived delivery state used everywhere: `Draft → Link Shared → Sent → Opened → Accepted`, computed in one helper and consumed by the badge, the activity line, and the progress bar.
- Retire the ambiguous "Save & Mark Sent" button; manual marking becomes "Mark As Sent Manually" inside the Send Offer dialog, so every sent state has a timestamp and channel behind it.
- Progress caption names the *current* state, not the furthest lit segment, so "Docs Received · 3 Of 5" with Sent and Viewed dark can't happen; unreached-but-lit segments render as a dotted "out of order" style instead.

## Priority 2 — Dashboard density and scanability

Each card is ~290px tall with a large empty area under the money line, so five deals take two full screens.

- Convert the left column to a two-line summary: name + state on line one; range, term, expiry, accepted amount and daily payment as one wrapping metric row on line two. Internal pricing chips collapse into a single "Internal" chip that expands on hover/tap.
- Add a compact list/table view toggle (Cards | List) with the list view showing Merchant, State, Amount, Views, Uploads, Expiry, Actions — this is the view a rep with 40 deals actually needs, and it reuses the same derived state.
- Move `Copy Link / Preview` into a single overflow menu, leaving `Open Deal` and `Send Offer` as the only visible buttons; Send Offer stays rightmost.
- Title-case merchant names on display only (data stays as typed) so "mercahnt 1" and "bobby flay" stop looking broken.
- Add a top summary strip: Offers, Accepted, Accepted Volume, Awaiting Docs, Expiring In 3 Days — with each figure clicking through to the matching filter.

## Priority 3 — Deal page information order

Today the page opens with Offer Delivery + a full-height Merchant Activity log, and the actual offer builder (merchant/rep fields, pricing, checklist) sits below the fold. Three stacked action buttons crowd the top-right.

- Two-column layout at `lg`: left = builder (Merchant & Rep, Pricing, Structure, Closing Checklist), right = a sticky rail with delivery state, activity summary, and uploads.
- One sticky action bar with `Save` (disabled until dirty), `Preview`, `Send Offer`, plus an "Unsaved Changes" indicator — the current three-button stack goes away.
- Cap Recent Opens at 5 with "Show All"; drop the "Devices" tile or relabel it, since it currently equals total views and reads as a broken metric.
- Add a back link to Deals and breadcrumbs.

## Priority 4 — Merchant offer page polish and conversion

- Add a light 3-step progress strip (Choose Structure → Confirm → Upload Documents) so the merchant sees what's ahead.
- Sticky bottom bar on mobile with the current selection and Continue, so the CTA is always reachable.
- Add reassurance under the picker: term, expiry, "no obligation until you accept", rep contact card with call and email.
- Fix footer casing ("at Magenta.") and tighten hero vertical rhythm so the picker starts higher on 1280px screens.
- Amount and payment figures use tabular numerals so columns align across the three cards.

## Priority 5 — Technical health

- The dashboard runs seven separate unfiltered table reads (`deals`, `deal_acceptances`, `deal_revision_requests`, `deal_sends`, `uploaded_documents`, `deal_view_stats`, `deal_bank_verification_clicks`) and joins them in the browser. Replace with one `rep_deal_overview` view (or RPC) returning one row per deal with all counts and timestamps, and add server-side search, filter, and pagination. Fewer round trips, no client-side fan-out, and the CSV export can read the same shape.
- `src/routes/offer.$dealId.tsx` (1,326 lines) and `src/routes/_authenticated/deals.$dealId.tsx` (1,273 lines) should split into section components under `src/components/offer/` and `src/components/deal/`, with the offer math staying in `src/lib/pricing.ts`. Purely mechanical, but it's what makes the layout work above safe.
- Add unit tests for the new derived delivery state (every combination of status/sends/views/acceptance) and a snapshot test for the dashboard list view.
- Head metadata: `/offer/$dealId`, `/dashboard`, `/deals/$dealId`, `/auth`, and `/admin` need their own titles and descriptions; the offer route should also be explicitly `noindex` so client offer links never land in search results.
- Database linter reports the intentional `SECURITY DEFINER` view and tracking functions; those stay as-is and are already documented in security memory. No new schema beyond the read-only overview view.

## Suggested sequencing

1. Delivery-state unification + progress caption fix (highest confusion cost).
2. Dashboard density, list view, summary strip.
3. Deal page two-column layout and sticky save bar.
4. Merchant page steps, sticky mobile CTA, trust block.
5. Overview view + route file splits + tests + head metadata.

Tell me if you want all five, or start with 1–2.
