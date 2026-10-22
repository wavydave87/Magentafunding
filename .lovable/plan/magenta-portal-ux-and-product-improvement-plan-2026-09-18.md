# Magenta Portal UX and Product Improvement Plan

## Goal
Make sales, partner, and customer workflows easier to scan and act on without removing the detail already available in expandable cards and detail views.

## What should remain
- Keep the cohesive expandable-card pattern on sales offers.
- Keep compact summaries when cards are closed and full operational detail when opened.
- Keep Stage naming, quick filters, sorting, search, status icons, and Expand All.
- Preserve the current Magenta and graphite visual system.

## Phase 1 — Sales clarity and daily workflow
1. Add a compact **Stage pipeline strip** above the offers list. Each Stage shows its count and acts as a filter without replacing the cards.
2. Add a small **status-icon legend** grouping icons into Action Needed, Engagement, and Completed so their meaning is immediate.
3. Turn the minimized-card priority line into a clearer **Next Action** treatment with urgency, due timing, and one direct action.
4. Add **named saved views** so reps can save and restore filter/sort combinations such as “My Follow-Ups” or “Closing This Week.”
5. Add persistent **follow-up reminders** per deal, including due date, note, overdue state, completion, and a dashboard filter.
6. Add **pinned and recently opened deals** to shorten repeat navigation.
7. Improve the deal builder with a sticky **readiness rail** showing incomplete or conflicting items, with links to the relevant tile.
8. Add **duplicate offer** and reusable templates for common structures.

## Phase 2 — Partner consistency
1. Regroup navigation into Pipeline, Earnings, Enablement, and Account; surface Analytics and Notifications directly.
2. Make KPI and pipeline tiles clickable filters that lead to the relevant records.
3. Add global partner search and consistent filters for Stage, date, amount, organization, and assigned owner.
4. Add application CSV export, saved views, completeness meters, document status, and time-in-stage.
5. Add an Expand All mode and counts on application-detail tabs.
6. Prefill support requests with the application and issue context.
7. Expand commissions with payout batches, reconciliation, payment references, and exceptions.

## Phase 3 — Customer clarity and conversion
1. Add a simple progress strip: Review Offer → Choose Terms → Accept → Complete Closing Items.
2. Promote Custom Amount to a full choice card rather than a secondary control.
3. After acceptance, show a stable confirmation summary with selected terms, funding date, documents, bank verification, and rep contact.
4. Rename “Revise My Choice” to **Request a Change** and clearly explain that it sends a request rather than changing accepted terms immediately.
5. Show per-document states: Required, Uploaded, Rejected, Approved, and Needs Replacement.
6. Improve expired and already-accepted states with one clear next step.
7. Add a visible fallback when bank verification is blocked by the browser.

## Phase 4 — Workflow depth
1. Add internal notes, mentions, and a deal-level activity/audit timeline.
2. Add bulk actions for assigning, reminding, exporting, and changing Stage.
3. Add duplicate detection for merchant email, phone, and business identity.
4. Add send history with delivery status, failures, and automatic retry options.
5. Add time-in-stage, conversion funnel, loss reasons, and aging analytics.
6. Add notification preferences and digest controls for sales and partners.

## Phase 5 — Automation
1. Replace manual email/SMS handoffs with reliable provider-backed delivery and automatic logging.
2. Add configurable reminders for unopened, viewed-not-accepted, expiring, accepted-with-missing-docs, and stalled applications.
3. Add Stage-change rules that create tasks, notify owners, and update related partner records.
4. Add commission payout approvals, batch processing, reconciliation, and partner payment notices.

## Visual and interaction rules
- Keep important information visible in a one-line card summary; place detail behind expansion.
- Use icons for quick state recognition, but always pair them with accessible labels and a legend.
- Reserve warning color for work requiring action; use neutral color for passive information and success color for completed milestones.
- Keep one dominant next action per record.
- Make filters consistent across sales and partner lists, with visible active-filter chips and clear reset behavior.
- Keep mobile controls at least 44px and move secondary information below primary actions rather than compressing it.

## Recommended implementation order
Start with Phase 1 because it improves the highest-frequency workflow without redesigning the product. Then align partner views, improve the customer close flow, add deeper CRM tools, and finish with delivery and workflow automation.

## Technical notes
- Store saved views server-side for cross-device access, while preserving a local fallback.
- Store reminders as private authenticated records tied to deals and owners with strict row-level access.
- Reuse `DealTile`, `DealStatusIcons`, shared headers, badges, and semantic design tokens.
- Add indexes for reminder due dates, owner filters, Stage, and common dashboard queries.
- Track actions as structured events so notifications, analytics, and audit history share one source of truth.
