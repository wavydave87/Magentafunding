# Selected-offer highlight, sales-side polish, revision alerts, and tests

## 1. Selected offer highlight (merchant side)

- Selected preset/custom card: soft pink surface (`--selected`) + magenta border and ring, brand-colored title, dark payment figure, divided rows, full-width "Select This Option" button. This is the current `card-selected` treatment; audit it against the reference and tighten border/ring weight and row dividers where they drift.
- Unselected cards stay white with a light border, no ring.
- All highlighting keeps using the existing `--selected` / `--selected-border` tokens — no hardcoded colors.
- "Your Selected Structure" panel: remove the pink tint. It becomes a plain card surface with a neutral border so only the chosen card reads as highlighted.

## 2. Sales side accepted highlight

- Accepted deals on the dashboard and the accepted panel on the deal page switch from the green/success tint to the same soft-pink surface with magenta border and ring used for a selected offer on the merchant page.
- Revision-requested highlight (gold) stays as-is so the two states remain distinguishable.

## 3. Revision request notifications for the agent

- Realtime: the dashboard subscribes to new rows in the revision-requests table and, on arrival, shows a toast ("{Merchant} requested a change") and refreshes the list so the deal immediately flips to Revision Requested.
- Persistent indicator: a count badge in the dashboard header plus the existing card highlight, so an agent who was not on screen still sees it on next load.
- Access rules are unchanged: an agent only ever receives rows for deals they own (admins see all).

## 4. Sales deal page mobile tap-target and layout tests

- New source-level test mirroring the merchant-page test, covering the deal page: builder inputs and save button, accepted-offer panel, revision panel actions, upload list rows, per-file Download, and Download All.
- Asserts each control carries a >=44px tap target and a visible focus style, and that the layout stacks to a single column at mobile widths.

## 5. Role-based end-to-end tests

- Playwright/API checks confirming:
  - Owning agent can list a deal's uploads, generate a signed download URL, and update a revision request.
  - A second agent who does not own the deal is blocked from all three.
  - Admin can do all three on any deal.
  - Anonymous merchants can create a revision request on an open deal but cannot read uploads of other deals or download files.
- Test users and deals are created and torn down inside the run.

## 6. Demo accepted offer with client uploads

- Seed a visible demo deal under Dave's account: accepted structure recorded, plus two sample uploaded documents (a PDF and an image) in the private documents bucket so the sales view shows real rows with working Download / Download All.
- Named clearly (e.g. "Demo Diner (Sample)") so it is obvious it can be deleted later.

## Technical notes

- Tokens: reuse `--selected` / `--selected-border`; retarget `card-accepted` to those values instead of `--success-soft`, and drop the tint class from the selected-structure panel in `src/routes/offer.$dealId.tsx`.
- Files touched: `src/styles.css`, `src/routes/offer.$dealId.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/deals.$dealId.tsx`, new `src/routes/deals.tap-targets.test.ts`, new role-based E2E script.
- Realtime uses the browser client subscription on the revision-requests table filtered by the deals the agent can already read; no new database policies needed. In-app only — no email sending, which would require a verified sending domain.
- Demo data is inserted with server-side privileged access and sample files uploaded to the existing private bucket; no schema change.
