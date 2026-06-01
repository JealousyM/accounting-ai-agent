# Telegram Bot

## What this is
A Telegraf-based Telegram chatbot that lets linked users chat with the AI accounting agent and scan receipts via phone camera — all without opening the web app.

## Entry points
- `packages/api/src/services/telegram-bot/telegram-bot.service.ts` — `TelegramBotService`: all message handlers, OCR flow, account linking
- `packages/api/src/services/telegram-bot/markdown-converter.ts` — converts AI markdown to Telegram-compatible MarkdownV2
- `packages/api/src/routes/telegram-bot.routes.ts` — `/api/telegram-bot/link-code` endpoint (generates 6-digit linking code)
- `packages/api/src/controllers/telegram-bot.controller.ts` — HTTP handler for link code generation

## Key concepts
- **Account linking** — user generates a 6-digit code in the web app (stored in Redis for 5 minutes), then sends it to the bot via `/start <code>`; bot stores `telegramId → userId` in `TelegramLink`.
- **AI chat pass-through** — linked user messages are forwarded to `AIChatService.processMessage()`; responses are split into ≤ 4096-char chunks and sent back as MarkdownV2.
- **Photo/OCR flow** — user sends a photo → `ReceiptOCRService` extracts structured data → bot replies with a receipt card and two inline buttons: **Book as expense** or **Dismiss**.
- **Book-as-expense** — pressing the button calls `createExpenseFromParsedReceipt()` directly in wFirma without going through the AI agent; parsed receipt is cached in Redis for 10 minutes (`OCR_PARSED_TTL_SECONDS = 600`).
- **Rate limiting** — 10 messages per user per 60-second window (Redis counter).
- **Locale detection** — `detectLocale()` is called on every message so replies are in the user's language.

## Cross-references
- Talks to: `ai-chat` — delegates text messages to `AIChatService`
- Talks to: `ocr` — sends photos to `ReceiptOCRService`
- Talks to: `wfirma-integration` — books expenses directly via `WFirmaServiceFactory`
- Talks to: `database` — `TelegramLink` model for account mapping
- Talks to: Redis — rate limiting and OCR result caching
- Enabled by: `TELEGRAM_CHATBOT_TOKEN` env var; bot is disabled if not set

## Where to look first
`packages/api/src/services/telegram-bot/telegram-bot.service.ts` — search for `bot.on('photo'` for the OCR flow and `bot.on('text'` for the AI chat flow.
