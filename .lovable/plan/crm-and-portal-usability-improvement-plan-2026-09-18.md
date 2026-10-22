# CRM and portal usability improvement plan

## Goal
Make the app easier to follow across sales, partner, and customer views without losing important underwriting, funding, activity, document, and commission details.

The recommended direction is to keep the expandable-card approach you preferred, then add clearer visual signals, stronger task flow, and consistent worklist controls across the product.

## Current strengths to preserve
- Expandable offer cards are the right foundation for the sales side: they keep the list scannable while preserving full detail on demand.
- The sales dashboard already has useful search, Stage filters, sorting, saved preferences, CSV export, and Expand All / Collapse All.
- The deal builder already uses collapsible tiles for major sections and keeps Save, Preview, and Send visible in the page header.
- The customer offer page already supports preset offers, custom amount, funding date, acceptance, revisions, bank verification, and document uploads.
- The partner portal already has a consistent shell, headers, KPI cards, responsive tables/cards, referral links, commissions, support, resources, training, notifications, and analytics.

## Highest-priority recommendation

### Add quick-status icons to minimized sales offer cards
The minimized offer cards should show a compact icon cluster on the right side, near the chevron, so reps can read card state without expanding.

Recommended icons:
- Send: offer sent or not sent.
- Eye: viewed or not viewed, with view count.
- Check: accepted.
- File/upload: documents uploaded or still missing.
- Shield/check: bank verification opened or still pending when required.
- Alert: revision/change requested.
- Clock: expiring soon or expired.

Behavior:
- Icons use existing Magenta, gold, success, muted, and warning tones.
- Each icon has a tooltip and screen-reader label.
- Normal states stay quiet; urgent states are visually stronger.
- On mobile, the icon cluster stays on one line and can collapse overflow into “+N”.
- Clicking an icon expands the card and moves the user to the related detail area.

Why this is the right next build:
- It keeps the cohesive expandable-card design you preferred.
- It brings back the scan speed people wanted from the table without making the page feel disjointed.
- It uses data already visible inside expanded cards, so it should not require backend changes.

## Product-wide flow recommendation

### Use one consistent work-item pattern
Sales offers, partner applications, partner organizations, commissions, and support tickets should share a familiar structure:

```text
Name / business                         Stage badge      quick icons      open
Key amount                              Last activity    next action
Short summary line
Expanded detail area
```

Apply this pattern gradually to:
1. Sales offer cards.
2. Partner application mobile cards and desktop rows.
3. Internal Partner Network rows.
4. Support tickets.
5. Commission rows on mobile and, where useful, desktop.

This keeps each view detailed while making the whole app feel like one product.

## Sales-side recommendations

### Sales dashboard
Recommended improvements:
- Keep cards as the primary view across desktop and mobile.
- Add quick-status icons to minimized cards.
- Add a “priority reason” line, such as:
  - Viewed 3 hours ago · not accepted.
  - Accepted · documents missing.
  - Change requested.
  - Not sent yet.
  - Expires today.
- Add quick filters for common workflows:
  - Needs Follow-Up.
  - Not Sent.
  - Viewed, Not Accepted.
  - Accepted, Docs Missing.
  - Change Requested.
  - Expiring Soon.
- Make summary tiles look more clickable with a small arrow or “View” affordance.
- Keep Stage terminology everywhere on the sales dashboard.
- Keep Send/Resend as the rightmost primary action.
- Add optional density: Comfortable / Compact.
- Add a visible “filters restored from this device” note only when saved filters are actively narrowing results.

### Deal builder
Recommended improvements:
- Add the same tile status icons to section headers:
  - Complete.
  - Empty.
  - Warning.
  - Merchant viewed.
  - Files received.
  - Accepted.
  - Revision requested.
- Add a compact “ready to send” checklist near the top.
- Make each warning jump directly to the section and field that needs attention.
- Add “last saved” time after saves.
- Add duplicate/copy offer from an existing deal.
- Add common offer templates for repeat structures.
- Keep internal pricing visually separated from customer-facing math.

### Send offer flow
Recommended improvements:
- Make it clearer that email/text are currently manual unless automated sending is connected.
- Auto-log when a rep copies ready-made email or text copy, with an undo option.
- Show recent send history inside the send dialog before resending.
- Add follow-up reminders, such as “remind me tomorrow if not viewed”.
- Surface send history immediately on the collapsed card through the Send icon.

## Partner portal recommendations

### Navigation
Recommended improvements:
- Add icons to partner navigation for faster scanning.
- Move Analytics into primary navigation or merge a summary into Dashboard.
- Group mobile navigation into clear sections instead of one flat list.
- Add notification/support counts where action is needed.
- Consider a global search for applications, tickets, resources, and training.

### Partner dashboard
Recommended improvements:
- If anything needs attention, show it before general KPI cards.
- Make KPI cards clickable filters.
- Add small trend indicators where possible:
  - This month.
  - Last month.
  - Change from prior period.
- Tie funded volume and commissions closer together visually.
- Add a next payout or estimated payout area when payout data is available.
- Add a stronger first-run empty state for new partners with no applications.

### Applications list
Recommended improvements:
- Use “Stage” consistently in filters and labels.
- Sync pipeline/status links with the selected tab so filters do not appear to conflict.
- Add filters for Stage, amount range, submitted date, updated date, and funding outcome.
- Add saved views:
  - Active.
  - Needs Attention.
  - Funded.
  - Commission Pending.
- Add quick icons for missing info, documents, offer, contract, funding, and commission.
- Add export for the current application list.

### Application detail
Recommended improvements:
- Add a persistent summary band under the header:
  - Stage.
  - Requested amount.
  - Approved amount.
  - Funded amount.
  - Commission.
  - Next action.
- Add a lifecycle tracker above the tabs.
- Add counts to tabs, such as Documents (3) and Activity (12).
- Make missing documents a checklist instead of only a text list.
- Add a visible upload path from the Documents tab after submission.
- Group Activity by Today, This Week, and Earlier.
- Link the Offers tab directly to the connected offer/deal when available.

### Referrals
Recommended improvements:
- Add a QR code for the referral link.
- Split “organization link” and “personal link” into two explicit copy buttons.
- Add share actions for email and text.
- Add a funnel: visits → starts → submissions → approvals → funded.
- Add conversion percentages, not just raw counts.
- Add campaign-specific links later if partners need attribution by campaign.

### Commissions
Recommended improvements:
- Add filters for payment state, date range, amount range, application, and partner/member.
- Add a running total for the current filtered view.
- Add payout batch grouping so partners can reconcile payments.
- Add direct Open Application action on every commission row.
- Add export current view vs export all.
- Add “next expected payout” if payout scheduling exists later.

### Support and notifications
Recommended improvements:
- Add filters for open, waiting on Magenta, waiting on partner, closed.
- Add priority and “last reply from” indicators on ticket cards.
- Allow attachments on support messages.
- Consolidate notification rendering so the bell and full notifications page match.
- Add filters for unread, application, commission, support, and system updates.
- Add “mark unread” and single-notification dismiss actions.

### Team and account management
Recommended improvements:
- Replace temporary-password invites with email invitations or passwordless setup.
- Confirm role downgrades and deactivations before they take effect.
- Show pending invite state separately from active members.
- Make read-only organization fields visually distinct with lock/read-only indicators.

## Customer-facing recommendations

### Public offer page
Recommended improvements:
- Add a top progress strip:
  - Choose terms.
  - Accept offer.
  - Verify/upload docs.
  - Funding review.
- Show approved amount range and term in the hero so the customer sees the most important numbers immediately.
- Make entire preset offer cards selectable, not just the button at the bottom.
- Promote “customize your own” from a text link to a clearer secondary action.
- Add a confirmation dialog before accepting:
  - Funded amount.
  - Payment amount.
  - Payment frequency.
  - Term.
  - Total payback.
  - Funding date.
- Auto-open or strongly surface the payment schedule after a customer selects terms.
- Add simple explanations for fee terms.
- Clarify post-acceptance copy so it does not conflict with remaining upload tasks.
- Add per-file upload confirmation with file name, upload time, and received state.
- Add a fallback message if bank verification is blocked by the browser.

### Public referral/application page
Recommended improvements:
- Add grouped sections: Business, Contact, Funding.
- Reuse phone formatting from the rest of the app.
- Add inline field-level validation instead of only one final error summary.
- Show referral source or partner context when available.
- Add a “what happens next” timeline after submission.
- Add character counters where text limits exist.
- Make confirmation resilient if the customer refreshes the page.

### Login and password flows
Recommended improvements:
- Add password show/hide buttons.
- Add visible password requirements on reset.
- Add clearer expired-reset-link recovery.
- Add a contact/support path on pending access.
- Cross-link rep login and partner login for users who land on the wrong page.

## Missing or underdeveloped features

### Workflow productivity
- Saved views across sales and partner worklists.
- Bulk actions for reminders and exports.
- Follow-up tasks tied to Stage.
- Notes and mentions on deals/applications.
- Pinned or recently viewed deals/applications.
- Duplicate/copy offer.
- Offer templates.

### Reporting
- Sales rep performance dashboard.
- Offer funnel analytics: built → sent → viewed → accepted → docs received → funded.
- Partner application funnel analytics.
- Time-in-stage reporting.
- Forecasted funded volume.
- Commission payout batches and reconciliation.

### Communication
- Automated email sending once the email domain is connected.
- Optional texting integration.
- Scheduled reminders.
- Notification preferences by event type.
- Message history attached to each offer/application.

### Data quality
- Duplicate detection for merchants, business names, emails, and phone numbers.
- Completeness meters before send or submission.
- Better field-level validation with jump-to-field behavior.
- Per-document required, missing, uploaded, approved, and rejected states.

## Recommended implementation phases

### Phase 1 — Sales card scanability
Build the minimized-card quick-status icons, tooltips, priority reason line, stronger full-card hover/focus state, and common quick filters.

No backend changes expected.

### Phase 2 — Sales workflow clarity
Add next-best-action labels, send-history improvements, auto-log copied send copy, follow-up reminders, and deal-builder readiness indicators.

May require a small reminder/task table if reminders are saved.

### Phase 3 — Partner portal cohesion
Apply the shared work-item pattern to applications, partner network rows, support tickets, and commission rows. Add Stage wording, tab counts, clickable KPIs, saved views, and better application detail summary.

Mostly front-end; saved views may use local storage first.

### Phase 4 — Customer conversion and trust
Add offer progress strip, acceptance confirmation dialog, improved custom amount CTA, selectable preset cards, stronger post-acceptance next steps, improved upload confirmations, and referral/application form validation.

Mostly front-end; no major backend change expected.

### Phase 5 — Automation and reporting
Add automated email/text sending, scheduled follow-ups, sales funnel reporting, time-in-stage reporting, commission payout batches, and duplicate detection.

This phase may need backend tables, permissions, and notification jobs.

## Proposed next build
Start with Phase 1 because it directly addresses your feedback: keep the cohesive expandable cards, then add right-side minimized-card icons for quick visual updates, better priority cues, and faster sales-side filtering.
