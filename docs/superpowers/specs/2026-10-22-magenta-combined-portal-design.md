# Magenta combined portal: design

Date: 2026-10-22
Status: Draft for review

## 1. Goal

Combine the two Lovable apps, **Magenta Offer Portal V1** and **Magenta Complete portal V1**, into one system that serves three audiences:

| Audience | Needs |
|---|---|
| Magenta sales team (reps, admins) | One place to work deals with clients: build and send offers, track progress, manage partners and commissions |
| Referral partners | Track referred deals, complete training, track commissions, invite clients to apply to Magenta |
| Merchants (clients) | See their offers, submit closing details, track progress through funding |

The result keeps the Magenta brand and is refined with the `apple-design` skill.

### Decisions already made

- **Starting point:** the Complete portal codebase (imported into this repo on `main`, commit `1bd28d2`). It already contains the sales workspace, the merchant offer page, the referral partner portal and the public apply flow.
- **Data:** both existing apps hold demo data only. The combined system starts on a fresh database; no data migration.
- **Merchant access:** passwordless email sign-in (one-time code or magic link).
- **Training:** courses, modules and completion tracking exactly as built today. No quizzes in v1.
- **Hosting/editing:** code-first in this repo. It may not be editable in Lovable's visual editor.

## 2. Architecture

One app (TanStack Start + React + Tailwind + shadcn/ui), one Supabase database, three signed-in areas plus public pages.

| Area | Users | Routes | Contents |
|---|---|---|---|
| Sales workspace | Internal users (`has_role(..., 'admin')` / reps) | `/dashboard`, `/deals/$dealId`, `/partners/...`, `/commissions`, `/library`, `/support/...`, `/admin`, `/account` | Pipeline, offer builder and sending, deal detail, partner organizations, commissions, training/resource library management, support inbox, user admin |
| Partner portal | `partner_members` with roles `organization_admin`, `manager`, `broker`, `referral_rep`, `viewer` | `/portal/...` | Referrals and pipeline, applications, invite links and "refer a business", commissions, training, resources, team, support, notifications, settings |
| Merchant hub (new) | Merchants, identified by email | `/merchant/...` | Funding tracker, offers, closing checklist, rep contact, activity |
| Public | Anyone | `/`, `/apply/...`, `/partners/inquiry`, `/auth`, `/portal/login`, `/merchant/sign-in`, `/reset-password` | Landing, partner-linked application, partner inquiry, sign-in pages |

### Sign-in routing

`signInDestination` (`src/lib/portal-routing.ts`) gains a merchant branch. Precedence: internal → `/dashboard`; active partner member in an active organization → `/portal`; merchant → `/merchant`; otherwise → `/pending-access`.

### Access rules (enforced by Postgres row-level security and server functions)

- Internal users see everything.
- Partner members see only deals and applications attributed to their organization, at partner detail level. They never see buy rate, sell rate, upsell or other internal pricing.
- Merchants see only deals linked to their merchant account. They never see buy rate, sell rate, upsell, commissions, partner details, internal notes or other merchants' deals.

### Removed

The standalone Offer Portal app is retired. `/offer/$dealId` becomes a redirect into the merchant hub (via sign-in when needed).

## 3. Unified deal lifecycle

### Problem

Today a partner **application** (`partner_applications`, status `partner_application_status`, plus `partner_facing_status`) can be converted into a sales **deal** (`deals`, via `partner_create_deal_from_application`; linked by `partner_applications.linked_deal_id` and `deals.converted_application_id`). After conversion both records carry their own status, updated separately, so they can drift.

### Design

- **Intake** stays on `partner_applications` with intake-only states: `started`, `missing_information`, `submitted` (and `merchant_application_state` for drafts).
- **Submitting an application automatically creates the deal.** `submit_partner_application` calls the existing conversion logic. Deals created directly by reps start at the same point.
- **The deal is the single source of truth from submission on.** New column `deals.stage` (enum `deal_stage`):

  | Order | `deal_stage` | Merchant label |
  |---|---|---|
  | 1 | `application_received` | Application received |
  | 2 | `under_review` | Under review |
  | 3 | `offers_ready` | Offers ready |
  | 4 | `offer_accepted` | Offer accepted |
  | 5 | `closing` | Closing |
  | 6 | `final_review` | Final review |
  | 7 | `funded` | Funded |
  | — | `declined` | (terminal) |
  | — | `expired` | Offer expired (terminal) |

- **`deals.needs_info`** (boolean) plus `deals.needs_info_note` (text) is a flag, not a stage. It can be raised at any non-terminal stage and shows as "We need something from you".
- **Funding details:** `deals.funded_amount`, `deals.funded_at`.

### Transitions

All transitions go through one server function, `set_deal_stage(deal_id, to_stage, note)`, which validates the move, writes the history row, and fires notifications.

| Trigger | Move |
|---|---|
| Application submitted | → `application_received` |
| Rep starts review | → `under_review` (rep) |
| Rep sends offers | → `offers_ready` (automatic) |
| Merchant accepts an offer | → `offer_accepted` (automatic) |
| Rep requests closing items or sends contract | → `closing` (automatic on first request) |
| All required closing items approved and contract signed | → `final_review` (automatic) |
| Rep marks funded with amount and date | → `funded` (rep) |
| Rep declines | → `declined` (rep) |
| Offer expiration date passes with no acceptance | → `expired` (scheduled job) |

Allowed manual moves are forward-only except that a rep may move a deal back one stage with a note (for example from `final_review` to `closing` when a document is rejected). Terminal stages can only be left by an admin.

### History

One table, `deal_stage_history (id, deal_id, from_stage, to_stage, needs_info, note, actor_id, actor_kind, created_at)`, replaces `partner_application_status_history` for post-submission changes. It feeds the timeline in all three areas. Notes are marked `visibility` (`merchant`, `partner`, `internal`) so each audience sees only what it should.

### Per-role views (all derived from `deals.stage`)

- **Merchant:** seven-step tracker, plain-language status line, the next action.
- **Partner:** same stages with partner wording, plus commission status. Replaces `partner_facing_status`.
- **Sales:** the stage plus the existing working signals (sent, viewed, accepted, docs received, revision requested) from `deal-progress.tsx`.

### Commissions

When a deal reaches `funded` and has a partner organization, a `partner_commissions` row is created automatically using the organization's rate, with `partner_deal_commission_overrides` taking precedence. Status starts at `pending`. Existing adjustment and payout flows are unchanged.

## 4. Merchant hub

### Identity and sign-in

- Table `merchants (id, user_id → auth.users, email unique, business_name, phone, created_at)`.
- Join `deal_merchants (deal_id, merchant_id)`; a deal is linked to the merchant whose email matches the deal's merchant contact email when the deal is created or the email changes.
- A merchant's auth user is created on first link (no password). Sign-in at `/merchant/sign-in` uses Supabase email OTP: 6-digit code, 10-minute expiry, rate-limited by Supabase Auth settings.
- Every merchant email contains a magic link that signs the merchant in and deep-links to `/merchant/deals/$dealId`.

### Screens

- `/merchant`: if the merchant has one deal, redirect to it; otherwise a list of deal cards (business name, amount, current stage).
- `/merchant/deals/$dealId`, top to bottom:
  1. **Progress tracker:** seven steps, current step highlighted, completed steps dated, one-line "what happens next" with a typical time estimate.
  2. **Your next step:** one primary action derived from state, such as "Compare your offers", "Upload 2 documents", "Verify your bank", or "Nothing needed from you. We're reviewing."
  3. **Offers:** comparison, payment schedule, accept or request changes (today's offer page, rebuilt on server-side math). Collapses to an accepted-offer summary after acceptance.
  4. **Closing checklist:** required documents (upload), bank verification link, contract. Each item shows `needed`, `received`, `approved` or `needs_attention` with Magenta's merchant-visible note.
  5. **Your Magenta contact:** rep name, phone, email.
  6. **Activity:** merchant-visible history entries.

### Pricing confidentiality

Today `get_public_deal` returns `sell_rate` and the merchant page calculates payments in the browser, so the rate is readable in developer tools. In the combined system:

- New server function `get_merchant_offer(deal_id, amount, frequency, funding_date)` performs all offer math using `src/lib/pricing.ts` on the server and returns only: funded amount, total payback, payment amount, payment frequency, number of payments, term, fees, early-payoff savings and the payment schedule.
- No merchant-reachable function or table exposes `sell_rate`, `buy_rate`, upsell, `weekly_rate_increase_points` or any other internal pricing field.
- Known limitation: the sell rate can still be derived as total payback ÷ funded amount. The goal is that the rate is never shown or transmitted as a value.

### Notifications

Email to the merchant when the deal reaches `offers_ready`, `closing` (items requested), `funded`, and when `needs_info` is raised. No email for internal-only steps.

### Out of scope for v1

SMS sign-in or alerts; in-hub messaging with the rep; merchant-initiated new applications.

## 5. Merge of Offer Portal work

The Offer Portal received changes after the Complete portal forked from it. These are carried over:

| Change | Treatment |
|---|---|
| Reset-password fix (`reset-password.tsx`: check session on mount, listen for `PASSWORD_RECOVERY`, handle `error_description`, expired-link message with "Send a new link") | Replace the Complete portal's version |
| Account page (`_authenticated/account.tsx`): name, phone, change password with current password | Add for internal users and partner members; not for merchants |
| Admin user management (`admin.functions.ts`: `updateRepAccount`, `setRepRole`, `resetRepPassword`, `setRepDisabled`, all behind `assertAdmin`, with self-protection) | Merge into the existing admin page so it covers reps and partner members |
| Sign-out cleanup (clear caches, Back cannot reopen signed-in pages) | Apply to all three areas |
| `src/lib/account-rules.ts` and `account-rules.test.ts` | Copy over; tests must pass |

Method: diff each file between the two exports. Where the Offer Portal changed a file after the fork, port the change into the Complete portal's structure rather than overwriting files. Real conflicts (both sides changed the same behavior differently) are listed for the owner to decide.

## 6. Design treatment

Apply the `apple-design` skill through shared tokens and components (`src/styles.css`, `src/components/ui/*`, shared shells), not per-screen overrides.

- Keep the Magenta palette, Questrial/Jost fonts and logo.
- Deep magenta (`--primary`) is the single accent for interactive elements. Gold, coral and green are reserved for meaning (attention, error, success).
- The four-colour `bg-rule-gradient` under the header becomes a thin, quiet hairline. Remove most gradients and tinted page washes (`bg-brand-wash`, `bg-hero-sheen`).
- White cards with soft shadows; translucent sticky headers.
- One primary button per view. Consistent type scale, 8px spacing grid, consistent radii. Touch targets ≥ 44px.
- Designed loading, empty and error states on every screen.
- Merchant and partner areas are designed phone-first.
- Each area is reviewed against the skill's checklist, with screenshots at phone and desktop widths before the stage is called done.

## 7. Testing

- **Unit tests (Vitest):** offer math including an assertion that `get_merchant_offer` output contains no rate fields; stage transition validation; commission calculation with overrides; admin self-protection and password rules; sign-in routing for each role.
- **Database access tests:** extend `supabase/tests/role-access.sql` to prove a merchant cannot read another merchant's deal, partners cannot read other organizations' deals, and neither can read internal pricing columns.
- **End-to-end (Playwright with the preinstalled Chromium):** partner invites a merchant → merchant applies → rep reviews and sends offers → merchant accepts on a phone-sized viewport → uploads closing documents → rep marks funded → partner sees the commission. Screenshots at phone and desktop widths.
- Existing tests (`delivery-state`, `phone`, `schedule`, `portal-routing`, tap-target tests) keep passing.

## 8. Build order

Each stage is its own pull request.

1. **Merge:** carry over the Offer Portal work (section 5); set up a fresh Supabase project and apply migrations.
2. **Lifecycle:** `deal_stage`, `set_deal_stage`, automatic application-to-deal conversion, `deal_stage_history`, partner and sales views reading the stage, automatic commissions.
3. **Merchant hub:** merchant identity, email OTP and magic links, hub screens, `get_merchant_offer`, `/offer/$dealId` redirect, merchant emails.
4. **Design pass:** shared tokens and components, then sales, partner and merchant areas.
5. **Verification:** end-to-end run, security review, database access tests.

## 9. Out of scope (v1)

Quizzes and exams; SMS; in-hub messaging; merchant-initiated applications; migrating data from the old apps.

## 10. Owner actions

- Provide a new Supabase project (URL, publishable key, and a service-role key set as an environment secret rather than in the repo) before stage 1 can be verified against a live database.
- Configure Supabase Auth email templates and SMTP sender for merchant codes and magic links (stage 3).
