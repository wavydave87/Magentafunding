# Sales Dashboard Card Redesign + Deal Progress Bar

## Problem

Each deal card stacks every signal (views, sends, verification, uploads) in its own full-width row on the left, leaving a large empty column on the right. The card grows very tall and reads as a wall of pills. Action buttons sit in a wrapping cluster with Send Offer first.

## What changes

### 1. Two-column card layout

Restructure each deal card into a responsive grid: identity + money detail on the left, activity signals in a compact right-hand column that uses today's empty space. On mobile it collapses back to a single column.

```text
+---------------------------------------------------------------+
| Merchant Name  [Accepted] [Revision]        Progress ......   |
| $25,000 - $75,000 · 120 Business Days · Expires 2026-09-12    |
| [Internal  Buy 1.280  Upsell 0.06  Sell 1.281]                |
|                                                               |
| Accepted $50,000 · Daily Payment $533.33                      |
|                                                               |
| Activity:  [5 Views · 13h]  [Not Sent]  [Verified 2x]  [2 Up] |
|                          Copy Link | Open Deal | Preview | Send Offer |
+---------------------------------------------------------------+
```

- Activity pills become one wrapping inline row (not one pill per line), smaller and denser, keeping their existing links/targets and accessible labels.
- Accepted / revision summary lines stay as emphasized text under the money detail.

### 2. Action row ordering

Actions move to a right-aligned footer row inside the card. Order left to right: Copy Link, Open Deal, Preview, **Send Offer** last (rightmost), so the primary action is the furthest right, as requested.

### 3. Deal progress tracking bar

Add a compact 5-stage progress indicator per card, derived from data already loaded on the dashboard:

1. Built (deal exists)
2. Sent (`deal_sends` row)
3. Viewed (`deal_views` count > 0)
4. Accepted (`deal_acceptances` row)
5. Docs Received (`uploaded_documents` count > 0)

Rendered as a segmented bar with a caption of the current stage ("Stage 3 of 5 · Viewed"). Revision-requested deals show the bar in the gold/revision tone with the caption "Revision Requested". Uses existing brand tokens only; includes `role="progressbar"` with `aria-valuenow`/`aria-valuetext` for screen readers.

The same progress bar also appears at the top of the deal detail page header so the two views agree.

### 4. Other end-to-end UX improvements (small, contained)

- Card density: reduce vertical padding/gaps so a rep can scan more deals per screen.
- Truncate long merchant names with `min-w-0` + `truncate` so the header row never breaks on narrow widths.
- Show an "Expires In N Days" warning tint on the expiry text when a non-accepted offer expires within 3 days.

## Technical notes

- Files: `src/routes/_authenticated/dashboard.tsx` (card markup), `src/routes/_authenticated/deals.$dealId.tsx` (header progress bar), new `src/components/deal-progress.tsx` (shared bar + stage derivation), `src/styles.css` only if a new tone token is needed.
- No schema or query changes: all five stages come from queries the dashboard already runs.
- Update `src/routes/deals.tap-targets.test.ts` expectations if control positions change; keep 44px mobile tap targets on all pills and buttons.
