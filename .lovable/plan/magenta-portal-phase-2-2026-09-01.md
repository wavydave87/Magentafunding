# Magenta Portal — Phase 2

Rebrand the partner-facing copy to a single "Magenta Portal" voice, then build the six remaining partner modules plus notifications on top of the existing Partner Network foundation. Deal Builder, offers, and merchant pages are untouched.

## 1. Rebrand and consistent portal style

- Every partner screen gets the same header block: page title, one-line subtitle, and actions on the right, using the existing brand wash / card / badge tokens. No new visual language.
- Copy pass: "Partner Dashboard" becomes "Magenta Portal — Dashboard", "Partner Network" stays the internal name but all partner-facing copy, page titles, meta descriptions, footer notes and empty states say "Magenta Portal".
- Partner navigation grows to: Dashboard · Applications · Referrals · Commissions · Team · Resources · Training · Support, with a notification bell. On desktop the primary five stay inline and the rest collapse into a "More" menu; mobile keeps the existing compact dropdown.
- Internal navigation grows by: Partner Network (existing) plus admin-only Resources & Training library management and a Support inbox.

## 2. Referrals — shareable tracked links

- Each organization gets a public referral URL at `/apply/{slug}` (and per-member `?ref=` attribution).
- The public page is an unauthenticated short form (business, contact, requested amount, use of funds) that creates a `submitted` application attributed to that organization and member.
- Referrals screen in the portal: the link with copy/QR, link visit and submission counts, and a table of submissions with status, all attributed to the member who shared it.
- The link is disabled automatically when the organization is not active.

## 3. Commissions — rate per organization

- Magenta admins set a commission rate (%) per organization on the internal organization page.
- When an application is marked funded, commission is calculated as rate × funded amount and recorded on a commission record; admins can adjust an individual record and mark it paid with a payment date and reference.
- Partner Commissions screen: pending vs paid totals, month-to-date and year-to-date, and a statement table (application, funded amount, rate, commission, status, paid date) with CSV export.
- Internal side gets a commissions view per organization plus a "Mark Paid" action.

## 4. Team

- Organization admins manage their own members: invite by email with a role, deactivate, reactivate, and change role. All scoped to their own organization only.
- Roles keep their existing meaning; viewers are read-only, referral reps can submit and see only their own referrals/applications, managers and org admins see everything in the organization.
- Internal admins keep the ability to create the first organization admin.

## 5. Resources and Training — admin-managed library

- Magenta admins upload files or add links, with a title, description, category, and audience (all partners, or a specific partner type).
- Resources screen: searchable, categorized cards with download/open, files served via short-lived signed links from a new private bucket.
- Training screen: courses made of ordered modules (video link or document); each member sees progress, can mark modules complete, and the organization admin sees team completion.

## 6. Support — tickets plus FAQ

- Partners open a ticket (subject, category, message, optional attachment) and see a threaded conversation with Magenta plus a status (open, awaiting partner, resolved, closed).
- Internal staff get a support inbox: filter by organization and status, reply, change status, assign to a rep.
- FAQ is an admin-managed, searchable list of question/answer entries grouped by category, shown above the ticket form.

## 7. Notifications

- In-app notification records for: application status changes, missing information requested, offer available, funded, commission paid, ticket replies, and new referral submissions.
- Bell in the header with an unread count, a dropdown of recent items each linking to its source, and a "Mark all read" action. Live updates via realtime, matching the existing revision-request toast behaviour.
- Internal staff get notifications for new applications, new referral submissions, and new/updated support tickets.

## Technical notes

- New tables (all with grants, RLS and org-scoped policies mirroring the Phase 1 model): `partner_commission_rates` fields on `partner_organizations`, `partner_commissions`, `partner_referral_links`, `partner_referral_visits`, `partner_resources`, `partner_trainings`, `partner_training_modules`, `partner_training_progress`, `partner_support_tickets`, `partner_support_messages`, `partner_faqs`, `partner_notifications`.
- Partner reads stay RLS-scoped through `current_partner_org()`; no partner-reachable path exposes `deals`, `buy_rate`, `upsell_points`, other organizations' rows, or `internal` visibility events.
- Privileged writes (commission calculation and payment, resource/training/FAQ management, ticket status changes, provisioning) go through `createServerFn` handlers that verify the internal admin role before touching the admin client, following the existing `partner-admin.functions.ts` pattern.
- The public `/apply/{slug}` route is a top-level SSR route calling a public server function using the publishable key; the insert runs through a security-definer RPC with rate limiting and validation, never through broad anon write policies.
- Commission creation on funding is a database trigger so it cannot be bypassed by the UI.
- New private bucket `partner-resources` for library files, with the same 25MB and file-type validation approach as `partner-documents`.
- New routes under `src/routes/_authenticated/`: `partner.referrals`, `partner.commissions`, `partner.team`, `partner.resources`, `partner.training`, `partner.training.$courseId`, `partner.support`, `partner.support.$ticketId`, `partner.notifications`, plus internal `partners.$organizationId` tabs and `support` inbox.
- Isolation tests extend `supabase/tests/partner-access.sql` to cover the new tables: cross-org reads, non-admin member management, self-serve commission edits, forged ticket messages, and training progress spoofing.
- Demo data for the new modules is seeded separately and covered by the existing purge script.

## Out of scope

Payouts to real payment rails, email/SMS delivery of notifications (in-app only until an email domain is connected), and deeper application-to-deal conversion automation.
