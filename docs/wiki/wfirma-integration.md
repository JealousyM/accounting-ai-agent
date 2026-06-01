# wFirma Integration

## What this is
Connects the platform to the Polish wFirma accounting SaaS. Wraps all wFirma REST API calls, applies exponential-backoff retry logic, and caches responses in PostgreSQL to avoid hammering the external API.

## Entry points
- `packages/api/src/services/wfirma/client.ts` — `WFirmaClient`: Axios instance with retry logic
- `packages/api/src/services/wfirma/` — one service file per wFirma module: `invoice.service.ts`, `contractor.service.ts`, `expense.service.ts`, `payment.service.ts`, `declaration.service.ts`, `document.service.ts`, `financial.service.ts`, `ledger.service.ts`, `taxregister.service.ts`, `term.service.ts`, `vehicle.service.ts`, `company.service.ts`, `user.service.ts`
- `packages/api/src/services/wfirma-cache.service.ts` — PostgreSQL-backed TTL cache for wFirma responses
- `packages/api/src/services/wfirma-integration.factory.ts` — `WFirmaServiceFactory`: instantiates per-user service sets with resolved credentials
- `packages/api/src/services/README.wfirma.md` — detailed integration guide

## Key concepts
- **WFirmaClient** — base Axios client; retries 3× with exponential backoff (1 s, 2 s, 4 s) on network errors and 5xx.
- **WFirmaIntegrationService** — top-level facade that delegates to each module service; used by `AIChatService`.
- **WFirmaServiceFactory** — resolves per-user credentials (from `CredentialsService`) and returns a fresh `WFirmaIntegrationService` scoped to that user's company.
- **WFirmaCacheService** — stores serialized wFirma API responses in the `WFirmaCache` Prisma model with configurable TTL; cache key includes `userId + cacheType + params hash`.
- **wFirma modules** — each module service maps to one wFirma API resource group (invoices, contractors, expenses, etc.).

## Cross-references
- Talks to: wFirma API at `https://api2.wfirma.pl`
- Talks to: `database` for cache persistence (`WFirmaCache` model)
- Talks to: `auth` / `credentials` for per-user API key resolution
- Used by: `ai-chat` tools (`invoice.tools.ts`, `contractor.tools.ts`, etc.)
- Used by: `ksef` wFirma adapter (`adapters/wfirma-adapter.ts`)

## Where to look first
`packages/api/src/services/wfirma/client.ts` for the retry/auth mechanism, then any module service (e.g., `invoice.service.ts`) for the pattern all modules follow.
