# CRM and Portal UX Review Recommendations

## Product goal
Make Magenta Portal feel like one clean, easy-to-follow CRM across sales, partner, and customer views: strong visual cues first, full detail one click away, and fewer places where users must hunt for the next action.

## Current strengths confirmed
- Sales already has expandable offer cards, Stage filters, quick filters, quick-status icons, hover/focus highlighting, CSV export, Send/Resend actions, view tracking, document counts, bank verification tracking, and saved filter preferences.
- The deal builder already uses expandable tiles, a sticky save state, live pricing math, delivery history, merchant activity, uploads, accepted-offer details, revision requests, and Expand All / Collapse All.
- The partner portal already has a role-aware shell, KPIs, Needs Your Attention, Quiet For Over A Week, application tables, application detail tabs, referrals, commissions, resources, training, support, notifications, team, and settings.
- The customer offer page already supports preset offers, a custom funding slider, daily/weekly selection, live payment schedule, early payoff table, requested funding date, acceptance, revision requests, document upload, bank verification, and rep contact fallback.
- Latest preview health showed no current runtime or console errors in the available logs.

## Highest-impact recommendations

### 1. Make every list start with “what needs attention”
Sales, partner, and customer-facing flows should all answer the same question first: “What needs action now?”

Recommended changes:
- Add a sales pipeline strip by Stage above the offer cards: Draft, Sent, Viewed, Accepted, Docs Received, Revision Requested, Expiring.
- Make each Stage segment clickable so reps can filter instantly.
- Add a stronger “Next Action” line on minimized sales cards, separate from the summary text.
- Use the right-side status icons as quick diagnostics, but separate urgent icons from informational icons visually.
- Add similar quick-action rows to partner Applications, Support, and Commissions views.

Why it helps:
- Users see the day’s work before scanning details.
- Important items stay visible without returning to dense tables.

### 2. Standardize one reusable “work item card” pattern
The app currently has strong card patterns in sales, while partner views still use a mix of tables, cards, tabs, and lists. Keep tables where they help, but unify the card behavior across the CRM.

Recommended card pattern:
- Collapsed view: name, Stage/status, key amount, last activity, next action, and status icons.
- Expanded view: progress, money details, documents, communication/activity, and actions.
- One chevron behavior everywhere.
- Expand All / Collapse All on longer lists.
- Consistent hover, focus, selected, accepted, warning, and revision treatments.

Best places to apply:
- Partner application list.
- Internal Partner Network rows.
- Partner commissions.
- Partner support tickets.
- Training and resources, where expandable rows already fit the content.

### 3. Improve sales dashboard clarity without losing detail
The restored expandable sales cards are the right direction. The next step is making them more scannable.

Recommended changes:
- Add a compact status-icon legend near the Quick Filters row.
- Make status icons use clearer categories:
  - Action needed: docs missing, revision requested, expired, bank pending.
  - Engagement: sent, viewed, bank opened.
  - Closed/won: accepted, docs received.
- Add common saved views: “My Follow-Ups,” “Accepted Missing Docs,” “Viewed No Acceptance,” “Expiring,” and “Not Sent.”
- Add follow-up reminders/tasks tied to a deal.
- Add notes and mentions on offers so reps can record context without leaving the page.
- Add bulk actions for filtered sales cards: export, send reminders, mark follow-up done.
- Add a pinned/recent deals area for reps managing active closings.

Missing/enhancement opportunities:
- True task/reminder system.
- Sales notes and activity comments.
- Send history reliability improvements.
- Bulk actions.
- Saved views beyond local filter memory.
- Time-in-stage analytics.

### 4. Tighten the deal builder workflow
The deal builder contains the right details, but it can better guide reps through readiness.

Recommended changes:
- Add a deal-readiness rail or checklist near the top: merchant info, pricing, presets, documents, bank verification, send readiness.
- Add warning/completion icons on each expandable tile.
- Add “jump to problem” links from validation warnings.
- Add a persistent mini-summary for funded range, sell rate, term, fees, and send status.
- Add templates for common offer structures.
- Add duplicate/copy offer for faster repeat work.
- Add clearer send history and reminder history directly in the delivery tile.

Missing/enhancement opportunities:
- Offer templates.
- Duplicate/copy offer.
- Readiness score.
- Internal notes.
- Automated follow-up reminders.

### 5. Make Send Offer feel less manual
The current flow clearly supports link, QR, email copy, text copy, and logging, but the manual log step can create inaccurate records if reps forget it.

Recommended changes:
- Combine “Copy” and “Log” into one primary action where possible.
- When opening email or text, log the send automatically or show a short confirmation prompt.
- Add “Preview Offer” inside the Send Offer dialog.
- Add resend/reminder history in the dialog itself.
- Add scheduled follow-up reminders after send.
- Later: connect true email/SMS automation so sends happen and log from inside the portal.

Missing/enhancement opportunities:
- Fully automated email/SMS delivery.
- Delivery/open/click history grouped in one timeline.
- Reminder scheduling.

### 6. Rework partner navigation around primary workflows
The partner portal has many useful sections. The flow can feel cleaner by grouping them around partner jobs.

Recommended navigation grouping:
- Pipeline: Dashboard, Applications, Referrals.
- Earnings: Commissions, Analytics.
- Enablement: Training, Resources.
- Account: Team, Support, Notifications, Settings.

Recommended changes:
- Promote Notifications as a visible icon with filters by type.
- Either promote Analytics to a top-level item or fold key analytics into Dashboard.
- Add section headers inside the mobile menu.
- Add global partner search for application reference, business name, and contact.
- Add breadcrumbs consistently on detail pages.

Missing/enhancement opportunities:
- Global search.
- Notification preferences.
- Better mobile nav grouping.
- Partner-level saved views.

### 7. Upgrade partner application flow and detail pages
The application detail page is comprehensive, but seven tabs can make users click around to form a complete picture.

Recommended changes:
- Add a lifecycle tracker at the top of each application detail page.
- Add tab counts: Documents (3), Offers (1), Activity (12).
- Add an “Expand All Details” view for users who want the full record on one page.
- Add a summary band with business, owner, requested amount, approved amount, funded amount, commission, and next action.
- Add date range, Stage/status, and amount filters to application lists.
- Add CSV export for partner applications.
- Add direct links from commissions to applications wherever available.
- Pre-fill support tickets when a partner clicks “Ask Magenta” from an application.

Missing/enhancement opportunities:
- Date range filtering.
- Application export.
- Expand-all detail view.
- Completeness meter.
- Required/received/rejected document states.
- Contextual support tickets.

### 8. Improve commissions as a workflow, not just a statement
Commissions are useful now, but they can better support payout operations and partner trust.

Recommended changes:
- Add status/date/partner/search filters everywhere commissions appear.
- Show totals for the current filtered view.
- Group internal commissions by partner organization by default.
- Add payout batches with reference, payment date, included commissions, and export.
- Show expected commission on approved-but-not-funded applications where possible.
- Add “next payout estimate” for partners if rules are known.

Missing/enhancement opportunities:
- Payout batches.
- Reconciliation workflow.
- Forecasted commissions.
- Partner-facing payout schedule.

### 9. Make customer offer acceptance feel more guided
The merchant offer page is already strong. It can convert better with clearer progress and confirmation.

Recommended changes:
- Add a simple progress strip: Review Options → Choose Structure → Accept → Verify/Upload → Funding Review.
- Promote the custom option from a text link into a fourth selectable “Custom Amount” card.
- Add an acceptance confirmation dialog summarizing amount, payment, term, payback, fees, net funded, and requested funding date.
- Rename “Revise My Choice” to “Request a Change” after acceptance so it feels like a request, not a second acceptance.
- Add plain-language fee tooltips.
- Show upload file type and size limits before upload.
- Show per-file received/pending states.
- Make payment schedule more prominent before acceptance.

Missing/enhancement opportunities:
- Acceptance confirmation dialog.
- Stronger progress strip.
- Fee explanations.
- Per-document required/received/rejected states.
- Better bank-link fallback if a popup is blocked.

### 10. Improve public referral application conversion
The public referral form is intentionally simple, which is good. The biggest improvements are validation, trust, and confirmation.

Recommended changes:
- Add field-level validation instead of one summary error.
- Format phone numbers consistently while typing.
- Add a short trust/what-happens-next block near the submit button.
- Add referral attribution language when a partner/member referral is present.
- Add textarea character count.
- Preserve the confirmation reference and provide a printable/copyable confirmation.

Missing/enhancement opportunities:
- Inline validation.
- Better phone formatting.
- Confirmation copy/print.
- Referral attribution clarity.

## Recommended implementation order

### Phase 1: Sales clarity quick wins
- Add sales pipeline Stage strip.
- Add status-icon legend and clearer icon tone categories.
- Promote “Next Action” on minimized cards.
- Add saved quick views.
- Add follow-up reminder fields or lightweight tasks.

### Phase 2: Partner consistency
- Apply the expandable work-item pattern to partner applications and internal partner network rows.
- Add date range filters, CSV export, and clickable KPIs.
- Add lifecycle tracker and tab counts on application details.
- Group mobile navigation and promote key alerts.

### Phase 3: Customer conversion
- Add customer offer progress strip.
- Turn Custom Amount into a full selectable card.
- Add acceptance confirmation dialog.
- Improve upload guidance and post-acceptance revision language.
- Add field-level validation to public referral applications.

### Phase 4: Workflow depth
- Add reminders/tasks, notes, mentions, and pinned/recent records.
- Add send/reminder history improvements.
- Add commission payout batches and reconciliation.
- Add time-in-stage and partner funnel analytics.

### Phase 5: Automation
- Add true email/SMS sending when the sending domain/provider is ready.
- Add automated reminders based on viewed-not-accepted, expiring, and accepted-docs-missing states.
- Add notification preferences by role and event type.
- Add audit trails for sensitive internal and partner actions.

## Technical details
- Reuse the existing card, badge, status icon, page header, shell, and token system rather than introducing another design language.
- Keep sensitive internal details out of customer pages.
- Preserve the expandable-card sales direction the user preferred.
- Prefer shared components for cards, filters, KPI links, status legends, lifecycle trackers, empty states, and activity timelines.
- Keep backend changes limited to features that need persistence: saved views, reminders/tasks, notes, payout batches, audit trails, and automated send history.
