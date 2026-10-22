# Offer View Tracking

Give sales reps visibility into whether a merchant has opened their offer link, how many times, and when.

## What the merchant side does

- Each time the public offer page loads, the app records an anonymous view event for that deal: timestamp, plus a lightweight visitor fingerprint (random ID stored in the browser) so repeat opens from the same device are distinguishable from new devices.
- Repeat views within a short window (30 minutes, same device) are treated as one visit so a refresh or slider fiddling doesn't inflate counts.
- No personal data is collected — no IP storage, no names. Nothing about tracking is shown to the merchant.

## What the sales rep sees

Dashboard (Your Deals):
- An eye icon with a view count on each deal card.
- "Viewed" / "Not viewed yet" indicator with relative last-viewed time ("2h ago").
- A new sort option: Last viewed, plus a "Not viewed" quick filter alongside the existing status tabs.
- View count and last-viewed timestamp added as columns in the CSV export.

Deal page (Open Deal):
- A "Merchant Activity" panel near the top showing total views, unique devices, first viewed, last viewed.
- A timeline list of recent view events with full timestamps in the rep's local timezone.
- Live updates so a rep watching the page sees a view appear as it happens.

## Technical notes

- New table `public.deal_views`: `id`, `deal_id` (FK deals), `visitor_id` (text), `viewed_at` (timestamptz default now()), `user_agent` (text, truncated). Indexes on `(deal_id, viewed_at desc)`.
- Insert path: a `SECURITY DEFINER` function `record_deal_view(_deal_id uuid, _visitor_id text, _user_agent text)` that no-ops when an event for the same deal+visitor exists inside the last 30 minutes, and only accepts deals that exist. Grant `EXECUTE` to `anon` and `authenticated`; no direct anon INSERT/SELECT on the table.
- RLS: `SELECT` only for `authenticated` via `owns_deal(deal_id)` (rep owner or admin). No anon read — merchants cannot see view history. `GRANT SELECT ON public.deal_views TO authenticated; GRANT ALL TO service_role;`
- Aggregates for the dashboard come from a read-only view `deal_view_stats` (deal_id, view_count, unique_visitors, first_viewed_at, last_viewed_at) restricted the same way, so the dashboard makes one extra query instead of N.
- Merchant page calls the RPC once on mount via the browser client, `visitor_id` persisted in `localStorage`; failures are silent and never block the offer render.
- Deal page subscribes to realtime inserts on `deal_views` filtered by deal id, mirroring the existing revision-request subscription pattern.
- Tests: RPC dedupe behavior, role-based read access (non-owner rep sees nothing), and dashboard sort/filter/CSV columns.
