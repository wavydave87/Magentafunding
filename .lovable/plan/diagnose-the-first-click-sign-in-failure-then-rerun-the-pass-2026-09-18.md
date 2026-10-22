# Diagnose the first-click sign-in failure, then rerun the Pass 1 checkpoint

Pass 2 is on hold. Pass 1 is not declared verified until the signed-in checkpoint below passes.

## Step 1 — Reproduce and capture the first click

Run scripted browser sessions against the running app using the available test credentials for:

- Organization Admin: `gregory.sandoval@harbor-line.example` (Harbor Line, with data)
- Partner User: `eve.kaplan@harbor-line.example`
- Empty-state Partner User: `michael@sfbizsolutions.test`

Test the partner sign-in page and the staff sign-in page where each account is expected to be accepted. For each attempt, capture the state immediately before and after the **first** click:

- Browser console messages, page errors, and hydration warnings
- Whether an authentication network request was sent, and its response
- Whether the fields were populated and the button was disabled
- A reliable signal that the page’s interactive code had attached; visible fields and an enabled button alone do not prove this
- URL and page state immediately after clicking and after a short wait
- Whether the account session was established and which identity the redirect resolved

Run two deliberate cases: a click as soon as the visible form permits it, and a click after the page is confirmed interactive and settled. Repeat the settled-page case several times for both partner roles.

## Step 2 — Identify the cause from evidence

Investigate these possibilities without assuming one is correct:

1. The click lands before hydration and triggers a native form submission or reload without an authentication request.
2. The authentication request fails and its error is missing or unclear.
3. The form remains busy or its submit handler does not run.
4. Authentication succeeds, but the on-mount identity check, session persistence, or post-sign-in redirect returns the user to the login page.
5. The automated test clicks an element before it is genuinely actionable.

Report which case occurred for each account and whether the first click sent an authentication request.

## Step 3 — Fix the demonstrated failure

If the app permits a pre-hydration click that silently reloads the sign-in page, fix that user-facing behavior. Ensure the server-rendered form cannot submit before its interactive handler is ready, then enable submission when hydration completes. Confirm that a click at the earliest visible opportunity produces a clear result rather than appearing to do nothing.

If authentication or routing is defective, fix the source of the failure and show the resulting first-click sign-in working. If only the test is early, make the test wait for the reliable interactive readiness signal. Do not use test timing as the sole fix if a person can still encounter a silent first-click failure.

Keep sign-in errors visible, clear the busy state on every failure path, and verify the on-mount identity redirect does not race with a new sign-in.

## Step 4 — Rerun the full signed-in Pass 1 checkpoint

Use both Partner User and Organization Admin accounts at desktop and phone widths. Watch the console throughout. Record every item as **passed**, **failed**, or **not runnable**, with the reason.

- Navigation across every portal page: correct titles, role-aware items, no dead links, and usable mobile controls
- Referrals: Organization Admin sees entitled organization records, including organization-link referrals; Partner User sees only their own or specifically entitled records
- Manual referral detail: opens before an application exists and shows owner and recorded date; displays a linked application once one exists
- Referral tools: personal link and QR, organization link for admins, copy, download, preview, and print sheet
- Commissions: accurate totals, Total Earned and Scheduled cards, expected and paid dates, multiple commissions for one application, and CSV export
- Team: Organization Admin sees statistics, per-member links and QR codes, and permitted invitation actions; Partner User cannot access those controls, including by opening the Team URL directly
- Settings: Organization Admin contact edits, password change, sign out other devices, and accurate notification wording
- Paused access: an already signed-in member of a paused organization opening a portal URL directly reaches the paused-access message
- Empty states for an organization with no referrals
- Direct data-access attempts using a Partner User session: another member’s referrals are inaccessible, and requests for banking, credit, requested financials, underwriting, pricing, internal notes, owner records, and documents are refused

Use **disposable test accounts and records** for password changes, session revocation, organization edits, and invitation revoke/resend. Restore the test fixtures afterward so one check does not invalidate another.

## Step 5 — Report and decision

Provide a short report with:

- The demonstrated cause of the first-click issue and the evidence supporting it
- The fix, if one was needed
- First-click results for each role, including whether an auth request was sent
- Every checkpoint item marked passed, failed, or not runnable
- Any fixture or environment limitation and how it was handled

Start Pass 2 only after the first-click issue is resolved and every required Pass 1 checkpoint item passes.

## Technical boundaries

The shared sign-in form is in `src/components/sign-in-form.tsx`; the sign-in path then resolves portal identity and redirects. `/portal/login` also checks existing identity on mount, so inspect that interaction during the capture.

Use the partner-safe summary source and entitlement rules for scoped-read checks. Test sensitive-field access through both the interface and direct data API calls made with the Partner User’s session.

Do not change `/dashboard`, `/deals/*`, `/offer/*`, or the internal application view.