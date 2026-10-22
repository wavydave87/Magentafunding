# Dashboard Card Polish: Responsive Layout, Send Status, Clickable Progress

## 1. Responsive, compact deal cards

- Card grid becomes a single column below `lg`, two columns (`minmax(0,1fr)_16rem`) at `lg` and up — same as today, but the right column no longer forces width: it gets `min-w-0`, and the progress bar plus action row are allowed to wrap.
- Action footer: on mobile it becomes a two-column grid (`grid-cols-2`) so Copy Link / Open Deal / Preview / Send Offer never overflow; from `sm` it returns to a right-aligned flex row with Send Offer last (rightmost). Send Offer spans both columns on mobile so it stays the obvious primary action.
- Header row uses `grid-cols-[minmax(0,1fr)_auto]` on mobile so a long merchant name truncates instead of pushing the status badges out of the card.
- Progress bar stays full-width in its column at every breakpoint; stage labels stay accessible via `aria-valuetext` (no extra width cost).

## 2. Send status: Draft → Sent → Opened

- Group the send/view signals into an explicit status line at the top of the activity group: `Draft` / `Sent <time ago>` / `Opened <time ago>`, derived from `deal_sends` and the existing view stats (no schema change).
- Send Offer dialog: after a successful log it shows an inline confirmation ("Sent by email to …, logged at <time>") in addition to the toast, and the Send Offer button on the card flips to `Sent`/`Resend` labeling once a send exists.
- Card badge already shows Sent from `deals.status`; add "First Opened <date/time>" next to it when view stats have a first-viewed timestamp, so a rep can see delivery and first open at a glance.

## 3. Grouped activity pills

- Wrap views / sent / verification / uploads pills in one bordered, tinted "Activity" cluster with `flex flex-wrap gap-1.5`, smaller pill padding, and `min-h-11 md:min-h-8` retained for mobile tap targets.
- Cluster sits under the money detail on mobile and in the right column above the progress bar at `lg`, so no pill row stretches card width.

## 4. Clickable progress steps

- `DealProgress` gains an optional `dealId` (and `linkTargets`) prop. When present each of the five segments renders as a `Link` to the deal page with the matching hash:
  - Built → `#closing-checklist`
  - Sent → `#offer-delivery`
  - Viewed → `#merchant-activity`
  - Accepted → `#merchant-activity`
  - Docs Received → `#merchant-uploads`
- Each segment gets an accessible name ("Jump to Sent"), a focus ring, and a slightly taller hit area on mobile. Without `dealId` the bar renders exactly as today (used on the deal page header, where it instead scrolls in-page).
- The deal page's Closing Checklist section gains `id="closing-checklist"` + `scroll-mt-24` (the other three anchors already exist).

## 5. Empty and loading states

- While the dashboard's secondary queries (sends, views, uploads, bank clicks) are still loading, each pill renders as a fixed-size skeleton of the same height so the card does not jump when data lands.
- Uploads pill always renders: `No Uploads Yet` in the muted style when the count is zero, rather than disappearing.
- Verification pill always renders when the deal requires bank verification: `Not Verified Yet` when there are no clicks.
- Deal page: Merchant Uploads and Merchant Activity get skeleton rows while loading and clear "Nothing yet — merchant hasn't opened the offer" style empty copy.

## Technical notes

- Files: `src/routes/_authenticated/dashboard.tsx`, `src/components/deal-progress.tsx`, `src/routes/_authenticated/deals.$dealId.tsx`, `src/components/send-offer-dialog.tsx`.
- No schema, RLS, or query changes; all new signals come from existing queries. Secondary queries expose their `isLoading` flags for the skeletons.
- Existing brand tokens only; keep `min-h-11` on every mobile control so `src/routes/deals.tap-targets.test.ts` keeps passing, and extend that test with a guard for the progress-step links and the grouped pill cluster.
