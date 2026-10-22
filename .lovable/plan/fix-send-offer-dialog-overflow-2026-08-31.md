# Fix Send Offer dialog overflow

The ready-made email/text previews spill past their card borders because the long offer URL can't wrap, and the dialog is too narrow for two side-by-side previews.

## Changes (presentation only, `src/components/send-offer-dialog.tsx`)

- Widen the dialog: `sm:max-w-xl` becomes `sm:max-w-3xl` so the two preview cards get real room, with `w-[calc(100vw-2rem)]` so it still fits small screens.
- Make preview text wrap: add `min-w-0` to each preview card and `break-words overflow-wrap-anywhere` (`wrap-anywhere`) to the email and text paragraphs so the URL breaks instead of overflowing.
- De-clutter the previews: cap each preview body height (`max-h-40 overflow-y-auto`) with a subtle inner scroll, bump body text to `text-[13px]/relaxed`, and give the copy button a top border separation so the card reads as label / message / action.
- Keep the offer-link input on one line but allow the QR row and note field to stay as-is; no changes to the message content, logging, or send logic.

## Verification

Open the Send Offer dialog at desktop and mobile widths and confirm no text crosses a card border and the copy buttons stay reachable.
