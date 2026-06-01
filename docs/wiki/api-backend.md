# API Backend

## What this is
The Express.js backend package (`packages/api`) is the server-side core of the platform. It exposes a REST API consumed by the Next.js frontend and the Telegram bot, handles JWT/OAuth auth, orchestrates all service layers, and hosts the AI chat agent.

## Entry points
- `packages/api/src/index.ts` — Express app bootstrap, route registration, middleware setup
- `packages/api/src/routes/` — one file per domain (e.g., `ai-chat.routes.ts`, `ksef.routes.ts`)
- `packages/api/src/controllers/` — HTTP handlers that call services
- `packages/api/src/services/` — business logic; singletons via `*.instance.ts` files
- `packages/api/src/lib/prisma.ts` — shared Prisma client singleton
- `packages/api/src/lib/redis.ts` — shared Redis client singleton

## Key concepts
- **Layered architecture** — `routes → controllers → services → Prisma/Redis`; services never import routes.
- **Singleton services** — every service is instantiated once in `*.instance.ts` and imported by name; avoids circular construction.
- **Zod validation** — every request body is parsed by a Zod validator in `validators/` before reaching the controller.
- **JWT middleware** — `auth.middleware.ts` verifies the bearer token and attaches `req.user`; most routes require it.
- **Subscription middleware** — `subscription.middleware.ts` gates pro-only features based on `req.user.subscriptionPlan`.
- **Audit log middleware** — `audit-log.middleware.ts` writes a record for every mutating request.
- **Rate limiter** — `rate-limiter.middleware.ts` uses Redis-backed sliding-window counters per user.

## Cross-references
- Talks to: `wfirma-integration` via `WFirmaIntegrationService`
- Talks to: `ai-chat` via `AIChatService`
- Talks to: `database` via Prisma
- Used by: `web-frontend` via HTTP/REST
- Used by: `telegram-bot` which runs inside the same process

## Where to look first
Start at `packages/api/src/index.ts` to see how middleware and routes are wired, then follow a specific route file into its controller and service.
