# Make the Deal Page and Merchant Uploads Easy to Find

Your data is fine — the sample deal "Demo Diner (Sample)" is accepted and has 2 client uploads, and three other deals have 1 upload each. The problem is discoverability: the only way into a deal page is a small button labeled "Edit", and the Merchant Uploads section is hidden entirely when a deal has no files and sits far down the page when it does.

## Changes on the Deals list (sales dashboard)

- Rename the "Edit" button to "Open Deal" so it reads as the way into the full deal page.
- Make the merchant name itself a link to the deal page.
- Add a small "2 Client Uploads" indicator on each deal card when files exist, linking straight to the deal page's uploads section.

## Changes on the deal page

- Move Merchant Uploads to the top of the page, directly under the header, so it is the first thing visible on accepted deals.
- Always show the section, with a clear "No Client Uploads Yet" message when empty, instead of hiding it.
- Give the section an anchor target so links from the deals list scroll right to it.
- Keep "Download" and "Download All" behavior exactly as it works today.

## Technical notes

- `src/routes/_authenticated/dashboard.tsx`: button label, merchant-name link, per-deal upload count (add a light `uploaded_documents` count query keyed by deal, reusing the existing query pattern) and a link with a hash to the uploads section.
- `src/routes/_authenticated/deals.$dealId.tsx`: relocate the uploads `<section>` above the accepted/revision blocks, add `id="merchant-uploads"`, and render an empty state rather than returning `null`.
- No schema, RLS, or pricing-logic changes; presentation and one read query only.
