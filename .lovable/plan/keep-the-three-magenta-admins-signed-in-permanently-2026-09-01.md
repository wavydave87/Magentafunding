# Keep the three Magenta admins signed in — permanently

## What I found (verified just now)

All three accounts exist, are email-confirmed, not banned, have one identity row each, a rep profile, and both `admin` + `rep` roles:

- dave@magentafunding.com
- tiffanni@magentafunding.com
- dario@magentafunding.com

I also checked the stored password hashes directly: **all three currently match `Magenta2026!`**. Dave signed in successfully at 13:56 UTC today, then three sign-in attempts at 14:45–14:46 were rejected as "Invalid login credentials", and one of them came from the "First-time setup" tab (which tries to sign up first and confuses the flow).

So the passwords and roles are not lost. Two things are still producing the "it kicks me out and I can't get back in" experience:

1. **The sign-in form is fragile.** It sends the email exactly as typed (a stray space, a capitalized or autofilled address, or a browser-remembered old password produces the same generic "Invalid login credentials"). The "First-time setup" tab is still visible and, for an existing account, it signs up, fails, and shows a confusing error.
2. **The session gate is trigger-happy.** The protected areas call `getUser()` on every navigation and redirect to sign-in whenever that call fails — including on a transient network blip or right after an app rebuild, when the token is still being refreshed. That reads as "it logged me out after an update".

## What I'll do

### 1. Lock the three master admins in place (survives every future update)
- A migration that idempotently guarantees `admin` + `rep` roles and a rep profile for these three email addresses, re-runnable and safe. Roles can never silently disappear again.
- Re-set each password to `Magenta2026!` and confirm the email, so today's state is known-good regardless of what happened earlier.
- Verify afterwards with a real sign-in check for each account.

### 2. Make sign-in forgiving
- Trim and lowercase the email before it is sent, on both `/auth` and `/portal/login`.
- Replace the generic failure with a clear message ("That email and password don't match. Check for autofilled passwords, or use Forgot Password.") and add a Forgot Password link to `/auth`.
- Hide the "First-time setup" tab now that an administrator exists, so it can no longer be used by mistake.

### 3. Stop the false sign-outs
- The protected route gates read the existing session and let the client refresh the token instead of hard-failing on a single `getUser()` call; only a genuinely absent session redirects to sign-in.
- Route the user back to the page they were on after signing in, instead of dropping them at the top of the app.

### 4. Confirm every area is reachable as a master admin
Automated end-to-end check that each of the three accounts can sign in and open the internal dashboard, deals, Partner Network, commissions, support, library and administration, plus the partner-side surfaces they are allowed to view.

## Technical notes

- Role bootstrap runs as a SQL migration keyed on the three email addresses in `auth.users`, inserting into `public.user_roles` and `public.rep_profiles` with `on conflict do nothing`, so redeploys never duplicate or drop anything.
- Password/confirmation updates go through the admin API, not raw SQL, so the identity rows stay consistent.
- The gate change touches `src/routes/_authenticated/route.tsx` and `src/routes/_portal/route.tsx`: use `getSession()` with the client's own refresh, and only redirect when there is no session at all.
- Login changes touch `src/routes/auth.tsx` and `src/routes/portal.login.tsx`; email normalization also protects the `Tiffanni@…` capitalized form.
