# Autonomous AI Bookkeeper — Daily Brief (MVP) — Design

**Date:** 2026-06-09
**Status:** Approved (brainstorming) — ready for implementation plan
**Related product idea:** `docs/product-ideas/autonomous-ai-bookkeeper.md`

## Summary

Turn the product from a reactive chat tool into a proactive agent by adding a
**Daily Brief**: a once-per-day, per-user background run that reviews the user's
books and surfaces what matters today. The MVP is **read-only** — it analyzes and
suggests, but never mutates wFirma. The brief is delivered through **two channels**:
an in-app "Today" card (persisted in the DB) and a Telegram DM (for linked users).

This generalizes the existing `TaxDeadlineReminderService` pattern (hourly
scheduler + Redis dedupe + `sendProactiveMessage`) from one narrow alert into a
full daily review.

## Decisions (locked during brainstorming)

1. **Autonomy:** Notify-only / read-only. No actions executed against wFirma in MVP.
   Every item is informational with a "discuss in chat" deep link.
2. **Delivery:** Both channels — persist to DB (Today card) **and** Telegram DM.
3. **Brief content blocks (all read-only):**
   - Overdue / unpaid invoices (receivables)
   - Upcoming tax deadlines
   - New expenses since last run + suggested category
   - Short period summary (revenue/expenses vs last month, one anomaly)
4. **Generation engine — Approach A:** Deterministic data collection (call existing
   services directly) + a single cheap LLM call used *only* for expense
   categorization. No full agent run in MVP (that belongs to a later "auto-act" phase).

## Architecture

New backend modules under `packages/api/src/services/daily-brief/`:

| Component | Responsibility |
|---|---|
| `DailyBriefScheduler` | `setInterval` hourly; once per day at `DAILY_BRIEF_HOUR` (default 08:00); Redis dedupe key `brief:sent:{date}`. Started in `index.ts`. Mirrors `TaxDeadlineReminderService`. |
| `DailyBriefService` | Orchestrates one run: for each subscribed user, collect blocks → build brief object → persist → hand to delivery. Owns the **skip-if-empty** guard. |
| `BriefBlockCollectors` | Pure functions, one per block (receivables, taxDeadlines, newExpenses, periodSummary). Each returns a typed fragment or `null`. Call existing services directly. |
| `BriefComposer` | Turns the structured object into localized markdown (pl/en/ru templates, like the reminder). One optional LLM call only for expense categories. |
| `BriefDelivery` | Two channels: DB record (for the Today card) + `telegramBotService.sendProactiveMessage`. |

**Isolation principle:** collectors don't know about delivery or storage; the
composer doesn't know about data sources; the scheduler doesn't know about block
content. Each unit is tested independently with mocked services.

## Data model

New Prisma model:

```prisma
model DailyBrief {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  briefDate  DateTime @db.Date            // day the brief is for (dedupe)
  content    Json     @db.JsonB           // structured blocks (source for UI)
  summaryMd  String   @db.Text            // rendered markdown (Telegram + fallback)
  isRead     Boolean  @default(false)     // for the web badge
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, briefDate])           // at most one brief per user per day
  @@index([userId, createdAt])
  @@map("daily_briefs")
}
```

**Subscription:** new flag on `User`: `dailyBriefEnabled Boolean @default(true)`.
The Today card works for everyone; the Telegram duplicate is sent only when a
`TelegramLink` exists. We reuse `TelegramLink` for the Telegram channel.

## Run flow (`DailyBriefService.runDailyBriefs()`)

1. Scheduler fires at `DAILY_BRIEF_HOUR`; Redis guard `brief:sent:{date}` (set
   **before** delivery so a delivery crash can't trigger a re-run).
2. Load all `User` with `dailyBriefEnabled = true`.
3. Per user: collect the 4 blocks in parallel with `Promise.allSettled` so one
   failing source doesn't sink the whole brief.
4. **Skip-if-empty:** if every block is empty/insignificant, no brief is created
   or sent (prevents daily-nag fatigue on quiet days).
5. Otherwise: `BriefComposer` → markdown → upsert `DailyBrief` (by
   `userId+briefDate`) → deliver.

## Block logic

| Block | Source | Significance (show when) |
|---|---|---|
| Receivables | `payment.service` / invoice cache, filtered by `paymentState`. **Exclude PK ledger documents without `paymentState`** (known project quirk — see memory `wfirma-find-returns-pk-ledger-docs`). | ≥1 unpaid/overdue |
| Tax deadlines | `TaxCalendarService.getUpcomingDeadlines(N)` | a deadline within next `N` days |
| New expenses | wFirma expense cache, delta by `createdAt > since` | new since last run; LLM suggests category |
| Period summary | `financial.tool` data | always, when wFirma is connected |

**"New since last run":** use the `briefDate` of the user's most recent
`DailyBrief` as the `since` boundary for the new-expenses block. No separate
cursor table.

## Dedupe vs the existing tax reminder

`TaxDeadlineReminderService` already sends a separate one-off tax push
`reminderLeadDays` before a deadline. To avoid two same-topic messages a day:

- **MVP decision:** the brief shows deadlines within `N=7` days as an **overview**
  ("what's coming"); the sharp one-off reminder (`leadDays`) stays as-is — it has a
  different role (urgent "ZUS tomorrow" alert). They don't duplicate semantically:
  brief = daily overview, reminder = single urgent signal. When a sharp deadline
  falls in the window, the brief marks it "📌 we'll remind you separately."
- The working reminder is **not** touched in MVP. Folding it fully into the brief is
  a future option.

## LLM cost

The only LLM call is expense categorization, **only when** the new-expenses block
is non-empty. Cheap model (Haiku-class), batched over all of a user's new expenses
at once. A quiet day → 0 LLM calls. Cost stays near zero.

## Delivery

- **Web (Today card):** the `DailyBrief` DB record is the source. New REST:
  `GET /api/daily-brief/today` (latest brief) and `POST /api/daily-brief/:id/read`
  (clear badge). Frontend: `<TodayBriefCard>` on the dashboard, dot badge when
  `isRead=false`. Each block carries a "Discuss in chat" deep link (prefilled
  question into the existing chat).
- **Telegram:** `summaryMd` → `sendProactiveMessage(telegramUserId, ...)`, only if a
  `TelegramLink` exists. No inline action buttons (read-only MVP) — text + a
  "type /new to discuss" hint.

## Error handling

- Block collection: `Promise.allSettled`; a failed block is logged and skipped, the
  brief is built from the rest.
- A failure for one user does not break the loop (per-user try/catch, like the reminder).
- LLM categorization fails → expenses shown without a category suggestion (graceful
  degradation); brief still sent.
- Telegram delivery fails → brief is already in the DB, the web card works; error logged.
- Dedupe: the brief record and the Redis guard are written **before** delivery, so a
  delivery crash cannot cause a re-run.

## Testing

- Unit per collector (mocked services → significance / emptiness checks).
- Unit for `BriefComposer` — pl/en/ru localization, correct markdown, empty blocks.
- Unit for `DailyBriefService` — skip-if-empty, upsert dedupe, per-user error isolation.
- Unit for the scheduler — fires only at `DAILY_BRIEF_HOUR`, Redis guard.
- Integration for REST `/api/daily-brief/*` (auth, users only access their own briefs).

## Configuration (env)

- `DAILY_BRIEF_HOUR` (default 8)
- `DAILY_BRIEF_DEADLINE_HORIZON_DAYS` (default 7)
- `DAILY_BRIEF_ENABLED` (kill-switch)
- Locale from `user.locale`.

## Scope / effort

~2 weeks: backend glue + 1 model/migration + 1 REST route + 1 frontend card + tests.
Auto-actions and the tax-optimization advisor (product ideas #2/#3) layer on top later.

## Out of scope (MVP)

- Any mutation of wFirma data (categorization is suggested, not applied).
- Inline Telegram action buttons / confirm flows.
- Per-user autonomy dial.
- Email delivery channel (separate `weekly-financial-digest-email` idea).
- Cash-flow forecast and tax-optimization advisor (separate product ideas).
