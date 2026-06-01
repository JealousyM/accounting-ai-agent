# Database

## What this is
PostgreSQL database accessed via Prisma ORM. Stores all application data: users, conversations, wFirma cache, KSeF invoices, HR records, memory, audit logs, and more. Redis is used alongside for ephemeral data (rate limiting, linking codes, OCR cache).

## Entry points
- `packages/api/prisma/schema.prisma` — single source of truth for all models and relations
- `packages/api/prisma/migrations/` — timestamped migration history
- `packages/api/src/lib/prisma.ts` — `PrismaClient` singleton (`export const prisma`)
- `packages/api/src/lib/redis.ts` — Redis client singleton (`export const redis`)

## Key models
- **User** — core entity; holds auth, subscription, org membership, locale, and LLM preferences
- **AIConversation / AIMessage** — chat history per user (or shared at org level)
- **AIMemory** — persistent cross-session memory entries (category, content, source)
- **WFirmaCache** — serialized wFirma API responses with TTL; keyed by `(userId, cacheType, paramsHash)`
- **KSeFInvoice / KSeFSession / KSeFConfig** — e-invoice lifecycle tracking
- **Organization** — company grouping; users reference via `orgId`
- **Employee / Contract / Payroll / Absence** — HR module tables
- **Referral** — referral program tracking (code, referrer, referred, status)
- **AuditLog** — immutable record of all mutating API requests
- **TelegramLink** — maps Telegram user IDs to platform user IDs

## Key concepts
- **Migrations** — run with `npm run prisma:migrate`; never edit migration files after they've been applied.
- **`prisma generate`** — must be re-run after any schema change to update the TypeScript client (`npm run prisma:generate`).
- **Redis usage** — rate-limit counters, 6-digit Telegram link codes (5 min TTL), OCR parsed-receipt cache (10 min TTL), wFirma session tokens.
- **Soft deletes** — employees and some other HR entities use `deletedAt` timestamp instead of hard delete.

## Cross-references
- Used by: every service in `packages/api/src/services/`
- Redis used by: `telegram-bot`, `auth` (link codes), `rate-limiter.middleware.ts`

## Where to look first
`packages/api/prisma/schema.prisma` to understand any model; run `npm run prisma:studio` to browse data visually.
