# Commission Filters and a Per-Partner Commissions Tab

## What you get

**1. Filters on Partner Commissions (`/commissions`)**

Alongside the existing status dropdown, the toolbar gains:

- **Partner filter** — a dropdown listing every partner organization that has commissions, so you can isolate one partner's payouts.
- **Search** — free text matching the business name, application reference, or payment reference.
- **Date range** — Paid this month / this year / all time, based on the paid date.
- **Live totals** — the Pending / Approved / Paid cards and CSV export reflect the filtered set, so an export is always exactly what's on screen. A small line shows "Showing X of Y commissions".
- Clearing filters is one click; selection for bulk approve/pay resets when filters change so you can never pay a row you can't see.

**2. Each partner already has a page — it gains a Commissions tab**

The partner organization page (`/partners/<organization>`) already has Overview, Members, Applications and Analytics tabs. Adding a **Commissions** tab there gives you every commission for that partner in one place:

- Statement table: application, business, funded amount, rate, commission, status, paid date, payment reference.
- Totals for pending, approved and paid at the top of the tab.
- Export CSV for just that partner.
- Admins get the same override and mark-paid actions available on the main commissions page.

From the main commissions list, the partner name on each row becomes a link to that partner's page, so you can jump from a payout to the full partner record.

## Technical notes

- No database changes. All data already exists in `partner_commissions`, `partner_organizations` and `partner_applications`, and existing policies already allow internal staff to read them.
- Extract the commission statement table plus the admin override dialog out of `src/routes/_authenticated/commissions.tsx` into a shared `src/components/partner/commission-table.tsx`, so `/commissions` and the org page's new tab render identical UI.
- Filter state lives in URL search params on `/commissions` (`status`, `org`, `q`, `range`) using `validateSearch` + `fallback`, so a filtered view is shareable and survives refresh.
- The org page's Commissions tab reuses the existing `["partner-organization", organizationId]` query, extended to select the full commission columns (it currently selects only `amount, status, paid_at, created_at` for analytics).
- Existing bulk actions (`partner_bulk_commission_status`) and override RPC (`partner_override_commission`) are reused unchanged.
