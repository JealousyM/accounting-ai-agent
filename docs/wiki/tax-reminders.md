# Tax Deadline Reminders

## What this is
Proactive notifications for upcoming Polish statutory tax deadlines (VAT, CIT, PIT, ZUS, PCC, dividends). Two surfaces:
- **Telegram push** — linked users are DMed by the bot a configurable number of days before each deadline.
- **In-chat nudge** — the web chat sidebar surfaces the next upcoming deadlines contextually.

Deadline data itself comes from `TaxCalendarService` (see [ai-chat](ai-chat.md) for the matching `get_tax_deadlines` AI tool).

## Entry points
- `packages/api/src/services/telegram-bot/tax-deadline-reminder.service.ts` — `TaxDeadlineReminderService`: the hourly scheduler and per-user reminder logic.
- `packages/api/src/services/telegram-bot/tax-deadline-reminder.instance.ts` — singleton; constructed with `telegramBotService`.
- `packages/api/src/index.ts` — calls `taxDeadlineReminderService.start()` at boot (alongside the KSeF status poller and health monitor).
- `packages/api/src/services/tax-calendar.service.ts` — `TaxCalendarService.getUpcomingDeadlines()`; source of the deadlines and `formatDateKey()`.
- `packages/api/src/routes/tax-calendar.routes.ts` — `/api/tax-calendar/*` endpoints used by the frontend sidebar nudge.

## Key concepts
- **Hourly tick, once-a-day send** — `start()` runs `tick()` immediately and then every hour (`CHECK_INTERVAL_MS = 1h`). `tick()` is a no-op unless the current hour equals `TAX_REMINDER_HOUR` (env, default `9`).
- **Per-day dedup via Redis** — before sending, the day is marked with key `tax:reminders:sent:<YYYY-MM-DD>` (TTL 25h) so a restart or a second tick within the hour can't double-send.
- **Opt-in, per-user lead time** — only `TelegramLink` rows with `reminderEnabled = true` are processed; each carries `reminderLeadDays`. A user is notified for deadlines due in *exactly* `reminderLeadDays` days.
- **Localized message** — reminder text is rendered in the user's `locale` (pl/en/ru) and sent via `telegramBotService.sendProactiveMessage()`.
- **Bot-gated** — `tick()` returns early if the Telegram bot is not initialized (i.e. `TELEGRAM_CHATBOT_TOKEN` unset), so the scheduler is inert without the bot.

## Cross-references
- Part of: [telegram-bot](telegram-bot.md) — lives in the telegram-bot service folder and pushes via the bot.
- Talks to: `tax-calendar` (`TaxCalendarService`) for deadline data.
- Talks to: `database` — `TelegramLink.reminderEnabled` / `reminderLeadDays`.
- Talks to: Redis — per-day send dedup.
- Related contracts: `docs/contracts/telegram-tax-deadline-reminders.md`, `docs/contracts/tax-calendar-upcoming.md`.

## Where to look first
`tax-deadline-reminder.service.ts` — read `tick()` then `processUserReminder()` to follow a single reminder from schedule to Telegram message.

## Gotchas
- `TelegramLink.reminderEnabled` / `reminderLeadDays` are read via a `TelegramLinkWithReminders` cast because the generated Prisma client may lag the migration — the cast should be removed after `prisma generate`.
