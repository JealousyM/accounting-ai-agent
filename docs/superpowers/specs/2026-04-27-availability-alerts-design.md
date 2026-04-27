# Availability Alerts — Design Spec

**Date:** 2026-04-27
**Status:** Draft
**Author:** brainstorming session
**Reference:** [`micode-ai/ai-budget-assistant`](https://github.com/micode-ai/ai-budget-assistant) — its admin header `Live`/`Offline` indicator and `/health` endpoint pattern.

## Problem

When the API is unavailable (process dead, database unreachable, Redis down) or when key external integrations fail (wFirma, OpenAI, Anthropic), there is currently no:

1. User-facing signal — users see request errors with no context, retry blindly, or assume their action is broken
2. Operator signal — the team learns about outages from user reports, not from monitoring

The existing `/health` endpoint (`packages/api/src/index.ts:66`) returns a static `{ status: 'ok' }` and does not actually verify any dependencies.

## Goals

- Show an in-app banner to authenticated users when the system is `down` (DB or Redis unreachable) or `degraded` (an external integration is unreachable)
- Notify the admin via the existing Telegram bot on state transitions (alert + recovery)
- Capture all unhandled errors and explicit health-state transitions in Sentry (api + web)
- Health probes must be **cost-free** — never call billable inference endpoints on OpenAI / Anthropic

## Non-Goals

- No SSE / WebSocket push — polling is sufficient and matches existing infrastructure
- No public status page (`/status` HTML route) — out of scope; Sentry / external uptime monitor handle history
- No multi-tenant per-org status — alerts are global, not user-scoped
- No incident history / uptime % computation — that lives in Sentry / UptimeRobot
- No external uptime monitor wiring (UptimeRobot, BetterStack) — the `/health` endpoint is designed to support them, but configuration is operator-side, not code

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│  Backend (packages/api)                                        │
│                                                                │
│  GET /health  ◄────────────────┐                               │
│    ├─ DB:    SELECT 1          │ poll 30s                      │
│    ├─ Redis: PING              │                               │
│    └─ Integrations (cached 5min, stale-while-revalidate):      │
│         ├─ wFirma   : list companies (admin/sandbox creds)     │
│         ├─ OpenAI   : GET /v1/models    (cost-free)            │
│         └─ Anthropic: GET /v1/models    (cost-free)            │
│                                                                │
│  HealthMonitorService (singleton, runs on boot)                │
│    └─ setInterval 30s → calls health.getSnapshot()             │
│        ├─ debounce: 2 fails in row = transition to down/degraded
│        ├─ on up→down/degraded → Sentry.captureMessage          │
│        │                       + Telegram alert to admin       │
│        └─ on degraded/down→up → Telegram recovery (+ downtime) │
│                                                                │
│  Sentry SDK (@sentry/node, init at process start)              │
│    └─ wraps express, captures unhandled errors automatically   │
└────────────────────────────────────────────────────────────────┘
                  ▲                                ▲
                  │ poll 30s                       │ exceptions
                  │                                │
┌─────────────────┴────────────────────────────────┴─────────────┐
│  Frontend (packages/web)                                       │
│                                                                │
│  useSystemHealth() → React Query, /health every 30s            │
│    └─ stops polling in background tabs (refetchInBackground=false)
│                                                                │
│  useOnlineStatus() → navigator.onLine listener                 │
│                                                                │
│  <SystemStatusBanner /> rendered inside ProtectedRoute         │
│    ├─ unreachable (browser offline) — neutral, "No internet"   │
│    ├─ down (DB/Redis)                — red,    "Service down"  │
│    ├─ degraded (integration)         — yellow, specific text   │
│    └─ ok                             — hidden                  │
│                                                                │
│  Sentry SDK (@sentry/nextjs)                                   │
│    └─ captures client exceptions + Session Replay on errors    │
└────────────────────────────────────────────────────────────────┘
```

## Backend Design

### `HealthService` — `packages/api/src/services/health/health.service.ts`

Computes a `HealthSnapshot` on demand. Stateless except for the integration cache.

```ts
type CheckResult = { ok: boolean; latencyMs: number; error?: string };

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  checks: { db: CheckResult; redis: CheckResult };
  integrations: {
    wfirma:    CheckResult;
    openai:    CheckResult;
    anthropic: CheckResult;
  };
}

class HealthService {
  async getSnapshot(opts?: { skipIntegrations?: boolean }): Promise<HealthSnapshot>;
  private checkDb(): Promise<CheckResult>;        // prisma.$queryRaw`SELECT 1`
  private checkRedis(): Promise<CheckResult>;     // redis.get('__health__')
  private checkWfirma(): Promise<CheckResult>;    // list companies, admin creds, 5s timeout
  private checkOpenAI(): Promise<CheckResult>;    // GET /v1/models, 5s timeout, cost-free
  private checkAnthropic(): Promise<CheckResult>; // GET /v1/models, 5s timeout, cost-free
  private getIntegrationsCached(): /* stale-while-revalidate, TTL 5min */;
}
```

**Status derivation rules:**

| Condition                                        | Status      |
|--------------------------------------------------|-------------|
| `db.ok === false` OR `redis.ok === false`        | `down`      |
| All core checks ok, ≥1 integration check failed  | `degraded`  |
| Everything ok                                    | `ok`        |

**Cost-free guarantee (locked in code + tests):**

- `checkOpenAI` / `checkAnthropic` MUST hit only listing endpoints (`GET /v1/models`)
- Calls go through bare `fetch`, **not** the SDK — prevents accidentally invoking the SDK's chat methods
- Source comment `// Cost-free probe — must remain a non-billable endpoint`
- Unit tests assert the URL ends in `/models` and the method is `GET` (regression guard)
- If `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env var is missing, return `{ ok: true, error: 'not configured' }` — we never invent a key

**wFirma probe credentials:**

- Uses **dedicated health-check credentials** from env (`WFIRMA_HEALTH_*`) — NOT a real user's credentials from DB
- This separates "is wFirma alive" from "is this user's wFirma config valid"
- If `WFIRMA_HEALTH_*` env is missing, skip with `{ ok: true, error: 'not configured' }`

**Integration cache (stale-while-revalidate, 5 min TTL):**

- Every public `/health` request would otherwise probe wFirma/OpenAI/Anthropic — at 30s polling × N users this would burn rate limits and create noise
- Cached entry served immediately; if expired, return the stale entry and trigger a background refresh
- The `HealthMonitorService` poll itself drives the refresh, so cache is naturally warm
- **All callers share the same cache** — frontend polling, `HealthMonitorService` ticks, and external probes (UptimeRobot, etc.) all read from `getIntegrationsCached()`. None can force-revalidate. This means external uptime monitors see at most 5-minute-stale integration data — acceptable trade-off vs. amplifying outbound API load

### `/health` endpoint — replaces `packages/api/src/index.ts:66`

```ts
app.get('/health', async (_req, res) => {
  const snapshot = await healthService.getSnapshot();
  const statusCode = snapshot.status === 'down' ? 503 : 200;
  res.status(statusCode).json(snapshot);
});

// Liveness probe (no dependency checks) — for k8s / docker healthcheck
app.get('/health/live', (_req, res) => res.status(200).json({ status: 'ok' }));
```

- No auth required (already in `audit-log.middleware.ts:14` skip list)
- Production response strips `error` strings from `CheckResult` to avoid leaking implementation details (only `ok: false`)

### `HealthMonitorService` — `packages/api/src/services/health/health-monitor.service.ts`

Singleton that wakes every 30s, reads a snapshot, and triggers alerts on state changes.

```ts
class HealthMonitorService {
  private currentState: 'ok' | 'degraded' | 'down' = 'ok';
  private consecutiveFailures = 0;
  private downSince: Date | null = null;
  private timer: NodeJS.Timeout | null = null;

  start(): void;
  stop(): void;
  private tick(): Promise<void>;
  private transitionTo(next: State, snapshot: HealthSnapshot): Promise<void>;
  private notifyAdmin(kind: 'alert' | 'recovery', ...): Promise<void>;
}

export const healthMonitorService = new HealthMonitorService();
```

**Behavior:**

| Event                                  | Action                                                             |
|----------------------------------------|--------------------------------------------------------------------|
| 1st failure (any check fails)          | increment counter, no notification                                 |
| 2nd consecutive failure                | transition to `down`/`degraded`, fire Sentry + Telegram alert      |
| Successful tick after downtime         | transition to `ok`, fire Telegram recovery (with downtime delta)   |
| 30s tick while in `down`               | snapshot for logs, no notification (avoid spam)                    |
| Telegram send fails                    | log error, do not throw — monitor must keep running                |

**Lifecycle:**

```ts
// packages/api/src/index.ts (after app.listen)
healthMonitorService.start();

process.on('SIGTERM', () => healthMonitorService.stop());
process.on('SIGINT',  () => healthMonitorService.stop());
```

`start()` fires an **immediate first tick** (no 30s blind window after boot), then schedules subsequent ticks at 30s intervals. State is in-memory only. After API restart, state begins as `ok`; the immediate tick re-establishes truth. Incident history is the responsibility of Sentry, not this service.

### Telegram alert format

```
🚨 ALERT — Service down

State: ok → down
Time: 2026-04-27 14:32:18 UTC
Failed checks:
  ❌ db: connection refused (85ms)
  ✅ redis (12ms)
Integrations:
  ❌ wfirma: timeout
  ✅ openai
  ✅ anthropic

Env: production
```

```
✅ RECOVERED

Previous: down
Downtime: 4m 12s
Time: 2026-04-27 14:36:30 UTC
```

`TelegramBotService` gets a new method `sendRaw(chatId, text)` — bypasses the AI chat handler, just dispatches a plain message. Recipient is `process.env.ADMIN_TELEGRAM_CHAT_ID` (single chat or group).

### Sentry init — `packages/api/src/lib/sentry.ts`

```ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) return; // no-op without DSN (dev / tests)

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.prismaIntegration(),
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}
```

Wired in `packages/api/src/index.ts`:

```ts
import { initSentry, Sentry } from './lib/sentry';
initSentry();                              // FIRST — before any other import that may throw
const app = express();
// ... middleware, routes ...
Sentry.setupExpressErrorHandler(app);      // LAST — after all routes
```

## Frontend Design

### `fetchHealth` — `packages/web/src/lib/api/health.ts`

```ts
export const fetchHealth = async (): Promise<HealthSnapshot> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
  return res.json(); // 503 also returns JSON
};
```

Bare `fetch` — does not use `apiClient`, because:
- `apiClient` retries with exponential backoff (would mask quick recoveries and slow the polling cycle)
- `apiClient` triggers logout on 401 (irrelevant here; `/health` is unauthenticated)
- `apiClient` throws on non-2xx — for `/health`, a 503 is a valid (informative) response

### `useSystemHealth` — `packages/web/src/hooks/useSystemHealth.ts`

```ts
export function useSystemHealth() {
  const browserOnline = useOnlineStatus();

  const result = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 25_000,
    enabled: browserOnline, // skip while browser is offline
  });

  const status =
    !browserOnline   ? 'unreachable' :
    result.isError   ? 'down' :
    result.data?.status ?? 'ok';

  return { status, snapshot: result.data, browserOnline };
}
```

### `useOnlineStatus` — `packages/web/src/hooks/useOnlineStatus.ts`

Thin wrapper around `navigator.onLine` + `online` / `offline` events. SSR-safe (returns `true` during SSR).

### `<SystemStatusBanner />` — `packages/web/src/components/system/SystemStatusBanner.tsx`

```tsx
'use client';
export function SystemStatusBanner() {
  const { status, snapshot } = useSystemHealth();
  const t = useTranslations('system');
  if (status === 'ok') return null;

  const variant = status === 'degraded' ? 'warning' : 'error';
  const message = buildMessage(status, snapshot, t);

  return (
    <div role="status" aria-live="polite" className={bannerClasses(variant)}>
      <Icon /> {message}
    </div>
  );
}
```

`buildMessage` distinguishes degraded sub-cases (precedence top-down — first match wins):

1. `unreachable` (browser offline) → `system.banner.unreachable`
2. `down` (DB or Redis) → `system.banner.down`
3. `degraded` and (`openai.ok === false` OR `anthropic.ok === false`) → `system.banner.degraded.ai`
   *(AI takes precedence over wFirma because chat is the primary user-facing feature)*
4. `degraded` and `wfirma.ok === false` → `system.banner.degraded.wfirma`

Sticky-top placement (does not block UI). Accessible via `role="status"` + `aria-live="polite"`.

### Mounting point — `packages/web/src/components/auth/ProtectedRoute.tsx`

The banner is rendered inside `ProtectedRoute`, between the auth check and `{children}`:

```tsx
return (
  <>
    <SystemStatusBanner />
    {children}
  </>
);
```

Rationale:

- Polling starts only after login — anonymous visitors (landing, login, guide pages) do not load the API
- Naturally unmounts on logout — no manual cleanup
- Single integration point — `<RoleBasedRoute>` will need the same wrapping

### Sentry init — `packages/web`

Standard `@sentry/nextjs` install via the wizard creates `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation.ts`.

Customizations:

- `tracesSampleRate: 0.1`
- `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0` (Session Replay only on errors)
- `beforeSend` drops `/health` failures using exact pathname match: `new URL(event.request.url).pathname === '/health'` (substring match could swallow unrelated errors with `/health` in path)

## i18n

New keys in `packages/web/src/i18n/messages/{en,pl,ru}.json`:

```
system.banner.unreachable      "No internet connection" / "Brak połączenia z internetem" / "Нет соединения с интернетом"
system.banner.down             "Service temporarily unavailable" / ... / ...
system.banner.degraded.ai      "AI chat is temporarily unavailable" / ... / ...
system.banner.degraded.wfirma  "wFirma integration is unavailable" / ... / ...
```

## Environment variables

```
# packages/api/.env
SENTRY_DSN=https://...@sentry.io/...
APP_VERSION=1.0.0                   # optional, used as Sentry release
ADMIN_TELEGRAM_CHAT_ID=123456789    # required for Telegram alerts; optional, no-op if missing
WFIRMA_HEALTH_API_KEY=...           # dedicated health-check credentials, decoupled from user data
WFIRMA_HEALTH_COMPANY_ID=...

# packages/web/.env.local
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...               # build-time only, source maps upload
SENTRY_ORG=...
SENTRY_PROJECT=...
```

All Sentry / alerting envs are **optional**. If absent:

- `SENTRY_DSN` missing → Sentry no-op, no errors
- `ADMIN_TELEGRAM_CHAT_ID` missing → no Telegram alerts, monitor still runs and writes to Sentry/logs
- `WFIRMA_HEALTH_*` missing → skip wFirma probe, report it as `not configured`

## Testing

### Unit (Jest)

- `health.service.spec.ts`
  - Each branch: db down, redis down, every integration down, all ok
  - Cache TTL behavior — second call within 5 min does not hit external APIs
  - **Cost-free guard:** `checkOpenAI` / `checkAnthropic` mocks assert the URL ends in `/models` and method is `GET`
  - Missing env keys → `{ ok: true, error: 'not configured' }`, no fetch made
- `health-monitor.service.spec.ts`
  - Debounce: 1 failure does not trigger; 2 consecutive failures do
  - State transitions fire Telegram + Sentry exactly once
  - Recovery message contains accurate downtime
  - Telegram send failure does not throw (logged only)
  - No `ADMIN_TELEGRAM_CHAT_ID` → `notifyAdmin` is a no-op

### Integration (Jest + supertest)

- `GET /health` with live DB + Redis → 200, `status: 'ok'`
- DB disconnected → 503, `status: 'down'`, body has `db.ok === false`

### Frontend (Jest + RTL)

- `useSystemHealth.test.ts` — mocked fetch covers ok / down / degraded / network-error transitions; `useOnlineStatus` integration with `navigator.onLine`
- `SystemStatusBanner.test.tsx` — renders correct copy for each state, hidden on `ok`, calls correct i18n keys

### E2E (Playwright)

- One happy-path test: login → no banner visible
- Mock route blocks `/health` → banner appears within poll interval. Tests override the poll interval via `NEXT_PUBLIC_HEALTH_POLL_MS` env (e.g., 1000ms in tests) to avoid flake on the 30s production interval

## Files

### New

```
packages/api/src/lib/sentry.ts
packages/api/src/services/health/health.service.ts
packages/api/src/services/health/health.service.instance.ts
packages/api/src/services/health/health-monitor.service.ts
packages/api/src/services/health/health-monitor.service.instance.ts
packages/api/src/services/health/index.ts
packages/api/src/services/health/__tests__/health.service.spec.ts
packages/api/src/services/health/__tests__/health-monitor.service.spec.ts
packages/api/src/services/health/README.md

packages/web/src/lib/api/health.ts
packages/web/src/hooks/useSystemHealth.ts
packages/web/src/hooks/useOnlineStatus.ts
packages/web/src/components/system/SystemStatusBanner.tsx
packages/web/src/components/system/__tests__/SystemStatusBanner.test.tsx
packages/web/sentry.client.config.ts
packages/web/sentry.server.config.ts
packages/web/sentry.edge.config.ts
packages/web/instrumentation.ts

docs/MONITORING.md
```

### Modified

```
packages/api/src/index.ts                           (initSentry, expand /health, start monitor)
packages/api/src/services/telegram-bot/telegram-bot.service.ts  (+ sendRaw method)
packages/api/.env.example                           (+ SENTRY_DSN, ADMIN_TELEGRAM_CHAT_ID, WFIRMA_HEALTH_*)
packages/web/src/components/auth/ProtectedRoute.tsx (+ <SystemStatusBanner/>)
packages/web/.env.example                           (+ NEXT_PUBLIC_SENTRY_DSN, SENTRY_*)
packages/web/next.config.js                         (Sentry wizard updates)
packages/web/src/i18n/messages/{en,pl,ru}.json      (+ system.* keys)
```

### New npm dependencies

- `@sentry/node` (api) — **v8+ required** for `Sentry.setupExpressErrorHandler` API used in this design
- `@sentry/nextjs` (web) — latest stable, installed via `npx @sentry/wizard@latest -i nextjs`

## Risks / open considerations

- **Anti-flap on prolonged flapping** — current debounce (2 ticks) handles brief transients but a service that flaps every 2 minutes will still produce many alerts. Acceptable for MVP; if it becomes noisy in production, add a minimum-interval-between-alerts rule.
- **wFirma probe quota** — even with 5-min cache, this adds one wFirma call per 5 min per API instance. Acceptable.
- **Sentry quota for Session Replay on errors** — `replaysOnErrorSampleRate: 1.0` could exhaust the free tier under high error rates. Reduce to 0.5 if it becomes a problem.
- **State lost on restart** — recovery alerts are only fired if the API instance that observed `down` also observes recovery. Multi-instance deployments would need shared state (Redis); acceptable for single-instance setup.
