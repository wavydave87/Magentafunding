# Demo Deals Across Internal And Partner Views

Add a small, realistic demo set — three deals on the internal side and three matching partner applications — so every screen (rep dashboard, deal detail, public offer page, partner portal, Partner Network) shows the full lifecycle including stips and uploads.

## The three demo scenarios

Each internal deal is mirrored by a partner application in the same organization, so the same story is visible from both sides.

1. **Complete — accepted with all stips uploaded**
   - Deal accepted (amount, frequency, payment, payback, requested funding date recorded)
   - Full closing-document checklist, every item covered by an uploaded file
   - Offer views logged, bank verification clicked
   - Partner side: application funded, commission created, documents all received

2. **Accepted, no uploads yet**
   - Deal accepted, checklist present, zero uploaded documents
   - Partner side: application at contract stage, no documents

3. **Partially complete — a few stips missing**
   - Deal accepted, checklist present, roughly half the items uploaded
   - Partner side: application in "missing information" with the outstanding items listed and only some documents received

## What gets created

- 3 deals owned by existing Magenta reps, with presets, early-payoff tiers, closing checklist items, acceptance rows, view/activity history, and a send record so status reads correctly on the dashboard.
- Real placeholder PDF files uploaded to the closing-documents and partner-documents buckets, so "Download" and "Download All" actually work rather than pointing at missing files.
- 3 partner applications (one per existing partner organization: Northgate, Bluestone, Harbor Line) linked to the matching deal, with timeline events, documents, and a commission for the funded one.

Existing seeded data stays as it is; this adds a clearly named demo set on top (business names prefixed so they are easy to spot and remove later).

## Technical notes

- Deals, presets, `pif_tiers`, `closing_document_items`, `deal_acceptances`, `deal_views`, `deal_sends`, and `uploaded_documents` rows are inserted with a data script (not a schema migration).
- Storage: small generated PDFs uploaded to `closing-documents/<deal_id>/...` and `partner-documents/<application_id>/...`, with `uploaded_documents.storage_path` / `partner_documents.storage_path` pointing at them.
- Partner application status changes go through `partner_set_application_status` where possible so timeline events and notifications are generated the same way they are in the live flow; `linked_deal_id` is set so the internal detail page shows the deal link.
- Commission for the funded application is produced by the existing funded trigger rather than inserted by hand.
- A companion cleanup script removes only these demo rows and their storage objects.
