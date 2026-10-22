# Lighter Accepted Tint, Brand Swap, and a Persistent Top Banner

## 1. Lighter accepted/selected tint

The soft pink surface token is shared by the merchant's selected card and the sales-side accepted highlights, so one token change fixes both views. Lighten it noticeably (roughly a 50% lighter wash of the current pink), soften the magenta ring so the block reads as a gentle highlight rather than a filled panel, and lighten the dark-mode counterpart to match.

## 2. Merchant view: logo and icon swap places

- Top of the merchant offer: show the full "magenta — Invest in Possible" logo (the uploaded lockup, already in the project as an asset) instead of the small icon plus text line.
- Bottom of the merchant offer: use the compact leaf icon instead of the full logo, keeping the prepared-by sentence.
- The faint oversized watermark in the hero stays as-is.

## 3. Persistent top banner on both sides

One shared, aesthetic brand bar that stays visible while scrolling:

- Sticky, full-width, translucent card background with blur and a hairline bottom border, plus the thin four-color brand gradient rule along its bottom edge so it reads as intentional brand chrome.
- Merchant side: logo on the left, and on the right a quiet contact line for the rep (name plus tappable phone, or email when no phone), so help is always one tap away while scrolling long offer content. Compact on mobile — logo plus a single "Call/Email" control.
- Sales side: the same bar, with existing Deals / Reps / Sign Out controls on the right; it becomes sticky rather than scrolling away.
- The merchant hero keeps its approval headline and validity pill; the banner sits above it.

## 4. Expert review — suggested improvements

Ranked, nothing implemented without your go-ahead:

1. Offer expiry is only shown as text. Add a real expiry state: after the expiration date, the merchant page should disable accept/revise and show "Contact your rep for an updated offer", and the deals list should show an Expired badge automatically instead of relying on stored status.
2. There is no email or SMS notification when a merchant accepts or asks for a change — today the rep must be on the dashboard to see the toast. Adding transactional email to the rep would close that gap.
3. Merchant uploads have no file type or size limits at the UI level, and no way for the rep to mark a checklist item satisfied. Tying uploads to the closing-document checklist would make status obvious.
4. The deals list has no search box. Once there are dozens of deals, filters and sorting alone will not be enough.
5. No audit trail of what the rep changed after sending a link (rate, amount range, term). A simple change log per deal protects everyone.
6. A print/PDF-friendly view of the accepted structure would help merchants share it internally with their bank or partner.
7. Dashboard reads all deals, acceptances, revisions, and upload rows in full. Fine now, worth moving to server-side aggregates when volume grows.

## Technical notes

- `src/styles.css`: lighten `--selected` (and dark variant), soften `card-accepted` ring; no component color hardcoding.
- `src/components/brand.tsx`: make `BrandHeader` sticky with the gradient rule, accept an optional right slot already supported, and add a merchant variant usage; swap `BrandFooter` / hero asset usage.
- `src/routes/offer.$dealId.tsx`: render the shared banner above the hero with rep contact, replace hero icon+text with the full logo, replace footer logo with the icon.
- `src/components/app-shell.tsx`: no structural change beyond sticky header behavior inherited from `BrandHeader`.
- Existing mobile tap-target tests cover the new banner controls; they will be extended to assert the banner's 44px controls.
