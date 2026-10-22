# Project review: remove redundancies + UX/UI improvements

Findings below come from reading the current code. Each item says what to change.

## A. Redundancies to remove

1. **Unused UI library files.** 28 of the 41 files in the shared UI kit are never imported anywhere (sidebar at 744 lines, chart, carousel, calendar, command, menubar, resizable, table, select, form, popover, pagination, breadcrumb, drawer, and others). Only button, input, label, textarea, badge, checkbox, switch, tabs, dialog, dropdown-menu, collapsible, accordion and the toast provider are in use. Delete the unused files; they add build surface and make "which component do I use" ambiguous.
2. **Three money formatters.** `pricing.ts` (Intl), `partner.ts:money` (rounded `$1,234`) and `partner-portal.ts` (currency style) format dollars three different ways, so the sales side and the partner side show the same figure differently. Consolidate into one `formatMoney` / `formatMoneyPrecise` pair in `src/lib/format.ts` and re-export from the old modules.
3. **Ad-hoc date formatting.** Raw `new Date(x).toLocaleString()` appears in the deal builder (3 places), ticket thread, and notifications while `view-tracking.ts` already exports `formatStamp` and `timeAgo`. Route every timestamp through those two helpers.
4. **Two page-title patterns.** `PortalPageHeader` exists and is used on 20 screens, but the deal builder, applications list, new-application wizard, portal home, application detail and apply page each hand-roll their own `h1` at three different sizes. Move them all onto the shared header so titles stop drifting.
5. **Two sign-in pages.** `/auth` (internal) and `/portal/login` (partner) are near-identical forms with different copy. Keep both URLs but render one shared `SignInCard` with a variant prop.
6. **Oversized route files.** `deals.$dealId.tsx` (1,458), `dashboard.tsx` (944), `library.tsx` (778) and `portal.applications.new.tsx` (897) mix data fetching, math and markup. Split into section components under `src/components/deal/`, `src/components/library/`, `src/components/apply/`. Mechanical, no behaviour change.
7. **Dashboard fan-out.** The dashboard still issues several unfiltered table reads and joins them in the browser. Replace with one read-only overview view/RPC returning one row per deal.

## B. Sales side (dashboard + deal builder)

- Add a summary strip above the list: Offers, Accepted, Accepted Volume, Awaiting Docs, Expiring In 3 Days — each clicking through to the matching filter.
- Persist per-user view state (cards vs list, expanded tiles, last filter) so reps don't re-set it every visit.
- Deal builder: make the action bar (Save / Preview / Send / Expand All) sticky, with a clear "Unsaved Changes" indicator and Save disabled until dirty.
- Add breadcrumbs and a back link to Offers on the deal page; today the only way back is the logo.
- Tabular numerals on all money and payment figures so columns align.

## C. Partner side (portal)

- The partner home KPIs are static tiles; make each one a link into the filtered list it describes.
- Application wizard: add a persistent step rail with completed/current/remaining state and a visible "saved" indicator, plus per-step validation summaries instead of only field errors.
- Applications list: add saved filters (status, date range, amount) and empty states that tell the partner what to do next.
- Commissions: show a running total for the current filter and a payout-status legend.
- Notifications: group by day and add mark-all-read.

## D. Customer side (public offer + apply)

- Add a 3-step progress strip (Choose Structure → Confirm → Upload Documents) so the merchant sees what's ahead.
- Sticky bottom bar on mobile carrying the current selection and Continue, so the CTA is always reachable.
- Trust block under the picker: term, expiry, "no obligation until you accept", and a rep contact card with call and email.
- Upload tile: per-file status (received / needed), accepted formats and size limit stated up front.
- Tighten hero vertical rhythm so the picker starts higher on 1280px screens, and fix remaining footer casing.

## E. Cross-cutting

- One shared status-badge module for deal, application, document and commission states (currently three sets of colour logic).
- Focus-visible rings and 44px tap targets audited on partner and customer screens (sales side already has tests) — extend the existing tap-target tests to `/portal/*` and `/apply/$slug`.
- Head metadata check on every route added since the last pass (portal screens, library, commissions).

## Suggested sequencing

1. A1–A4 (dead code, formatters, shared header) — low risk, immediately visible consistency win.
2. B (sales polish) and D (customer conversion) in parallel.
3. C (partner polish).
4. A6–A7 (file splits + dashboard overview view) with tests.

Tell me if you want all of it, or a subset to start.
