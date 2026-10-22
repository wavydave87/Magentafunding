# Portal polish: expandable tiles, one consistent header, clickable content

## 1. Offer page — expandable tiles

Every major block on the public offer page (structure picker, offer detail/schedule, early-payoff, "What We'll Need to Move Forward", document upload) becomes a collapsible tile:

- Each tile shows a compact summary line when collapsed (e.g. "3 of 5 items received", "Payment $1,240 weekly", "2 payoff tiers").
- Clicking the header (or pressing Enter/Space) expands the tile to the full detail that exists today. Nothing is removed.
- Sensible defaults: the offer/structure tile and the upload tile start expanded; supporting detail tiles start collapsed so the page reads at a glance.
- Chevron indicator, full keyboard support and `aria-expanded` wired up.

## 2. One consistent section header across the app

The pink-to-brand gradient wash currently sitting behind the Support title becomes the shared header treatment for every internal screen, and runs true edge-to-edge of the browser window (full bleed, not inset to the content column).

Screens updated to use the same header component: Offers/Deals dashboard, Partner Network (list and organization detail), Commissions, Support (inbox and ticket), Library, Administration.

Typography is standardised in that header: title in the display font at one size, one-line subtitle in muted body text, actions right-aligned. Screens that currently hand-roll an `h1` are switched to the shared header so the sizes stop drifting.

## 3. Library: published Resources and Training are not openable

In Library, published resources and training courses list with a "Published" badge but there is nothing to click into.

- Resources rows: title becomes a clickable action that opens the file (short-lived signed link) or the external link in a new tab, plus an inline detail expansion showing description, category, file name/size and publish state.
- Training rows: course title links into a course detail view listing its modules, with each module openable; module list is visible inline in Library too.
- Also verify the partner-facing Resources and Training screens show and open the same published records, so publishing in Library is visibly reflected on the partner side.

## 4. Commissions: open a deal in full

On both Commissions views (all-partner and the per-partner tab), each commission row becomes clickable and opens the full record:

- Row click / Enter opens the linked application detail (business, reference, status timeline, documents, linked deal) rather than only the partner organization.
- Keeps the existing checkbox, org link, adjust and bulk actions working — clicking those does not trigger the row navigation.

## Technical notes

- Collapsible tiles use the existing `@/components/ui/collapsible` primitive; offer-page tap-target tests are updated alongside.
- `PortalPageHeader` gains a full-bleed wash (viewport-width gradient band) and becomes the single source of page titles; `bg-brand-wash` / `bg-rule-gradient` tokens in `src/styles.css` are reused, no new colours.
- Library gets a signed-URL open helper shared with the partner Resources screen; training module rows reuse the existing module renderer.
- Commission rows link to `/partners/applications/$applicationId` (internal) via the existing application detail component; rows without a linked application stay non-clickable.
- No schema or policy changes.
