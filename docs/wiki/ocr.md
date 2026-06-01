# OCR (Receipt / Invoice Scanning)

## What this is
Extracts structured accounting data from receipt and invoice photos using OpenAI GPT-4o vision. Designed for the Telegram bot photo flow; the output can also be used by AI chat tools to pre-fill expense fields.

## Entry points
- `packages/api/src/services/ocr/receipt-ocr.service.ts` — `ReceiptOCRService.parseReceipt(imageUrl)` — calls GPT-4o and returns a `ParsedReceipt`
- `packages/api/src/services/ocr/types.ts` — `ParsedReceipt` type and Zod schema (`ParsedReceiptSchema`)
- `packages/api/src/services/ocr/formatter.ts` — `formatParsedReceipt()` turns `ParsedReceipt` into a localized markdown card
- `packages/api/src/services/ocr/receipt-ocr.instance.ts` — singleton export `receiptOCRService`

## Key concepts
- **Model** — uses `gpt-4o` (vision-capable); temperature 0 for deterministic extraction.
- **Structured output** — system prompt instructs the model to return a single JSON object matching `ParsedReceipt`; response is validated with Zod.
- **Document types** — `paragon` (receipt), `faktura` (VAT invoice), `rachunek` (bill), `unknown`.
- **Confidence score** — model self-reports a 0–1 confidence on the extracted totals; low-confidence cards show a warning in the formatted output.
- **Polish VAT** — system prompt lists valid Polish VAT rates (23, 8, 5, 0, ZW, NP) so the model maps them correctly.
- **Currency** — defaults to PLN; other currencies are preserved as-is.

## Cross-references
- Used by: `telegram-bot` — primary consumer; bot calls `parseReceipt`, caches result in Redis, shows inline buttons
- Used by: `ai-chat` — `expense.tools.ts` can call `createExpenseFromParsedReceipt` with a `ParsedReceipt` object
- Requires: per-user OpenAI API key (resolved via `CredentialsService`)

## Where to look first
`packages/api/src/services/ocr/receipt-ocr.service.ts` for the GPT-4o prompt and parsing logic; `packages/api/src/services/ocr/types.ts` for the exact output shape.
