# Magenta Referral Partner Portal — Phase 1B

Two passes. Pass 1 completes the partner-facing experience end to end. Pass 2 adds Magenta admin "View as Partner" / "Work as Partner" with full auditing. The internal sales workspace (`/dashboard`, `/deals/*`, `/offer/*`) is untouched in both passes.

## Reuse / Extend / Create

**Reuse as-is:** brand header and footer, `PortalPageHeader`, `PartnerKpiCard`, `ToneBadge`, status badges, `ApplicationTimeline`, `CommissionTable`, `Pipeline`, `NotificationBell`, `PortalGuard`, the `_portal` route gate, training/resources/support pages and their data access.

**Extend:** `PartnerShell` (sidebar navigation on desktop, drawer on mobile, page title + organization name + profile menu in the header, role-aware items), `PartnerApplicationTable` (owner column, funding and commission columns, filters, stacked cards on small screens), `ReferralToolsCard` (personal vs organization link split), the team page (invitations), the settings page (profile, organization, security, notification preferences).

**Create:** the split-screen partner sign-in page, a "Become a Partner" inquiry page, the invitation accept page, the first-login welcome state, a referral detail page, a referral tools page, an invite dialog, the impersonation banner and its two confirmation dialogs.

---

## Pass 1 — Partner-facing experience

### Sign-in and entry

- `/portal/login` becomes a split screen: left panel with the Magenta mark, "Grow Your Business With Magenta", the Refer / Track / Earn points and a quiet Refer → Apply → Approved → Funded → Earn lifecycle strip; right panel a Partner Sign In card (email, password, Remember Me, Sign In, Forgot Password).
- Below the card: "Interested in becoming a Magenta referral partner?" → **Become a Partner** → `/partners/inquiry`, a short public interest form that records the enquiry for Magenta follow-up. No open self-registration.
- Handled states: default, loading, wrong credentials (generic wording), reset requested, reset completed, account deactivated, organization deactivated, invitation pending, invitation expired.

### Invitations and first login

New `partner_invitations` table: organization, invited email, intended role, invited by, token hash, created/expires/accepted/revoked timestamps, resend count, status. Tokens are random, single-use, stored hashed only, and expire.

Flow: a Magenta admin or an organization admin sends an invite → the recipient opens `/portal/invite/$token` → the token is validated server-side → they confirm their name, set a password, accept terms → their portal account and organization membership are created or activated with the intended role → their permanent referral code, link and QR are issued → the invitation is marked accepted.

Rules: resending invalidates the previous token; revoking blocks the link; no duplicate live invite for the same email and organization; organization admins may only invite into their own organization and only into non-admin partner roles; invitations can never grant internal Magenta roles; every create, resend, revoke and acceptance is audited.

First login shows a light welcome panel ("Welcome to Magenta, Sarah — your referral workspace is ready") highlighting referral link, QR, referrals and commissions, with **View My Referral Tools**.

### Shell and navigation

Sidebar on desktop, drawer on mobile: Overview, Referrals, Referral Tools, Commissions, Team (organization admins only), Training, Resources, Support; Settings and Sign Out pinned at the bottom. Header shows the current page title, organization name, notification bell and a profile menu (My Profile, Organization, Settings, Manage Team for admins, Sign Out). No internal Magenta navigation is ever rendered here.

### Overview `/portal`

Time-of-day greeting and one-line summary, **Refer a Business** as the primary action and **Copy My Referral Link** beside it. KPI cards: Total Referrals, Applications Submitted, Applications Incomplete, Approved, Funded, Funded Volume, Commissions Earned, Pending Commission — funded volume and commissions weighted visually. A five-stage funnel with counts that deep-links into the filtered referrals list. A recent activity list of partner-safe events with business name, timestamp and badge, each opening its referral. A referral link card with Copy, View QR, Download QR and Preview, with a My Link / Organization Link switch for admins.

### Referrals `/portal/referrals`

Table of merchant, referral owner, date referred, application progress, current status, last activity, funding amount, commission and an action. Search, sort, and filters for status, owner, date range and progress. Organization admins see the whole organization; partner users see only their own. Stacked cards below the small breakpoint. Empty state: "No referrals yet" with a View Referral Tools call to action.

### Referral detail `/portal/referrals/$referralId`

Business name, owner, date referred, completion, partner-facing status, last update, funding amount and the partner's own commission, plus a chronological timeline (Referral Created → Application Started → Submitted → Under Review → Approved → Funded). Incomplete applications show "Application Incomplete — 60% Complete" with a plain explanation and a disabled, clearly-labelled placeholder for a future Send Reminder — never the specific missing fields.

### Referral tools `/portal/referral-tools`

The personal referral link with Copy, Generate QR, Download QR and Preview Application, a print-friendly QR, a short "How attribution works" note, and a visually separate Organization Referral Link block for admins.

### Commissions, Team, Training, Resources, Support, Settings

- Commissions: Total Earned / Pending / Scheduled / Paid cards over the existing commission table with merchant, funded date, funded amount, rate, amount, status, expected payment and paid date. Empty state included.
- Team (admins only): members with referrals, funded deals, funded volume, commission earned and status; Invite Team Member; per-member view with their code, link and QR; resend, revoke and deactivate. Deactivation preserves history. Commission rates stay read-only to partners.
- Training and Resources keep their existing architecture, regrouped into partner-friendly categories with search where supported.
- Support keeps the existing ticket flow; internal-only notes stay invisible.
- Settings: profile, organization (edit rights by role), security (change password, sign out other sessions where supported) and notification preferences stored but plainly marked as not yet delivering messages.

### Data boundaries

Partner-facing reads never return factor/buy/sell rates, payback, payment amounts, bank or credit data, internal notes, risk grades, pricing, margin, other lenders, or internal documents. This is enforced in the access rules and functions, not by hiding columns in the interface.

### Pass 1 exit check

Usable end to end, on desktop and phone, as both a partner user and an organization admin, with every empty state present.

---

## Pass 2 — Magenta admin Partner View

- Entry points on the internal partner organization and partner user screens: **View as Organization Admin** and **View as Partner**.
- An impersonation session records actor admin, effective partner user, effective organization, mode, start and end times, reason where required, and a session id. Authorization and auditing always use the real admin identity; all partner reads use the effective partner identity and the same constrained partner access as a real partner.
- A persistent, unmistakable banner on every portal page naming the partner, organization, role, mode and admin, with **Exit Partner View** restoring the admin's normal context and returning them to the record they launched from — no sign out required.
- Default mode is view-only: anything that would write is blocked. **Work as Partner** is a separate, explicitly confirmed mode, Magenta admins only, with the confirmation stating that actions will be recorded as performed by Magenta on behalf of the partner.
- Every impersonated write records admin, effective user and organization, action, entity, previous and new values, timestamp, reason where required and the session id, phrased as "Performed by [Admin] on behalf of [Partner User]". Mode transitions are recorded too.
- All impersonation authorization happens server-side. Partners cannot impersonate anyone; no organization can reach another.

---

## Technical notes

- New table `partner_invitations` with organization-scoped access rules; token hashes only, validated through security-definer functions called from server functions.
- Invitation accept, resend, revoke and impersonation start/stop/mode-change run as TanStack server functions with role checks in the handler.
- Email/password sign-in must be enabled on the backend before the invite-acceptance password step works; invite emails require a connected sending domain — until then invite links can be copied from the team screen.
- Impersonation context is carried server-side per request, keyed by session id; it never replaces the admin's authentication session.
- Existing `partner_admin_audit_log` is reused for invitation and impersonation auditing, extended with the session id and effective-identity fields.  
  
he Phase 1B plan is approved. Before implementation, make these final adjustments:
  1. **Reuse the existing authentication provider and identity model for invitations.** Do not create a separate password or credential system for partner users. The invitation flow should provision or activate the user's existing auth identity using the current backend's supported secure flow.
  2. **Invitation roles should be explicitly limited.** Organization admins may invite only standard Partner Users. Only Magenta Admin may create or promote an Organization Admin unless a future permission explicitly allows otherwise.
  3. **Do not store raw invite or impersonation tokens anywhere.** Only hashes or secure server-side session references should persist.
  4. **The public partner inquiry form should remain separate from portal access.** Submitting `/partners/inquiry` must never create an account, membership, referral code, or portal access automatically. It should only create an inquiry/lead for Magenta follow-up.
  5. **“Refer a Business” behavior must be explicit.** It should either:
    - open the partner’s personalized merchant application link in a new tab, or
    - provide a lightweight manual referral flow that creates a referral and generates/sends the merchant application link.
    Do not build a second unrelated merchant application inside the authenticated portal.
  6. **Partner User visibility should follow entitlement, not necessarily only** `member_id`**.** If the current data model allows referrals to be reassigned internally or shared within an organization, use the approved authorization rules rather than assuming `partner user = rows where attributed_member_id = current user`.
  7. **Organization Admin reporting should include organization-level referrals with no individual member attribution.** These should not disappear simply because they were created from the organization link.
  8. **Impersonation view-only must be enforced server-side for writes.** Disabling buttons in the UI is not enough. Any mutation attempted during a view-only impersonation session must be rejected by the server.
  9. **Work as Partner should not permit Magenta-only actions from inside the partner UI.** It only enables actions the effective partner role itself could normally perform. Internal administrative actions still require exiting Partner View.
  10. **Audit original and effective identity on every impersonated request that mutates data.** Continue using the existing audit log with `actor_admin_id`, `effective_user_id`, `effective_organization_id`, `impersonation_session_id`, action, before/after state, reason where required, and timestamp.
  11. **Referral links and QR codes shown during impersonation must belong to the effective partner identity**, not the Magenta admin.
  12. **Do not mark notification settings as active delivery.** Store preferences now, but clearly treat them as configuration only until actual email/SMS/in-app notification delivery is implemented.
  13. **Keep the Partner Portal completely isolated from internal navigation.** Even a Magenta Admin in Partner View should see only the Partner Portal shell until they choose Exit Partner View.
  14. **At the end of Pass 1, test these four scenarios before starting Pass 2:**
    - Partner User on desktop
    - Partner User on mobile
    - Organization Admin on desktop
    - Organization Admin on mobile
    Validate navigation, data scope, referral links/QR, incomplete applications, commissions, empty states, team permissions, and sensitive-data exclusion.
  With those changes included, proceed with Pass 1 first. Do not begin impersonation until the partner-facing experience passes the Pass 1 exit check.
  One additional UX point: I like the current navigation, but I would make **Referral Tools** especially prominent. For a referral partner, creating/sharing a referral is one of the highest-frequency actions. On desktop, I’d keep it in the sidebar, but also keep a persistent **Refer a Business** button in the header or dashboard.
  I’d also define that action now:
  **Refer a Business** → small modal with:
  - **Share My Link**
  - **Show QR Code**
  - **Copy Application Link**
  - **Submit Referral Manually** if you want the partner to enter the merchant’s basic contact info first
  That would make the portal feel much more purposeful instead of just being a reporting dashboard.
  ChatGPT can make mistakes. Check important info.