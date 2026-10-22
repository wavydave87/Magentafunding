# Deal Search on the Sales Dashboard

Add a search box to Your Deals so a rep can find an offer instantly by typing the merchant name.

## What you'll see

- A search field with a magnifier icon at the top of the filter row, placeholder "Search Merchant Or Deal…".
- Results narrow as you type, case-insensitive, matching anywhere in the merchant name (typing "riv" finds "Riverside Diner"). Extra whitespace is ignored.
- Search combines with the existing status filters and sort — searching inside "Accepted" only shows accepted matches.
- A clear (X) button inside the field resets the search; Escape also clears it.
- The counts line and CSV export reflect what's currently on screen, so you can search and export just those deals.
- When nothing matches, an empty state reads "No offers match your search." with a "Clear Search" button.

## Accepted-offer highlight, unified

The merchant "selected offer" card and the sales "accepted" card will share one set of theme tokens — surface tint, border, and ring — so the two sides can never drift apart. Changing the tint in one place updates both surfaces at once.

## Notes

Merchant name is the deal's name in this app, so one field covers both "merchant" and "deal name". Search runs on the deals already loaded in the dashboard, so it's instant with no extra loading.

## Technical

- `src/routes/_authenticated/dashboard.tsx`: add a `query` state, apply a normalized `includes` match on `deal.merchant_name` inside the existing `rows` useMemo (before status filtering), and add `query` to the dependency list. Render an `Input` with `Search`/`X` icons from lucide-react in the controls row, using existing tokens plus `min-h-11 md:min-h-9` and `focus-ring` for tap-target/a11y parity. Field gets an `aria-label` and the result count region gets `aria-live="polite"`.
- `src/styles.css`: add a `--selected-ring` token (derived once from `--selected-border`) alongside the existing `--selected` / `--selected-border` pair in both light and dark blocks, then have `card-selected` and `card-accepted` both compose the same shared declarations — same background, border, and ring — with only the elevation shadow differing where needed. No duplicated `color-mix` expressions.
- `src/routes/deals.tap-targets.test.ts`: extend with assertions that the search control carries a 44px tap target and a focus ring, and that `card-selected` and `card-accepted` resolve to the same tint/border/ring tokens in `src/styles.css`.
