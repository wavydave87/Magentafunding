# Merchant offer page + rep phone

## What exists today (verified in code)

- The public offer page already has the structure picker from your screenshot: Daily/Weekly toggle, three approved preset cards with "Select This Option", a "Want something in between? Customize your own" link, a funded-amount slider, and a "Select This Structure" action.
- The offer page already renders the rep's phone when present (`rep_phone` is exposed by the public offer view).
- The rep-side builder has Rep name and Rep email only — there is no phone input, so `rep_profiles.phone` stays empty forever and the merchant page never shows a number.

## What to change

### 1. Rep side: phone number
- Add a "Rep phone" field to the Merchant & rep section of the offer builder (`/deals/:id`), next to rep name/email.
- Prefill it from the signed-in rep's saved profile; persist it on save (draft and sent) as part of the existing rep profile upsert, so it stops being dropped.
- Treat it as optional but validated loosely (digits/format hints only, no hard block on save).

### 2. Merchant side: reflect the phone
- Show the rep's phone in the "Your representative" / footer contact block as a tappable `tel:` link alongside name and email, and hide the separator cleanly when no phone is saved.

### 3. Polish the structure picker to match the reference exactly
- Slider steps in $100 increments, clamped to the offer's approved min/max, with the live amount shown in brand plum above the track.
- Under the slider: fixed-term sentence, then the Estimated Payment / Total Payback pair, then the full-width "Select This Structure" button — matching the reference spacing, borders and card highlight for the currently selected option.
- Selecting a preset or a custom amount keeps driving the same downstream summary, early-payoff table, checklist and upload zone; all math stays in `src/lib/pricing.ts` (no formula changes).

## Notes

- No database migration needed: `rep_profiles.phone` and the view's `rep_phone` already exist.
- Document upload and acceptance behaviour, including the loading/error states, stay exactly as they are.
