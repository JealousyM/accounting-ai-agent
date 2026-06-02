# Telegram Bot

## What this is
A Telegraf-based Telegram chatbot that lets linked users chat with the AI accounting agent and scan receipts via phone camera — all without opening the web app.

## Entry points
- `packages/api/src/services/telegram-bot/telegram-bot.service.ts` — `TelegramBotService`: bot orchestrator — registers handlers, manages link/unlink, polling/webhook lifecycle. Delegates the heavy lifting to the sub-modules below (constructor-injected).
- `packages/api/src/services/telegram-bot/ai-chat-router.ts` — `AIChatRouter`: routes text messages to `AIChatService`, creating a conversation if needed, and formats the reply for Telegram.
- `packages/api/src/services/telegram-bot/ocr-flow-handler.ts` — `OcrFlowHandler`: the photo → receipt-OCR → expense confirmation flow.
- `packages/api/src/services/telegram-bot/rate-limiter.ts` — `TelegramRateLimiter`: per-user 60s / 10-message window (Redis-backed).
- `packages/api/src/services/telegram-bot/tax-deadline-reminder.service.ts` — `TaxDeadlineReminderService`: hourly scheduler that proactively DMs users about upcoming tax deadlines (see [tax-reminders](tax-reminders.md)).
- `packages/api/src/services/telegram-bot/markdown-converter.ts` — converts AI markdown to Telegram-compatible HTML and splits long messages.
- `packages/api/src/routes/telegram-bot.routes.ts` — `/api/telegram-bot/link-code` endpoint (generates 6-digit linking code)
- `packages/api/src/controllers/telegram-bot.controller.ts` — HTTP handler for link code generation

## Key concepts
- **Account linking** — user generates a 6-digit code in the web app (stored in Redis for 5 minutes), then sends it to the bot via `/start <code>`; bot stores `telegramId → userId` in `TelegramLink`.
- **AI chat pass-through** — `AIChatRouter` forwards linked user messages to `AIChatService.processMessage()`; responses are converted to Telegram HTML and split into ≤ 4096-char chunks.
- **Proactive tax reminders** — `TaxDeadlineReminderService` runs hourly and DMs linked users about upcoming Polish tax deadlines (see [tax-reminders](tax-reminders.md)).
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
`packages/api/src/services/telegram-bot/telegram-bot.service.ts` — see how handlers are registered and which sub-module each delegates to, then `ocr-flow-handler.ts` for the photo flow and `ai-chat-router.ts` for the text/AI flow.
