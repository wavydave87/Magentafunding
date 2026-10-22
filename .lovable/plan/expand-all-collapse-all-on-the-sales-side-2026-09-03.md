# Expand All / Collapse All on the sales side

Add a single toggle control that opens or closes every tile at once, on both sales-side screens.

## 1. Deal builder (`/deals/$dealId`)

- A small "Expand All" / "Collapse All" button sits in the page action bar, next to Save / Preview / Send.
- Clicking it opens every section tile (Offer Delivery, Merchant Activity, Merchant Uploads, Offer Accepted, Revision Requested, Merchant & Rep, Pricing, Structure, Fees, Early Payoff Discount, Closing Checklist, Client Preview Math).
- Label flips to "Collapse All" once everything is open; clicking again closes all tiles.
- Individual tiles can still be opened/closed on their own afterwards; the button label reflects whether all tiles are currently open.
- The existing sensible per-tile defaults stay unchanged on first load.

## 2. Sales dashboard (`/dashboard`)

- The same button sits in the list header, next to the search field / view toggle, applying to the deal cards in card view.
- "Expand All" opens every deal card; "Collapse All" closes them. Cards still start collapsed on load.
- Hidden in list view, where there is nothing to expand.

## Technical notes

- `DealTile` gains optional controlled props (`open`, `onOpenChange`) while keeping today's uncontrolled `defaultOpen` behaviour for any caller that does not pass them.
- Each page holds a `Record<tileId, boolean>` open-state map, seeded from the current default rules, plus an `expandAll` / `collapseAll` handler. Tile ids already exist on the deal builder; dashboard cards key off deal id.
- Button uses the existing `Button` variant styling with a chevrons-up-down icon, `aria-pressed` for state, and the 44px mobile tap target the tap-target tests require.
- No backend, schema, or business-logic changes.

## Validation

- Typecheck and the existing tap-target / layout test suites.
- Visual check of both screens with all tiles expanded and collapsed.
