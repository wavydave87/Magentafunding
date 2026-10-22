# Referral Pipeline, Demo Data and Phase 3

Three pieces of work: fill the portal with believable data, make the referral-to-payout path work end to end, and add the Phase 3 depth (deal integration, analytics, commission configuration, automation).

## 1. Seed realistic demo data

Current state: 3 partner organizations and 39 applications exist, but there are 0 partner members, 0 commissions, 0 referral visits, 0 deals, and no resources, trainings or FAQs. Referrals and Commissions therefore render empty.

Seed (fictional, `.example` domains, clearly removable):

- Commission rate and an enabled referral link on each of the three organizations.
- 2-4 team members per organization with mixed roles (organization admin, manager, broker, referral rep) and statuses.
- Referral attribution: convert a slice of existing applications to `referral_link` source with a referring member, plus a spread of referral link visits over the last 90 days so the Referrals KPIs read sensibly.
- Commissions for every funded application, mixed pending / approved / paid with payment references and paid dates spread across this month and this year.
- Internal sales-rep side: a set of deals owned by the existing three rep profiles across draft / sent / accepted, with presets, closing checklist items, PIF tiers, a few views and one accepted offer — so the sales dashboard, Commissions and Partner Network detail screens are not blank.
- A starter Library: a handful of resources, two trainings with modules, and ~8 FAQs.

All of it goes in a seed migration and is added to the existing `supabase/seed/purge-partner-demo-data.sql` purge script so it can be wiped before go-live.

## 2. Referral pipeline end to end

The public link and submission RPC already exist. Completing the loop:

- **Public referral page** — polish `/apply/{slug}` (and `?ref=` member attribution) with the Magenta portal styling, validation messages, and a confirmation screen showing the application reference.
- **Intake** — referral submissions land in Partner Network with their source and referring member visible on the application detail.
- **Approval** — internal staff set approved amount and move the application through review to approved from the application detail screen.
- **Funding** — marking funded records the funded amount and date; the existing trigger writes the commission row at the organization's rate.
- **Payout** — internal Commissions screen approves, marks paid with a reference and date, or voids; the partner sees the status change and gets a notification.
- Each transition writes a partner-visible timeline event so the partner can follow progress.

## 3. Phase 3

### Partner-deal integration
- "Create Deal" button on an approved partner application: generates a draft deal pre-filled from the application (merchant name, contact, requested amount) and stores `linked_deal_id`.
- Application detail shows the linked deal's live status; the deal page shows which partner and application it came from.

### Partner analytics
- New partner Analytics screen: submissions and funded volume over time, approval and funding conversion rates, average time in each stage, commission earned by month, and a per-member leaderboard.
- Matching internal view on the partner organization detail so staff see the same numbers per partner.

### Admin commission configuration
- Per-organization default rate editable by admins, with an audit note in the timeline.
- Manual override of amount, rate or status on an individual commission, with a required note.
- Bulk "mark approved" and "mark paid" on selected commissions plus CSV export of the payout run.

### Automation hooks
- Linked deal marked funded → application flips to funded, funded amount copies over, commission is created, partner is notified.
- Merchant accepts an offer on a linked deal → partner notification and timeline event.
- Application set to missing information → partner notification plus an open action item on their dashboard until they confirm.
- Stale application nudge: applications sitting in the same stage too long surface a reminder to the partner and a flag for the assigned rep.

## Technical notes

- Seed data ships as SQL migrations (schema-free inserts) and is mirrored in the purge script; no seeding at page load.
- Status transitions stay inside `security definer` RPCs so partner RLS is unchanged; new internal-only RPCs get `execute` revoked from `anon`.
- Commission overrides and rate changes are admin-only, enforced by a role check inside the server function before any privileged write.
- Automation runs as database triggers on `deals` / `deal_acceptances` / `partner_applications` reusing `partner_notify()`; stale nudges are evaluated on read rather than a scheduler.
- Analytics are aggregate queries against existing tables — no new reporting tables.
