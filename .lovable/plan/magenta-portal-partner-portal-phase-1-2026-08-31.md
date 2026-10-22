# Magenta Portal — Partner Portal (Phase 1)

Extend the existing app into "Magenta Portal" by adding an ISO / Referral Partner module. Nothing in the current Deal Builder, merchant offer page, dashboard, or admin screens changes except the shared header navigation.

## What gets built

**1. Partner data model (additive migrations only)**
- `partner_organizations` — name, legal name, type (ISO / referral / strategic), status (pending, active, restricted, suspended, inactive), primary contact, phone, website, assigned Magenta rep, slug.
- `partner_members` — links a login to one organization with a role: organization admin, manager, broker, referral rep, viewer.
- `partner_applications` — the external submission record, fully separate from `deals`. Business, owner, financing and banking fields, plus an optional `linked_deal_id` so Magenta can later attach an internal offer.
- `partner_application_owners` — one or more owners per application.
- `partner_application_events` — timeline entries with `partner` or `internal` visibility.
- `partner_documents` — file metadata pointing at a new private storage bucket.

**2. Access rules (database-enforced)**
- Partner users can only ever read/write rows belonging to their own organization.
- Partner users get no access to `deals`, `rep_profiles` internals, buy rate, upsell points, or admin data. Existing rep/admin rules are untouched.
- Only `partner` visibility timeline events are readable by partners.
- Documents live in a private bucket, served through short-lived signed links, scoped to the owning organization.
- Only organization admins can invite or change members — and only inside their own organization.

**3. Accounts**
- A Magenta admin creates the partner organization and its first organization admin from the internal Partner Network screen.
- From then on, that organization admin can invite and manage their own team members (team management UI itself ships in Phase 2; Phase 1 includes the invite capability used to create the first admin plus the underlying roles/permissions).

**4. Role-aware navigation**
- Product name in the shell becomes **Magenta Portal**; the logo, header layout, footer and styling stay as they are.
- Internal users see: Dashboard · Offers · Partner Network (+ Administration for admins).
- Partner users see: Dashboard · Applications (the remaining partner tabs appear in Phase 2).
- Signed-in partner users are routed to the partner dashboard automatically; internal users keep landing on the current deals dashboard.
- Mobile gets a compact menu in the existing header — no bulky sidebar.

**5. Partner screens** (all using existing cards, badges, buttons, typography and brand tokens)
- `/partner` — "Welcome back, [First Name]" with organization name, KPI cards (Applications, Approved, Funded, Funded Volume, Commissions Pending/Paid as placeholders), a pipeline strip by stage with counts and value, and a "Needs Attention" list. Stage click filters Applications.
- `/partner/applications` — search by business / ID / contact, tabs (All, Needs Attention, In Review, Approved, Funded, Declined), filters, sortable table on desktop that becomes stacked cards on mobile.
- `/partner/applications/new` — six-step wizard (Business, Owner, Financing, Banking, Documents, Review) with autosave to a `started` application, compact progress indicator, drag-and-drop uploads, and a confirmation screen showing the application ID and status.
- `/partner/applications/:id` — header with business name, ID and status; Requested / Approved / Funded / Commission summary; Overview, Business, Owners, Financials, Documents, Offers, Activity sections; a prominent partner-visible timeline; and a highlighted action panel listing required items when status is "missing information".

**6. Internal Partner Network**
- `/partners` — internal-only list of organizations with type, primary contact, assigned rep, status, application/approved/funded counts and volume, with search and filters.
- `/partners/:orgId` — organization overview, members, and applications; admins can change status, reassign the Magenta rep, and create the organization's first admin user.
- Internal reps can open any partner application and see everything, including internal-visibility timeline notes.

**7. Status system**
- A shared status badge component covering all 13 application statuses, mapped onto existing tokens (gold for offer available, success for approved/signed/funded, coral for declined/missing info, plum/primary for review and contracts, muted for duplicate/expired). Every badge carries a label and icon so colour is never the only signal.

**8. Demo data**
- Three fictional partner organizations with members, three applications in each status, matching timeline events and documents, and a couple of applications linked to existing demo deals. Seeded via migration, no real personal data.

## Technical notes

- New routes live under `src/routes/_authenticated/` (`partner.*`, `partners.*`) behind the existing auth gate, with an added membership check that redirects internal users away from partner routes and partner users away from internal routes.
- Partner reads/writes go through `createServerFn` handlers using `requireSupabaseAuth`, so RLS applies as the signed-in user; privileged actions (creating an organization admin login) verify the internal admin role before touching the admin client.
- New shared components: `PartnerStatusBadge`, `ApplicationStatusBadge`, `DocumentStatusBadge`, `PartnerKpiCard`, `PartnerPipeline`, `PartnerApplicationTable`, `PartnerApplicationTimeline`, `PartnerNav` — all built from `@/components/ui/*` and existing utilities (`card-elevated`, `bg-brand-wash`, `focus-ring`, etc.). No new design tokens unless a status genuinely lacks one.
- `AppShell` is extended, not replaced; `BrandHeader`/`BrandFooter` keep their current markup.
- After implementation: verify rep login, admin login, deals dashboard, deal create/edit, offer preview, merchant offer page, acceptance, revisions, uploads, bank verification, send/view tracking, CSV export and rep management all still work, plus cross-organization isolation checks.

## Out of scope this iteration

Referrals, commissions, training, resources, team management UI, support tickets, notifications, the public `/apply/[slug]` page, and deeper deal integration — those are Phase 2 and 3.
