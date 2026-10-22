# Partner View verification — partial checkpoint

Pass 1 remains documented as passed. Pass 2 is **not complete**.

## Verified in this run
- Eleven portal pages on desktop (1280px) and phone (390px), for Gregory (organization admin) and Eve (partner user/manager): persistent effective-identity banner, no page errors.
- Referrals: Gregory 14/14; Eve 5/5 on both devices. Commission responses: Gregory three; Eve two.
- No browser Supabase REST reads observed during the tested Partner View pages; reads use server functions.
- Direct application-table requests rejected; cross-organization summary queries returned zero rows.
- Direct read-only manual-referral mutation rejected on all four runs.
- Work-mode cross-organization and unknown Magenta-only actions rejected for both roles.
- Exit returned to the originating partner organization record without sign-out on all four runs.
- Vitest: seven files, 72 tests passed. These are existing regression tests, not exhaustive Partner View security tests.

## Changes
Effective-identity routing and isolated portal caches; notification realtime disabled during Partner View; account-security changes blocked during Partner View; profile/training/settings mutations routed to scoped handlers; server-side effective-role team handler; internal application status and commission note fields removed from the response allowlist. Invitation management now fails closed during Partner View rather than using the administrator's broader authority.

No database migration applied in this run. Existing partner_view_sessions and partner_admin_audit_log are used. No internal sales route or internal application detail component was changed.

## Remaining blockers / not verified
- Invitation create/resend/revoke in Work mode is deliberately unavailable, not complete.
- Final team-handler changes need a successful permitted-write and rejected-write test after the role guard correction.
- Fresh real-partner sign-ins have not been compared page-by-page in this run.
- Multiple commissions for one application, CSV contents, manual detail and subsequent application linkage require dedicated fixtures and assertions.
- QR decoded ownership, notification/support/training mutations and all security actions need dedicated assertions; page loading alone does not prove these.
- Session expiry and cross-session cache isolation need controlled tests.
- Full audit row contents and accepted/rejected-write coverage have not been independently checked; audit persistence must be atomic with writes before production completion.
- Direct Partner View APIs were probed; this does not establish denial of the real administrator's separate ordinary Supabase credentials.

## Deployment verification still required
HTTPS cookie behavior, auth configuration, session lifecycle/storage, audit retention and atomicity, and verified invitation email delivery; copy-link flow is not proof of working email delivery.
