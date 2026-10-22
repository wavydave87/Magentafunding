# Phase 1 Hardening Audit — Report as Markdown

Deliver the results of the completed Phase 1 hardening pass as a downloadable Markdown document. No code changes.

## What gets produced

A single file: `magenta-portal-phase1-hardening-audit.md`, written to `/mnt/documents` so it appears in chat for download.

## Report contents

1. **Scope & method** — what was audited (Phase 1 Partner Portal: schema, RLS, RPCs, storage, routing, provisioning, wizard validation) and how (migration review, security linter, automated isolation test suite).
2. **Findings fixed during hardening**
   - Privilege escalation on `partner_applications` (partners could set status / funded / commission) — fixed via insert/update guard triggers + tightened RLS; edits only allowed in `started` / `missing_information`.
   - Direct inserts into `partner_application_events` — revoked; all timeline writes now go through trusted RPCs with the `Magenta.trusted_partner_op` session flag.
   - `submit_partner_application` RPC — full completeness validation (legal name, EIN/ZIP regex, primary owner, ownership %, financing fields) before `submitted` transition.
   - `partner_information_provided` RPC — `missing_information` → `under_review` with timeline entry.
   - `partner-documents` bucket — private, 25MB limit, PDF/JPG/PNG only via `partner_documents_validate_trg`; storage RLS enforces org-folder isolation.
   - Internal helper/trigger functions — `EXECUTE` revoked from `public`/`anon`/`authenticated`.
   - `public_deal_view` — confirmed intentional security-definer for the public offer page.
3. **Access model summary** — role-aware routing (`PortalGuard`, `portalHome`, `/pending-access`), partner vs internal audiences, admin provisioning flow (`createPartnerOrganization`, `createPartnerMemberAccount`).
4. **Test evidence** — `supabase/tests/partner-access.sql` results: cross-org isolation, no access to deals/rep_profiles/user_roles, blocked self-approval, forged-event rejection, upload type/size rejection, incomplete-submission rejection, cross-org creation blocked.
5. **Known residual items** — 22 remaining Supabase linter warnings (intentional security-definer usage for public offers and trusted RPCs), demo data present with documented purge script (`supabase/seed/purge-partner-demo-data.sql`) to run before go-live.
6. **Recommendations before Phase 2** — run the demo-data purge before production, re-run the isolation suite after every partner-schema migration, connect the email domain for live offer sending.

## Out of scope

No redesign, no Phase 2 features, no changes to Deal/Offer workflows.
