# Magenta Referral Partner Portal — Phase 1

Build the referral partner side into a real, working partner CRM. The internal sales dashboard is left untouched in this phase; bulk actions, the in-card activity timeline and the pipeline overview come afterwards on the existing card architecture.

The portal already has partner organizations, members, applications, commissions, referral visits, a support/training/resources library and organization-scoped access rules. This phase fills the gaps rather than rebuilding: short referral codes, QR tools, a real multi-step merchant application, partner-facing statuses, per-user and per-deal commission rates, richer team management, Magenta admin controls, and a HubSpot-ready sync layer.

Existing demo partners (Northgate Capital Partners, Bluestone Referral Group, Harbor Line Advisors) stay as they are. The three named demo profiles — South Florida Business Solutions with Sarah Martinez, Michael Rodriguez and Jessica Lee; Capital Growth Partners with David Chen and Amanda Williams; Premier Business Advisors with Robert Johnson — are added alongside them with their own codes, links, QR codes, referrals, applications, funded deals and commissions covering every status.

## 1. Referral codes and attribution

- Each organization gets a permanent short code (SFB001) and each partner user gets their own (MR102). Codes are issued once and never change, even after a rename or deactivation. Records stay keyed on the existing internal IDs; the short code is only what people see and share.
- Referral links: `/apply?ref=SFB001` for the organization and `/apply?ref=SFB001&user=MR102` for an individual. Both organization and user credit are recorded when a user link is used.
- Attribution is captured the moment a merchant lands, held through every step and page change, and stored on the application permanently. Nothing relies on names or email addresses.
- Historical attribution is never rewritten when a user is deactivated or a rate changes.

## 2. Referral Tools

A Referral Tools section in the partner workspace with the person's own link, Copy Link, Generate QR Code, Download QR Code and Preview Application. Organization admins also get the organization-level link and QR. Every QR resolves to exactly the link shown beside it.

## 3. Merchant application

A fast, mobile-first application with no account required, replacing the current single short form:

1. Business information
2. Owner information
3. Funding request
4. Business financials
5. Contact information
6. Documents / bank connection
7. Review and submit

- The record is created as soon as name, business and contact details are captured, so an abandoned application is still a visible lead.
- Progress auto-saves after each step, with a completion percentage and the last completed step recorded. The merchant can resume securely from an emailed or texted link.
- Short steps with conditional fields instead of one long form.
- Partners see progress and status only — never financial detail, bank data, documents or anything from underwriting.

## 4. Partner-facing statuses

A partner status vocabulary separate from Magenta's internal one: Referred, Application Started, Application Incomplete, Application Submitted, Under Review, Additional Information Needed, Approved, Declined, Funded, Closed/Withdrawn. A mapping layer translates internal underwriting statuses into these, so the two can diverge safely.

## 5. Dashboard, CRM and detail

- Dashboard KPIs: total referrals, submitted, incomplete, approved, funded, funded volume, commissions earned, commissions pending; a referral funnel from Referred through Funded; and a recent activity feed.
- Referrals CRM table: merchant, referral owner, organization, date referred, application progress, current status, last activity, funding amount, commission, action — with search, sorting and filters by status, date, user and organization. Organization admins see the whole organization; users see only what they are entitled to.
- Referral detail page with the headline facts and a chronological timeline of every status change, without any underwriting or pricing detail.

## 6. Commissions

- Rate resolution order: deal override, then user rate, then organization rate, then the Magenta default of 2%. Nothing is hard-coded at 2% beyond that default.
- The rate actually applied is stored on the funded deal, so later rate changes never alter historical commissions.
- Statuses: Pending, Scheduled, Paid, Held, Adjusted. Partners see funded amount, rate, amount, status, expected payment date and paid date — and nothing about Magenta's economics.

## 7. Team management

Organization admins get a team view with name, email, role, referrals, funded deals, funded volume, commission earned and status, plus Invite User, Resend Invitation and Deactivate. Every new user is issued a code, link and QR automatically. Deactivating preserves all history.

## 8. Magenta admin controls

Internal staff can see every organization, user, referral and application with attribution and internal IDs, change referral/deal status, set organization and per-user commission rates, override an individual commission with a required note, and activate or deactivate organizations and users.

## 9. HubSpot-ready sync layer

No live HubSpot connection is faked. A clean integration layer queues an outbound payload on submission (organization and user IDs and names, referral, application and merchant details, completion status, timestamp and source metadata) and accepts inbound status events. Mock events cover application_submitted, application_incomplete, under_review, additional_information_needed, approved, declined, funded, commission_created and commission_paid, so the whole lifecycle is testable today and real credentials can be dropped in later.

## Technical notes

- Reuse existing Magenta components, tokens (Magenta + Graphite, Sora + Manrope), shells, headers, badges and table patterns. No redesign of established UI.
- New tables: short codes on organizations and members, referral records, merchant application draft state with step/completion tracking and a resume token, partner-facing status history, commission rate settings at user level and per-deal override, and an integration event queue. Existing partner tables are extended rather than duplicated.
- Access is enforced in the data layer: organization-scoped rules for admins, entitlement-scoped rules for users, full access for Magenta staff. Underwriting and pricing fields are never selectable by portal users — partner reads go through constrained views/functions that exclude them.
- Status transitions and commission changes run through privileged server-side routines that check the caller's role before writing, and each writes a timestamped activity event.
- Resume links carry a single-use, expiring token; the application record is never reachable by guessing an ID.
- Demo data ships as seed inserts and is added to the existing purge script so it can be wiped before go-live.
- The internal sales dashboard, deal cards and their saved views are left intact so the deferred bulk actions, in-card timeline and pipeline overview can be added without a rebuild.  
The Phase 1 plan looks good. Proceed with it, with the following clarifications:
  1. Capture referral attribution immediately on landing by creating a referral visit/session before any merchant form data is entered.
  2. Validate referral codes server-side. If both organization and user codes are supplied, confirm the user belongs to that organization and derive the parent organization from the database.
  3. Keep original referral attribution separate from internal Magenta ownership. Internal reassignment must never alter attributed organization or partner user.
  4. Keep application status, partner-facing status, internal underwriting status, and funding status logically separate rather than forcing them into one status field.
  5. Make all integration events idempotent so duplicate inbound or outbound HubSpot events cannot create duplicate applications, status events, funded records, or commissions.
  6. Commission creation must also be idempotent. Once a funded deal creates a commission, repeated funded events must not create another one.
  7. Any post-funding commission change should create an adjustment/audit record rather than silently overwriting the original earned commission.
  8. Important admin actions should log actor, previous value, new value, reason where applicable, and timestamp.
  9. Reuse and extend existing schema/components wherever possible. Do not create parallel duplicate models.
  10. Leave the internal sales dashboard untouched in this phase.
  Before implementing, show me the specific schema changes, new tables/columns, routes, and existing components you plan to reuse versus extend.