# Rebuild the client offer page to match your HTML version

Rework `/offer/:dealId` so it looks and flows exactly like the mockup you uploaded, while keeping the real backend behavior that already works (acceptance recorded in the database, document upload into the private closing-documents storage).

## Page flow (matching your version)

1. **Hero card** — faint magenta icon watermark top-right, small logo badge + "magenta · Invest in Possible" line, circled checkmark next to "You're approved, {Merchant}!", the intro sentence, an "Offer valid through {date}" pill, and the four-color gradient rule (dark purple → magenta → coral → gold).
2. **Pick your structure** — Daily / Weekly segmented toggle (only when weekly is allowed), then the three preset cards: label, big payment figure with "Daily/Weekly Payment" caption, and Funded / Term / Total Payback rows, each with its own "Select This Option" button. Selected card gets the magenta border, tint and glow.
3. **Customize your own** — collapsed "Want something in between? Customize your own →" link that opens an amount slider bounded by the deal's min/max in $100 steps, the fixed-term note, live Estimated Payment / Total Payback metrics, and "Select This Structure".
4. **Your selected structure** — hidden until a structure is chosen, then a bordered 2-column stat grid: Funded Amount, Term, Payment, Total Payback, Origination Fee, Other Fees, Total Fees, Net Funded. Early payoff options render as the 4-column table (If paid within / Discount / You Save / Payoff Amount) with savings in green. Full-width "Accept This Offer" button plus rep contact line underneath.
5. **What we'll need to move forward** — green confirmation note after acceptance, then the checklist with magenta check icons.
6. **Upload your closing documents** — dashed drop zone with click-and-drag support, file list with remove buttons, and progress/help text. Unlike the mockup, this keeps the current real upload: files go to the private bucket, are recorded against the deal, and only your reps can view them. Copy is adjusted to say that instead of "nothing uploads to a magenta server".
7. **Footer** — full magenta logo and "This offer was prepared for {Merchant} by {Rep} at magenta."

Expired offers still show the expiry notice and hide the accept action; already-accepted offers open on the selected structure with the acceptance banner and the upload card.

## Technical notes

- Only `src/routes/offer.$dealId.tsx` changes, plus any brand token/utility additions in `src/styles.css` (gradient rule, success/coral/gold accents, watermark helper) so no raw hex values land in the component.
- All math continues to come from `computeStructure` / `pifOutcome` in `src/lib/pricing.ts`; no formulas are re-derived and no internal buy rate or upsell data is fetched.
- Data still reads from `public_deal_view` plus presets, PIF tiers, checklist items, acceptance and uploaded documents; acceptance still goes through the `accept_offer` function, which validates the custom slider amount against the approved min/max range.
- Custom-amount selections are passed to acceptance as the chosen amount, so a slider pick is recorded exactly like a preset pick.
