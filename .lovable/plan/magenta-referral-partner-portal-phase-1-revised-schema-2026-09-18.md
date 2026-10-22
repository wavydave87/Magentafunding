# Magenta Referral Partner Portal — Phase 1 (revised schema)

Approved plan, with the eight requested corrections folded in. Internal `/dashboard`, `/deals/*` and `/offer/*` stay untouched.

## 1. Opaque merchant URLs

No application ID ever appears in a public URL.

- Public routes are `/apply/start/$token` and `/apply/resume/$token`.
- Tokens are random 32-byte values; only a hash is stored. Each has an expiry, a revoked flag and a rotation counter, and maps server-side to the application.
- Start tokens live for the active session (rolling expiry on each save); resume tokens are single-use and short-lived, and issuing a new one revokes the previous.
- Every merchant read/write takes the token, never an ID.

## 2. Visits and referrals stay separate

- `partner_referral_visits` (already exists) is extended, not replaced: add `referral_code_used`, `member_code_used`, `landed_at`, `source`, `campaign`, `converted_application_id`, `user_agent_hash`. This is the anonymous landing record, created the moment someone opens a link.
- `partner_referrals` is a distinct table for an identifiable referred merchant — created when a merchant is actually identified (contact captured, or a partner submits a referral manually). It carries the attributed organization and member, the originating visit, merchant identity, and the resulting application. Anonymous traffic never lands here.

## 3. Deal-level commission override

New table `partner_deal_commission_overrides`: `deal_id` (nullable), `application_id` (nullable, at least one required), `override_rate_percent`, `reason` (required), `created_by`, `created_at`, `revoked_at`. This is where a pre-funding override lives.

Resolution at funding: deal override → member rate → organization rate → 2% Magenta default. The resolved rate and its `rate_source` are frozen onto the commission row and never recomputed.

## 4. Commission uniqueness keyed to the funded deal

One application can legitimately produce more than one funding event (renewals, second positions), so uniqueness keys on the canonical funded deal:

- `partner_commissions.deal_id` added and backfilled from `partner_applications.linked_deal_id`.
- Unique index on `deal_id` where `deal_id is not null`; the existing application-level unique constraint is dropped so renewals aren't blocked.
- Where a commission has no deal, a deterministic funding-event key keeps it idempotent.
- The funded trigger re-checks existence before inserting, so repeated funded events never double-create.

## 5. Four independent lifecycle states

Each state is a canonical current-value column, with history recorded separately:

| State | Where it lives |
|---|---|
| Application progress | `partner_applications.application_state` (draft / in_progress / incomplete / submitted / withdrawn) plus `completion_percent`, `last_completed_step` |
| Partner-facing | `partner_applications.partner_status` (new enum: referred, application_started, application_incomplete, application_submitted, under_review, additional_information_needed, approved, declined, funded, closed_withdrawn) |
| Internal underwriting | existing `partner_applications.status` — unchanged, internal only |
| Funding | `partner_applications.funding_state` (not_funded / scheduled / funded / cancelled) alongside existing `funded_amount` / `funded_at` |

`partner_application_status_history` records transitions of any of the four (with which state changed, old value, new value, actor, reason, timestamp). It is never the source of the current value.

## 6. Draft data is walled off from partners

- `merchant_application_drafts` holds the step payload. No partner role — user or organization admin — can select it. Grants go to `service_role` only, with internal-staff access via a scoped function; RLS denies everything else.
- Merchant reads and writes go through token-scoped public functions that accept the opaque token and touch nothing else.
- Partner-facing progress comes only from safe fields on `partner_applications`: `completion_percent`, `last_completed_step`, `started_at`, `last_activity_at`, `submitted_at`, `partner_status`. Partner reads run through a constrained view that excludes financials, documents, bank data, underwriting and pricing.

## 7. Source-aware integration idempotency

`integration_events` keys on `(source_system, direction, idempotency_key)` as a composite unique constraint, with `event_type`, `external_id`, `payload`, `status`, `processed_at`, `error`, `attempts`. Inbound and outbound events from different systems can share a key without colliding.

## 8. Case-insensitive immutable codes

- `partner_organizations.code` and `partner_members.code` are stored uppercase with a unique index on `upper(code)`, so `SFB001` and `sfb001` resolve identically.
- A trigger blocks any change to a code once set.
- `resolve_referral_codes(_org_code, _user_code)` upper-cases input, validates server-side that the member belongs to the organization, and derives the organization from the database. A user code that doesn't match its organization is rejected rather than silently downgraded.

## Everything else unchanged from the approved plan

Referral Tools with links and QR codes; 7-step mobile-first merchant application with autosave and secure resume; partner dashboard KPIs, funnel and activity; referrals CRM with filters; referral detail timeline; commissions with pending/scheduled/paid/held/adjusted and adjustment audit rows; team management with invite/resend/deactivate; Magenta admin controls with full audit logging (actor, previous value, new value, reason, timestamp); HubSpot-ready sync layer with mock events; the three named demo organizations added alongside the existing ones.

Attribution stays immutable and separate from internal routing: internal reassignment never changes the attributed organization or member.

## Build order

1. Schema migration (all of the above, with grants, RLS and triggers)
2. Codes, attribution and token plumbing
3. Merchant application wizard and resume
4. Partner dashboard, referrals CRM and detail timeline
5. Commissions, overrides and adjustments
6. Team management and Magenta admin controls
7. Integration layer and mock events
8. Demo data seed plus purge-script update
