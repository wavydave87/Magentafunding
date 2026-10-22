# Expandable tiles on sales rep offers views

## 1. Sales rep dashboard (offers list) — card view

Convert each deal card in `/dashboard` into a collapsible tile:

- Collapsed state shows a compact summary line: merchant name, status badge, funding range, term, and the most important state summary (expires / accepted amount / revision requested).
- Expanded state reveals the existing full card content: activity pills, `DealProgress`, revision note, and action buttons.
- Sensible default: cards start **collapsed** so a rep with many deals can scan the list; the first card expands when there is only one deal.
- Chevron indicator, full keyboard support, and `aria-expanded` wired up.
- The existing list view is left unchanged.

## 2. Deal builder page — section tiles

Convert the major sections on `/deals/$dealId` into collapsible tiles:

- Sections to tile: Offer Delivery, Merchant Activity, Merchant Uploads, Offer Accepted, Revision Requested, Merchant & Rep, Pricing, Structure, Fees, Early Payoff Discount, Closing Checklist, Client Preview Math.
- Each tile shows a compact summary line when collapsed, e.g.:
  - Merchant & Rep: merchant name and rep name.
  - Pricing: buy rate, upsell points, sell rate.
  - Structure: funding range and term.
  - Fees: origination percent and other fees.
  - Early Payoff Discount: number of tiers, or "Off".
  - Closing Checklist: selected count out of total.
  - Client Preview Math: number of preset options.
  - Offer Delivery: send count or "Not sent".
  - Merchant Activity: view count or "Not viewed".
  - Merchant Uploads: file count or "No uploads".
  - Offer Accepted: accepted amount, frequency, payment.
  - Revision Requested: count of open revisions.
- Sensible defaults:
  - New deals: Merchant & Rep and Client Preview Math expanded; configuration tiles collapsed.
  - Existing deals: Offer Delivery, Merchant Activity, Offer Accepted, and Revision Requested expanded when they contain activity; supporting configuration tiles collapsed.
- Chevron indicator, full keyboard support, and `aria-expanded` wired up.
- Top error/warning banners, page title, and action bar (Save, Preview, Send) stay visible above the tiles.

## 3. Shared component

Create a reusable `DealTile` component that wraps the existing `@/components/ui/collapsible` primitive. It provides the header layout, chevron rotation, summary slot, content slot, and consistent focus styles. Reuse it in both the dashboard card view and the deal builder sections.

## 4. Tests and validation

- Update any dashboard or deal builder tests that assume sections are always visible.
- Run typecheck and the existing test suite.
- Verify mobile tap target and persistent brand banner tests still pass.
