# Restore the expandable offers dashboard

## Goal
Bring back the cohesive expandable-card experience on the sales dashboard while keeping the useful search, Stage filters, sorting, and reporting added in the latest update.

## What will change

1. **Restore cards as the primary offers view**
   - Replace the desktop table and separate mobile summaries with one responsive card layout at every screen size.
   - Use the established two-column card composition on larger screens and a clean single-column arrangement on smaller screens.
   - Keep accepted and revision-requested offers visually distinct using the existing brand treatments.

2. **Bring back expand and collapse behavior**
   - Each offer card starts collapsed, except when only one result is shown.
   - The collapsed header shows merchant, Stage, funding range or accepted amount, term, and the most important timing or activity signal.
   - A clear chevron opens the card to reveal progress, pricing, activity, revision details, and actions.
   - Restore the dashboard-level Expand All / Collapse All control.

3. **Keep the strongest parts of the recent update**
   - Retain “Stage” terminology throughout the dashboard and exported report.
   - Retain merchant/email search, Stage filtering, amount range, views, uploads, expiry filters, sorting, active-filter chips, and saved preferences.
   - Keep the compact portfolio summary and make its filters work with the card results.

4. **Make the page feel cohesive**
   - Place search, filters, sorting, result count, and Expand All in one clear toolbar above the cards.
   - Remove the table-specific column controls and fragmented row-action presentation.
   - Use consistent spacing, restrained borders, familiar card hierarchy, and the existing Magenta brand tokens.
   - Highlight the whole card on mouse hover and keyboard focus without overpowering accepted or revision states.

5. **Preserve complete offer actions and signals**
   - Expanded cards retain the five-step deal progress display, views, send status, verification activity, uploads, expiration, accepted details, and revision notes.
   - Keep Copy Link, Open Deal, merchant preview, and Send/Resend, with Send/Resend remaining the rightmost primary action.
   - Preserve live revision notifications, CSV export, existing data access, and all offer calculations.

## Validation
- Update dashboard checks for expandable cards, chevrons, Expand All / Collapse All, Stage filters, keyboard focus, and mobile tap targets.
- Verify collapsed and expanded states on signed-in desktop and mobile views.
- Confirm search, filtering, sorting, summary filters, Send/Resend, and the current build all work without errors.

## Technical details
- Reuse the existing shared expandable tile, expand-all control, and deal-progress display rather than creating another card system.
- Keep the current queries and dashboard-only saved filter state; no backend or database changes.
- Remove only the table-specific presentation code and reconnect the decorated offer data to the earlier card structure.
