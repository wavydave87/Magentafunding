# Magenta Referral Partner Portal — Targeted Completion

Use the current project as the baseline. Preserve the working partner login, inquiry form, shell, overview, referral filters and mobile cards, referral links and QR generation, merchant token flow, training, resources, support, and internal sales workspace. Extend working components where needed. Do not change `/dashboard`, `/deals/*`, `/offer/*`, or internal underwriting workflows.

Complete this work in two passes. **Pass 1 must pass its validation checkpoint before Pass 2 begins.**

## Pass 1 — Correct and finish the partner portal

### 1. Enforce partner entitlements in the database

Add a server-side entitlement rule for partner-facing records:

- Organization Admins can see their organization’s records, including referrals attributed to the organization link with no individual owner.
- Partner Users can see records attributed to them or granted through a specific approved entitlement. Membership in the organization alone does not grant access to another member’s records or to every organization-link referral.
- Inactive members and paused organizations have no partner data access.

Apply this rule to referrals, applications, partner-visible events, commissions, and related partner reads. Interface filters must never serve as the access boundary. Add access tests for two Partner Users in the same organization, an Organization Admin in that organization, a user in another organization, and a paused organization.

### 2. Expose only partner-safe application data

Partner-facing pages must use a constrained view or server functions that return only approved business identity, reference, application progress, partner-facing status, relevant dates, funded amount, and entitled commission information.

Remove direct partner access to sensitive columns and related owner, document, and draft records. Do not return banking or credit data, requested financials, underwriting details, pricing, internal notes, or internal documents merely because the interface does not display them. Preserve the existing opaque-token merchant draft flow.

Repoint the overview, referral list, referral detail, and remaining partner application screens to the constrained source. If using a database view, verify its grants and execution behavior so it cannot bypass the underlying entitlement rule.

### 3. Retire the duplicate authenticated merchant application

`/portal/applications/new` currently provides a separate merchant application inside the partner portal. Retire that flow and redirect its existing links to the partner’s personalized `/apply` entry point.

`/portal/applications/$applicationId` currently uses a shared application-detail component that loads full application, owner, document, and event records. Remove sensitive tabs, queries, and direct writes from its **partner variant**, or redirect it to a partner-safe referral detail. Keep the **internal variant** and its internal workflow intact. Check existing navigation and bookmarks so no partner route continues to expose the old screens.

“Refer a Business” should share the personalized merchant application link or record a lightweight manual referral and provide that link. It must not start another authenticated merchant application.

### 4. Use one secure invitation system

Remove or fully disable the legacy `inviteTeamMember` server function and any route that can call it. The hashed, expiring, single-use invitation flow is the only partner invitation path.

Organization Admins may invite standard Partner User roles into their own organization. Only Magenta Admins may create or promote an Organization Admin. Invitations must never grant an internal Magenta role.

For an email with an existing Supabase Auth identity, use the provider’s verified account flow to attach membership. Accepting an invitation must not change that account’s password. Protect acceptance against concurrent use with a guarded, single-use token transition. Because Supabase Auth provisioning and database updates may not share one transaction, make partial failures recoverable and retries idempotent. Preserve resend, revoke, duplicate-live-invite prevention, and create/resend/revoke/acceptance auditing. Store only token hashes.

### 5. Block paused organizations

The portal gate and server-side entitlement checks must reject a non-active organization, including when an already signed-in user opens a portal URL directly. Show a clear paused-access state with an appropriate contact path. A login-page check alone is insufficient.

### 6. Complete referrals and commissions

Give a manually recorded referral a detail view before an application exists. Show its owner, date recorded, permitted contact details, and linked application when one appears.

Support multiple funded deals and commissions for one application throughout the CRM, referral detail, statements, exports, and totals. Do not use a single-row lookup or a map keyed only by application ID that discards earlier commissions. Preserve deal-level attribution and commission history.

### 7. Finish the existing screens

- **Team:** Show each member’s referral, submitted, funded, and commission totals, plus their own referral code, link, and QR. Keep commission rates read-only to partners.
- **Commissions:** Add Total Earned and Scheduled summary cards, and show expected and paid dates for each record.
- **Referral Tools:** Add a print-friendly QR sheet while preserving copy, download, and preview.
- **Settings:** Allow Organization Admins to edit approved organization contact details. Add only security controls supported by the current auth provider, such as password change and signing out other sessions where available. Describe notification preferences as configuration until delivery through a channel is verified.
- **Mobile:** Confirm the resulting lists, detail pages, dialogs, QR sheet, and settings work on a phone without horizontal overflow or inaccessible actions.

### Pass 1 validation checkpoint

Test Partner User and Organization Admin on desktop and phone. Cover empty states, manual referrals, organization-link attribution, referral and QR ownership, incomplete applications, multiple commissions per application, paused access, invitation lifecycle, and direct attempts to read another member’s records or sensitive fields.

Do not begin Pass 2 until these tests pass.

## Pass 2 — Magenta Admin View as Partner / Work as Partner

Add **View as Partner User** and **View as Organization Admin** actions to the appropriate internal partner records. Start every session in view-only mode.

Keep the real Magenta Admin signed in. Store a short-lived impersonation session server-side containing the real admin, effective partner user, effective organization, role, mode, start and end times, and source record. Resolve this context on every Partner View request.

The admin’s ordinary Supabase session has broader internal rights. Therefore, **every portal read and write during Partner View must pass through a server-side effective-identity access layer** that applies the selected partner role’s exact data and action limits. Do not let portal components make ordinary admin-session database queries while Partner View is active. The partner shell must show only partner navigation. Referral links and QR codes must belong to the effective partner.

View-only mode must reject every mutation through Partner View endpoints on the server, including direct API attempts. **Work as Partner** requires a separate explicit confirmation and is available only to Magenta Admins. It permits only actions the effective partner role could normally take; Magenta-only actions require leaving Partner View.

Display a persistent banner on every portal page naming the effective partner, organization, role, mode, and real admin. Provide **Exit Partner View**, which ends the effective session and returns the admin to the record where they started without signing out.

Reuse and extend the existing `partner_admin_audit_log`; do not create a parallel audit log. Record session start, mode changes, exit, and every impersonated write. Write entries with the real admin, effective user and organization, session ID, action, entity, previous and new values, timestamp, and reason where required. Present writes as performed by Magenta on behalf of the partner.

Test both effective roles, view-only direct API write rejection, Work as Partner role limits, cross-organization denial, sensitive-data exclusion, session expiry, exit restoration, link/QR identity, and audit completeness. The view-only API tests apply to **Partner View endpoints**; normal internal Magenta Admin actions remain available in the internal workspace.

## Completion report

List the migrations, functions, routes, and components changed; the access and mobile tests run; and any remaining deployment dependencies. Verify rather than assume Supabase Auth configuration, session storage and expiry, audit retention, and invitation email delivery. Until a verified sending domain is available, support secure copy-link invitations without claiming that email was sent.