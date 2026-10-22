# Consolidated sales offers workspace

## Goal
Simplify the selected dashboard area into one polished, data-first workspace that is faster to scan, filter, and act on.

## What will change

1. **Consolidate the dashboard controls**
   - Replace the separate status chips, sort control, view toggle, expand control, and result count with one compact command bar.
   - Keep merchant search prominent.
   - Add a clear Filters control with an active-filter count and one-click reset.
   - Keep Export Report and New Offer in the page header.

2. **Make the table the primary workspace**
   - Default to a single responsive offers table instead of maintaining competing card and list experiences.
   - Preserve the useful offer information and actions: merchant, stage, amount, views, uploads, expiration, open, send/resend, copy link, and merchant preview.
   - On smaller screens, switch rows into compact offer summaries so information remains readable without horizontal overflow.

3. **Rename State to Stage throughout this dashboard**
   - Change the column heading, filter labels, accessible names, and exported report heading from “State”/“Status” to “Stage” where they describe the offer workflow.
   - Keep the existing underlying workflow logic unchanged.

4. **Add column filtering and sorting**
   - Merchant: text search.
   - Stage: multi-select filter using the actual derived stages shown in each row.
   - Amount: minimum and maximum range.
   - Views and Uploads: zero / one-or-more conditions.
   - Expires: expired, next 3 days, next 7 days, or later.
   - Make sortable columns visibly interactive and show the active sort direction.
   - Display active filters as removable chips above the results.

5. **Simplify the portfolio summary**
   - Convert the five separate metric cards into a compact, divided summary strip within the workspace.
   - Keep Offers, Accepted, Accepted Volume, Awaiting Docs, and Expiring in 3 Days.
   - Clicking a metric applies its matching table filter without duplicating the main controls.

6. **Improve mouse and keyboard feedback**
   - Highlight the full row on hover with a restrained magenta-tinted surface and left-edge accent.
   - Reveal secondary row actions on mouse focus while keeping primary actions discoverable.
   - Match hover behavior with keyboard focus, visible focus rings, and 44px touch targets where needed.
   - Use short, reduced-motion-safe transitions so filtering and row interaction feel immediate.

## Visual direction
- **Palette:** existing Magenta + Graphite brand tokens, with gold reserved for urgency.
- **Typography:** Sora headings and Manrope body text.
- **Composition:** the selected “Consolidated data workspace” direction—one bounded workspace containing the metric strip, command bar, active filters, table, and result footer.
- **Density:** compact and professional, with minimal card framing, 8px-or-less control radii, tabular numerals, subtle dividers, and no nested cards.

## Technical details
- Keep the existing deal queries, derived delivery-stage logic, live revision notifications, send dialog, CSV export, and access controls.
- Refactor dashboard-only filter state into typed column filters; no database changes.
- Persist the selected filters and sort locally for each rep, while providing a visible reset action.
- Add Sora and Manrope through the document head and map them to the existing semantic font tokens.
- Extend dashboard tests for Stage naming, column filters, hover/focus treatment, responsive behavior, and tap targets.
- Verify the completed workspace in signed-in desktop and mobile views and confirm the current build has no errors.
