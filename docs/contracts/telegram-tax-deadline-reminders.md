# Module Contract: Telegram Tax Deadline Reminders

## TaxDeadlineReminderService

**File:** `packages/api/src/services/telegram-bot/tax-deadline-reminder.service.ts`

### Responsibilities
- Run hourly, detect the configured reminder hour (default 09:00).
- On first tick within the reminder hour, fetch all `TelegramLink` records with `reminderEnabled = true`.
- For each user, find tax deadlines from `TaxCalendarService` whose adjusted date falls exactly `reminderLeadDays` days in the future.
- Send a plain-text reminder via `TelegramBotService.sendProactiveMessage()`.
- Use Redis key `tax:reminders:sent:YYYY-MM-DD` (25h TTL) to prevent duplicate sends on restart.

### Dependencies (injected via constructor)
| Dep | Type | Purpose |
|-----|------|---------|
| `telegramBotService` | `TelegramBotService` | Send proactive messages |

### Uses (module-level)
| Dep | How |
|-----|-----|
| `prisma` | `telegramLink.findMany({ where: { reminderEnabled: true }, include: { user: { select: { locale: true } } } })` |
| `redis` | Dedup key read/write |
| `TaxCalendarService` | `getUpcomingDeadlines(leadDays + 1, locale, 0)` |
| `formatDateKey` | Date string comparison |

### Public API
```typescript
start(): void                 // begin hourly tick
stop(): void                  // clear interval
```

---

## TelegramBotService additions

**File:** `packages/api/src/services/telegram-bot/telegram-bot.service.ts`

### New public method
```typescript
async sendProactiveMessage(telegramUserId: string, text: string): Promise<void>
```
Sends a plain-text message to a Telegram user by their numeric chat ID.
Logs and re-throws on failure so the caller can skip/continue.

### New `/reminders` command
```
/reminders           → show current settings (on/off, lead days)
/reminders on        → enable reminders
/reminders off       → disable reminders
/reminders 1|3|7     → set lead-time days (validates: only 1, 3, 7 accepted)
```

---

## Prisma schema changes

**Model:** `TelegramLink`

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `reminderEnabled` | `Boolean` | `true` | Whether user receives daily reminders |
| `reminderLeadDays` | `Int` | `3` | Days before deadline to send reminder |

---

## Redis keys used

| Key | TTL | Purpose |
|-----|-----|---------|
| `tax:reminders:sent:YYYY-MM-DD` | 25h | Prevents duplicate daily send |

---

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `TAX_REMINDER_HOUR` | `9` | Hour (0-23) at which reminders are sent |
