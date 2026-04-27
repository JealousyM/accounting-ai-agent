# Availability Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add health monitoring with user-facing in-app banner, Telegram alerts to admin on outages, and Sentry integration on both API and Web — without ever calling billable AI inference endpoints during probes.

**Architecture:** Polling-based. Backend `/health` checks DB + Redis on every call and external integrations through a 5-minute stale-while-revalidate cache. A singleton `HealthMonitorService` ticks every 30s, debounces transient failures, and fires Sentry + Telegram alerts on state transitions. Frontend polls `/health` via React Query in `<ProtectedRoute>` and renders `<SystemStatusBanner>` on degraded/down states.

**Tech Stack:** Express 4, Prisma, ioredis, Telegraf (existing `TelegramNotificationService`), Next.js 15 App Router, React Query 5, next-intl, `@sentry/node` v8, `@sentry/nextjs`, Jest (ts-jest), Playwright.

**Spec:** [`docs/superpowers/specs/2026-04-27-availability-alerts-design.md`](../specs/2026-04-27-availability-alerts-design.md)

**Deviation from spec note:** the spec mentioned adding `sendRaw` to `TelegramBotService` (the user-facing chatbot). The codebase already has `TelegramNotificationService` (`packages/api/src/services/telegram.service.ts`) dedicated to admin notifications using `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. This plan extends that existing service instead — no new `ADMIN_TELEGRAM_CHAT_ID` env var needed.

---

## File Structure

### Backend — `packages/api`

**Create:**
```
src/lib/sentry.ts                                              Sentry init + export
src/services/health/types.ts                                   HealthSnapshot interface
src/services/health/health.service.ts                          Probe orchestration + cache
src/services/health/health.service.instance.ts                 Singleton export
src/services/health/health-monitor.service.ts                  Cron loop + state machine
src/services/health/health-monitor.service.instance.ts         Singleton export
src/services/health/index.ts                                   Barrel
src/services/health/__tests__/health.service.test.ts
src/services/health/__tests__/health-monitor.service.test.ts
src/services/health/README.md                                  Operator notes
```

**Modify:**
```
src/index.ts                                                   initSentry, expand /health, start monitor
src/services/telegram.service.ts                               + notifyHealthAlert, notifyHealthRecovery
src/lib/redis.ts                                               + ping() to wrapper
.env.example                                                   + SENTRY_DSN, APP_VERSION, WFIRMA_HEALTH_*
```

### Frontend — `packages/web`

**Create:**
```
src/lib/api/health.ts                                          fetchHealth + types
src/hooks/useOnlineStatus.ts                                   navigator.onLine wrapper
src/hooks/useSystemHealth.ts                                   React Query hook
src/components/system/SystemStatusBanner.tsx                   Banner UI
src/components/system/__tests__/SystemStatusBanner.test.tsx
src/hooks/__tests__/useSystemHealth.test.tsx
sentry.client.config.ts                                        @sentry/nextjs config
sentry.server.config.ts
sentry.edge.config.ts
instrumentation.ts                                             Sentry NextJS instrumentation
tests/e2e/system/availability-banner.spec.ts                   E2E test
```

**Modify:**
```
src/components/auth/ProtectedRoute.tsx                         + <SystemStatusBanner />
src/i18n/messages/en.json                                      + system.* keys
src/i18n/messages/pl.json                                      + system.* keys
src/i18n/messages/ru.json                                      + system.* keys
next.config.js                                                 Sentry wizard wrap
.env.example / .env.local.example                              + NEXT_PUBLIC_SENTRY_DSN, SENTRY_*
```

### Repository docs

```
docs/MONITORING.md                                             Operator-facing: how the system works, env vars, what triggers alerts
```

---

## Task 0: Create GitHub issue, branch, install dependencies

**Files:**
- None yet (setup only)

- [ ] **Step 1: Create the GitHub issue**

```bash
gh issue create \
  --title "feat: availability alerts (health monitoring + in-app banner + Sentry + Telegram alerts)" \
  --body "$(cat <<'EOF'
## Summary

Implement availability monitoring per spec: `docs/superpowers/specs/2026-04-27-availability-alerts-design.md`.

## Scope

- Backend: `/health` checks DB+Redis+integrations (cost-free probes for OpenAI/Anthropic), `HealthMonitorService` singleton with debounce + Sentry + Telegram alerts on state transitions
- Frontend: `useSystemHealth` hook + `<SystemStatusBanner />` mounted in `<ProtectedRoute>` (only visible to authenticated users)
- Sentry integration (`@sentry/node` v8, `@sentry/nextjs`) on both packages

## Non-goals

- No SSE/WebSocket push (polling)
- No public status page
- No incident history (Sentry handles that)
EOF
)"
```

Expected: prints issue URL. Save the issue number for later commits.

- [ ] **Step 2: Create the implementation branch from current branch**

```bash
git checkout -b feat/availability-alerts
git push -u origin feat/availability-alerts
```

- [ ] **Step 3: Install backend Sentry dep**

```bash
cd packages/api
npm install @sentry/node@^8
cd ../..
```

Expected: `@sentry/node` appears in `packages/api/package.json` dependencies, lockfile updated.

- [ ] **Step 4: Install frontend Sentry dep via wizard**

The wizard creates the config files we need automatically. Run interactively (operator must answer prompts; choose: project = existing project, source maps = yes, example page = no).

```bash
cd packages/web
npx @sentry/wizard@latest -i nextjs --saas
cd ../..
```

Expected: creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, modifies `next.config.js`, adds `@sentry/nextjs` to deps. We will overwrite the configs with our own settings in Task 11.

If running non-interactively, install manually instead:
```bash
cd packages/web && npm install @sentry/nextjs
```
(then create config files in Task 11 from scratch)

- [ ] **Step 5: Commit setup**

```bash
git add packages/api/package.json packages/api/package-lock.json packages/web/package.json packages/web/package-lock.json packages/web/sentry.*.config.ts packages/web/instrumentation.ts packages/web/next.config.js
git commit -m "chore(deps): install Sentry SDKs for api and web"
```

---

## Task 1: Add new env vars + extend Redis wrapper with ping()

**Files:**
- Modify: `packages/api/.env.example`
- Modify: `packages/web/.env.local.example` (or `.env.example`)
- Modify: `packages/api/src/lib/redis.ts`

- [ ] **Step 1: Add new env vars to `packages/api/.env.example`**

Append:
```
# Monitoring & alerts
SENTRY_DSN=
APP_VERSION=

# Dedicated wFirma health probe credentials (decoupled from per-user data)
WFIRMA_HEALTH_API_KEY=
WFIRMA_HEALTH_COMPANY_ID=
```

(Note: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` already exist — no new var.)

- [ ] **Step 2: Add new env vars to `packages/web/.env.local.example`**

Append:
```
# Sentry (frontend)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Test/dev override for health poll interval (default 30000)
NEXT_PUBLIC_HEALTH_POLL_MS=
```

- [ ] **Step 3: Extend the Redis wrapper with `ping()` for health checks**

Edit `packages/api/src/lib/redis.ts`. Add `ping()` to the exported wrapper object:

```ts
// ioredis-compatible wrapper matching node-redis API used in the codebase
export const redis = {
  get: (key: string) => redisClient.get(key),
  set: (key: string, value: string) => redisClient.set(key, value),
  setEx: (key: string, seconds: number, value: string) =>
    redisClient.setex(key, seconds, value),
  del: (key: string) => redisClient.del(key),
  incr: (key: string) => redisClient.incr(key),
  ping: () => redisClient.ping(),  // ← added: returns 'PONG' on success
  quit: () => redisClient.quit(),
  isReady: redisClient.status === 'ready',
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/.env.example packages/web/.env.local.example packages/api/src/lib/redis.ts
git commit -m "feat(api): add health/Sentry env vars and Redis ping wrapper"
```

---

## Task 2: HealthSnapshot types

**Files:**
- Create: `packages/api/src/services/health/types.ts`

- [ ] **Step 1: Create the types file**

```ts
// packages/api/src/services/health/types.ts

export type CheckResult = { ok: boolean; latencyMs: number; error?: string };

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    db: CheckResult;
    redis: CheckResult;
  };
  integrations: {
    wfirma: CheckResult;
    openai: CheckResult;
    anthropic: CheckResult;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/services/health/types.ts
git commit -m "feat(api): define HealthSnapshot types"
```

---

## Task 3: HealthService — DB + Redis core checks (TDD)

**Files:**
- Create: `packages/api/src/services/health/health.service.ts`
- Create: `packages/api/src/services/health/__tests__/health.service.test.ts`

- [ ] **Step 1: Write the failing test for `checkDb`**

```ts
// packages/api/src/services/health/__tests__/health.service.test.ts
import { HealthService } from '../health.service';

jest.mock('../../../lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));
jest.mock('../../../lib/redis', () => ({
  redis: { ping: jest.fn() },
}));

import { prisma } from '../../../lib/prisma';
import { redis } from '../../../lib/redis';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedRedis = redis as jest.Mocked<typeof redis>;

describe('HealthService', () => {
  let service: HealthService;
  beforeEach(() => {
    service = new HealthService();
    jest.clearAllMocks();
  });

  describe('core checks', () => {
    it('returns ok=true when SELECT 1 succeeds', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service['checkDb']();
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('returns ok=false with error string on prisma failure', async () => {
      mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      const result = await service['checkDb']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('connection refused');
    });

    it('returns ok=true when redis.ping returns PONG', async () => {
      mockedRedis.ping.mockResolvedValueOnce('PONG');
      const result = await service['checkRedis']();
      expect(result.ok).toBe(true);
    });

    it('returns ok=false when redis.ping rejects', async () => {
      mockedRedis.ping.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const result = await service['checkRedis']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../health.service'`.

- [ ] **Step 3: Implement `HealthService` core checks**

```ts
// packages/api/src/services/health/health.service.ts
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { CheckResult, HealthSnapshot } from './types';

export class HealthService {
  private startedAt = Date.now();

  private async checkDb(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      await redis.ping();
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
    }
  }
}
```

- [ ] **Step 4: Re-run tests and verify they pass**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/health/health.service.ts packages/api/src/services/health/__tests__/health.service.test.ts
git commit -m "feat(api): HealthService core DB+Redis checks"
```

---

## Task 4: HealthService — cost-free OpenAI + Anthropic probes (TDD)

**Files:**
- Modify: `packages/api/src/services/health/health.service.ts`
- Modify: `packages/api/src/services/health/__tests__/health.service.test.ts`

- [ ] **Step 1: Add failing tests with cost-free regression guards**

Append to the test file:

```ts
describe('integration probes — cost-free guarantee', () => {
  const fetchMock = jest.fn();
  beforeAll(() => {
    (global as any).fetch = fetchMock;
  });
  beforeEach(() => fetchMock.mockReset());

  it('checkOpenAI calls GET /v1/models exactly (must remain non-billable)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    await service['checkOpenAI']();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/v1\/models$/);   // regression guard
    expect(options.method ?? 'GET').toBe('GET');    // regression guard
  });

  it('checkAnthropic calls GET /v1/models exactly (must remain non-billable)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    await service['checkAnthropic']();

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/v1\/models$/);
    expect(options.method ?? 'GET').toBe('GET');
  });

  it('checkOpenAI returns ok=true with "not configured" when env missing, makes NO request', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await service['checkOpenAI']();
    expect(result.ok).toBe(true);
    expect(result.error).toBe('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checkAnthropic returns ok=true with "not configured" when env missing, makes NO request', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await service['checkAnthropic']();
    expect(result.ok).toBe(true);
    expect(result.error).toBe('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checkOpenAI returns ok=false when fetch rejects', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    const result = await service['checkOpenAI']();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('checkOpenAI returns ok=false when API returns non-2xx', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const result = await service['checkOpenAI']();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('aborts after 5s timeout', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    fetchMock.mockImplementationOnce((_url, opts: any) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
      })
    );
    jest.useFakeTimers();
    const promise = service['checkOpenAI']();
    jest.advanceTimersByTime(5001);
    const result = await promise;
    jest.useRealTimers();
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

Expected: failures saying methods don't exist.

- [ ] **Step 3: Implement cost-free probes**

Append to `health.service.ts`:

```ts
  private async probeWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 5000): Promise<CheckResult> {
    const t0 = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Cost-free probe — must remain a non-billable endpoint.
      // Do NOT call /v1/chat/completions, /v1/messages, or any inference endpoint.
      const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      if (!res.ok) {
        return { ok: false, latencyMs: Date.now() - t0, error: `HTTP ${res.status}` };
      }
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, error: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkOpenAI(): Promise<CheckResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { ok: true, latencyMs: 0, error: 'not configured' };
    return this.probeWithTimeout('https://api.openai.com/v1/models', {
      Authorization: `Bearer ${key}`,
    });
  }

  private async checkAnthropic(): Promise<CheckResult> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { ok: true, latencyMs: 0, error: 'not configured' };
    return this.probeWithTimeout('https://api.anthropic.com/v1/models', {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    });
  }
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/health/health.service.ts packages/api/src/services/health/__tests__/health.service.test.ts
git commit -m "feat(api): cost-free OpenAI/Anthropic health probes with regression guards"
```

---

## Task 5: HealthService — wFirma probe (TDD)

**Files:**
- Modify: `packages/api/src/services/health/health.service.ts`
- Modify: `packages/api/src/services/health/__tests__/health.service.test.ts`

- [ ] **Step 1: Add failing tests**

Append to test file:

```ts
describe('checkWfirma', () => {
  const fetchMock = jest.fn();
  beforeAll(() => { (global as any).fetch = fetchMock; });
  beforeEach(() => fetchMock.mockReset());

  it('returns ok=true with "not configured" when WFIRMA_HEALTH_* missing', async () => {
    delete process.env.WFIRMA_HEALTH_API_KEY;
    delete process.env.WFIRMA_HEALTH_COMPANY_ID;
    const result = await service['checkWfirma']();
    expect(result.ok).toBe(true);
    expect(result.error).toBe('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns ok=true on 2xx response', async () => {
    process.env.WFIRMA_HEALTH_API_KEY = 'k';
    process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    const result = await service['checkWfirma']();
    expect(result.ok).toBe(true);
  });

  it('returns ok=false on network error', async () => {
    process.env.WFIRMA_HEALTH_API_KEY = 'k';
    process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
    fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND'));
    const result = await service['checkWfirma']();
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `checkWfirma`**

Append to `health.service.ts`:

```ts
  private async checkWfirma(): Promise<CheckResult> {
    const apiKey = process.env.WFIRMA_HEALTH_API_KEY;
    const companyId = process.env.WFIRMA_HEALTH_COMPANY_ID;
    if (!apiKey || !companyId) {
      return { ok: true, latencyMs: 0, error: 'not configured' };
    }
    // Lightweight probe: list companies (read-only, covered by subscription, no per-call cost).
    return this.probeWithTimeout(`https://api2.wfirma.pl/companies/find?inputFormat=json&company_id=${companyId}`, {
      Authorization: `Bearer ${apiKey}`,
    });
  }
```

- [ ] **Step 3: Verify tests pass**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/health/health.service.ts packages/api/src/services/health/__tests__/health.service.test.ts
git commit -m "feat(api): wFirma health probe with dedicated credentials"
```

---

## Task 6: HealthService — integration cache + getSnapshot (TDD)

**Files:**
- Modify: `packages/api/src/services/health/health.service.ts`
- Modify: `packages/api/src/services/health/__tests__/health.service.test.ts`

- [ ] **Step 1: Add failing tests for cache + snapshot orchestration**

Append:

```ts
describe('getSnapshot', () => {
  const fetchMock = jest.fn();
  beforeAll(() => { (global as any).fetch = fetchMock; });
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.WFIRMA_HEALTH_API_KEY = 'k';
    process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
    fetchMock.mockResolvedValue({ ok: true } as Response);
    mockedPrisma.$queryRaw.mockResolvedValue([]);
    mockedRedis.ping.mockResolvedValue('PONG');
  });

  it('returns status=ok when everything works', async () => {
    const snap = await service.getSnapshot();
    expect(snap.status).toBe('ok');
    expect(snap.checks.db.ok).toBe(true);
    expect(snap.checks.redis.ok).toBe(true);
    expect(snap.integrations.wfirma.ok).toBe(true);
  });

  it('returns status=down when DB fails', async () => {
    mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
    const snap = await service.getSnapshot();
    expect(snap.status).toBe('down');
  });

  it('returns status=down when Redis fails', async () => {
    mockedRedis.ping.mockRejectedValueOnce(new Error('boom'));
    const snap = await service.getSnapshot();
    expect(snap.status).toBe('down');
  });

  it('returns status=degraded when only an integration fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response); // wfirma fails
    const snap = await service.getSnapshot();
    expect(snap.status).toBe('degraded');
    expect(snap.integrations.wfirma.ok).toBe(false);
  });

  it('caches integrations for 5 minutes (does not re-probe)', async () => {
    await service.getSnapshot();
    fetchMock.mockClear();
    await service.getSnapshot();
    expect(fetchMock).not.toHaveBeenCalled(); // served from cache
  });

  it('serves stale integration data when cache expired and refreshes in background', async () => {
    jest.useFakeTimers();
    await service.getSnapshot();
    fetchMock.mockClear();
    jest.advanceTimersByTime(6 * 60 * 1000); // 6 min
    fetchMock.mockResolvedValue({ ok: true } as Response);
    await service.getSnapshot();
    // Stale-while-revalidate: returns immediately with old data, background refresh started
    // Verify a refresh request fired (not blocking)
    await new Promise(r => setImmediate(r));
    expect(fetchMock).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('skips integrations entirely when skipIntegrations=true', async () => {
    fetchMock.mockClear();
    const fresh = new HealthService();
    await fresh.getSnapshot({ skipIntegrations: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uptimeSeconds is non-negative', async () => {
    const snap = await service.getSnapshot();
    expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('production mode strips error messages from CheckResult', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('secret stack trace'));
    const snap = await service.getSnapshot();
    expect(snap.checks.db.error).toBeUndefined();
    expect(snap.checks.db.ok).toBe(false);
    process.env.NODE_ENV = oldEnv;
  });
});
```

- [ ] **Step 2: Implement cache + getSnapshot**

Append to `health.service.ts`:

```ts
  private integrationsCache: { value: HealthSnapshot['integrations']; expiresAt: number } | null = null;
  private refreshing = false;
  private readonly INTEGRATIONS_TTL_MS = 5 * 60 * 1000;

  private emptyIntegrations(): HealthSnapshot['integrations'] {
    return {
      wfirma: { ok: true, latencyMs: 0, error: 'not configured' },
      openai: { ok: true, latencyMs: 0, error: 'not configured' },
      anthropic: { ok: true, latencyMs: 0, error: 'not configured' },
    };
  }

  private async refreshIntegrations(): Promise<HealthSnapshot['integrations']> {
    const [wfirma, openai, anthropic] = await Promise.all([
      this.checkWfirma(),
      this.checkOpenAI(),
      this.checkAnthropic(),
    ]);
    return { wfirma, openai, anthropic };
  }

  private async getIntegrationsCached(): Promise<HealthSnapshot['integrations']> {
    const now = Date.now();
    if (this.integrationsCache && this.integrationsCache.expiresAt > now) {
      return this.integrationsCache.value;
    }
    if (this.integrationsCache && !this.refreshing) {
      // Stale-while-revalidate: kick off background refresh, return stale value now.
      this.refreshing = true;
      this.refreshIntegrations()
        .then((v) => {
          this.integrationsCache = { value: v, expiresAt: Date.now() + this.INTEGRATIONS_TTL_MS };
        })
        .catch((err) => logger.warn('[Health] Background integration refresh failed', err))
        .finally(() => { this.refreshing = false; });
      return this.integrationsCache.value;
    }
    // First call ever — must wait.
    const value = await this.refreshIntegrations();
    this.integrationsCache = { value, expiresAt: now + this.INTEGRATIONS_TTL_MS };
    return value;
  }

  async getSnapshot(opts: { skipIntegrations?: boolean } = {}): Promise<HealthSnapshot> {
    const [db, redisCheck] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const integrations = opts.skipIntegrations
      ? this.emptyIntegrations()
      : await this.getIntegrationsCached();

    const coreDown = !db.ok || !redisCheck.ok;
    const integrationDegraded = Object.values(integrations).some((i) => !i.ok);
    const status = coreDown ? 'down' : integrationDegraded ? 'degraded' : 'ok';

    let snap: HealthSnapshot = {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      checks: { db, redis: redisCheck },
      integrations,
    };

    if (process.env.NODE_ENV === 'production') {
      snap = this.scrubErrors(snap);
    }
    return snap;
  }

  private scrubErrors(snap: HealthSnapshot): HealthSnapshot {
    const scrub = (c: CheckResult): CheckResult => ({ ok: c.ok, latencyMs: c.latencyMs });
    return {
      ...snap,
      checks: { db: scrub(snap.checks.db), redis: scrub(snap.checks.redis) },
      integrations: {
        wfirma: scrub(snap.integrations.wfirma),
        openai: scrub(snap.integrations.openai),
        anthropic: scrub(snap.integrations.anthropic),
      },
    };
  }
```

- [ ] **Step 3: Verify tests pass**

```bash
cd packages/api && npx jest src/services/health/__tests__/health.service.test.ts --no-coverage
```

- [ ] **Step 4: Create singleton + barrel**

```ts
// packages/api/src/services/health/health.service.instance.ts
import { HealthService } from './health.service';
export const healthService = new HealthService();
```

```ts
// packages/api/src/services/health/index.ts
export { HealthService } from './health.service';
export { healthService } from './health.service.instance';
export * from './types';
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/health/
git commit -m "feat(api): HealthService getSnapshot with stale-while-revalidate cache"
```

---

## Task 7: Replace `/health` endpoint + add `/health/live`

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Replace the existing health endpoint**

Find lines 65-68 in `packages/api/src/index.ts`:

```ts
// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Replace with:

```ts
// Health check (full snapshot — used by frontend banner and uptime monitors)
app.get('/health', async (_req: Request, res: Response) => {
  const { healthService } = await import('./services/health');
  const snapshot = await healthService.getSnapshot();
  const code = snapshot.status === 'down' ? 503 : 200;
  res.status(code).json(snapshot);
});

// Liveness probe (no dependency checks — for k8s/docker)
app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});
```

(Dynamic import keeps cold-start fast and avoids load-order coupling.)

- [ ] **Step 2: Manual smoke test**

```bash
npm run docker:up
npm run dev --filter=@accounting-ai-agent/api
# Wait for "API server running" log
curl -s http://localhost:5000/health | jq .
curl -s http://localhost:5000/health/live | jq .
```

Expected `/health`: returns full snapshot with `status: ok`. `/health/live`: `{ status: 'ok' }`.

- [ ] **Step 3: Stop Postgres in another terminal and re-curl**

```bash
docker compose stop postgres
curl -i http://localhost:5000/health
```

Expected: HTTP 503, body has `status: down`, `checks.db.ok: false`. Bring it back: `docker compose start postgres`.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/index.ts
git commit -m "feat(api): replace /health with full snapshot, add /health/live liveness probe"
```

---

## Task 8: Sentry init for backend (TDD-light — config wiring)

**Files:**
- Create: `packages/api/src/lib/sentry.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Create the Sentry wrapper**

```ts
// packages/api/src/lib/sentry.ts
import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('[Sentry] SENTRY_DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn,
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
        delete (event.request.headers as Record<string, unknown>)['authorization'];
        delete (event.request.headers as Record<string, unknown>)['cookie'];
      }
      return event;
    },
  });

  logger.info('[Sentry] Initialized for environment:', process.env.NODE_ENV);
}

export { Sentry };
```

- [ ] **Step 2: Wire into `packages/api/src/index.ts`**

Make `initSentry()` the very first executable line (before middleware). Add the error handler at the end.

At the top of the file (after imports):

```ts
import { initSentry, Sentry } from './lib/sentry';

initSentry(); // MUST be called before importing anything that may throw at boot
```

Right before `app.listen(...)` at the bottom:

```ts
Sentry.setupExpressErrorHandler(app);
```

- [ ] **Step 3: Verify the build still passes**

```bash
cd packages/api && npm run build
```

Expected: success.

- [ ] **Step 4: Verify the server still boots without DSN**

```bash
cd packages/api && npm run dev
# Logs should include: "[Sentry] SENTRY_DSN not set — Sentry disabled"
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/sentry.ts packages/api/src/index.ts
git commit -m "feat(api): initialize Sentry, no-op without DSN"
```

---

## Task 9: Extend `TelegramNotificationService` with health alert methods (TDD)

**Files:**
- Modify: `packages/api/src/services/telegram.service.ts`
- Create: `packages/api/src/services/__tests__/telegram.service.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/api/src/services/__tests__/telegram.service.test.ts
import axios from 'axios';
import { TelegramNotificationService } from '../telegram.service';
import { HealthSnapshot } from '../health/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramNotificationService — health alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
  });

  const snap: HealthSnapshot = {
    status: 'down',
    timestamp: '2026-04-27T14:32:18.000Z',
    uptimeSeconds: 100,
    checks: {
      db: { ok: false, latencyMs: 85, error: 'connection refused' },
      redis: { ok: true, latencyMs: 12 },
    },
    integrations: {
      wfirma: { ok: false, latencyMs: 5000, error: 'timeout' },
      openai: { ok: true, latencyMs: 230 },
      anthropic: { ok: true, latencyMs: 180 },
    },
  };

  it('notifyHealthAlert sends a HTML message with state and failed checks', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

    await svc.notifyHealthAlert('ok', 'down', snap);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('ALERT');
    expect(body.text).toContain('ok → down');
    expect(body.text).toContain('db');
    expect(body.text).toContain('wfirma');
  });

  it('notifyHealthRecovery includes downtime in human-readable form', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });
    await svc.notifyHealthRecovery('down', 252_000); // 4m 12s
    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.text).toContain('RECOVERED');
    expect(body.text).toContain('4m 12s');
  });

  it('is no-op when TELEGRAM_CHAT_ID missing', async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const svc = new TelegramNotificationService();
    await svc.notifyHealthAlert('ok', 'down', snap);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not throw when axios fails (logs only)', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockRejectedValueOnce(new Error('telegram down'));
    await expect(svc.notifyHealthAlert('ok', 'down', snap)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Implement the new methods**

Edit `packages/api/src/services/telegram.service.ts`. Add these methods inside the class (and import `HealthSnapshot` type):

```ts
import { HealthSnapshot } from './health/types';

  // ... existing methods ...

  async notifyHealthAlert(prev: string, next: string, snap: HealthSnapshot): Promise<void> {
    const failedChecks = Object.entries(snap.checks)
      .filter(([, c]) => !c.ok)
      .map(([k, c]) => `❌ ${k}: ${c.error ?? 'failed'} (${c.latencyMs}ms)`);
    const okChecks = Object.entries(snap.checks)
      .filter(([, c]) => c.ok)
      .map(([k, c]) => `✅ ${k} (${c.latencyMs}ms)`);
    const integrationLines = Object.entries(snap.integrations)
      .map(([k, c]) => `  ${c.ok ? '✅' : '❌'} ${k}${c.ok ? '' : `: ${c.error ?? 'failed'}`}`);

    const icon = next === 'down' ? '🚨' : '⚠️';
    const text = [
      `${icon} <b>ALERT — Service ${next}</b>`,
      ``,
      `State: ${prev} → ${next}`,
      `Time: ${snap.timestamp}`,
      `Failed checks:`,
      ...failedChecks.map((l) => `  ${l}`),
      ...okChecks.map((l) => `  ${l}`),
      `Integrations:`,
      ...integrationLines,
      ``,
      `Env: ${process.env.NODE_ENV ?? 'unknown'}`,
    ].join('\n');

    await this.sendMessage(text);
  }

  async notifyHealthRecovery(previousState: string, downtimeMs: number): Promise<void> {
    const minutes = Math.floor(downtimeMs / 60_000);
    const seconds = Math.floor((downtimeMs % 60_000) / 1000);
    const downtime = `${minutes}m ${seconds}s`;

    const text = [
      `✅ <b>RECOVERED</b>`,
      ``,
      `Previous: ${previousState}`,
      `Downtime: ${downtime}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');

    await this.sendMessage(text);
  }
```

The existing private `sendMessage` already swallows errors — no change needed there.

- [ ] **Step 3: Verify tests pass**

```bash
cd packages/api && npx jest src/services/__tests__/telegram.service.test.ts --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/telegram.service.ts packages/api/src/services/__tests__/telegram.service.test.ts
git commit -m "feat(api): add notifyHealthAlert and notifyHealthRecovery to TelegramNotificationService"
```

---

## Task 10: HealthMonitorService (TDD)

**Files:**
- Create: `packages/api/src/services/health/health-monitor.service.ts`
- Create: `packages/api/src/services/health/health-monitor.service.instance.ts`
- Create: `packages/api/src/services/health/__tests__/health-monitor.service.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/api/src/services/health/__tests__/health-monitor.service.test.ts
import { HealthMonitorService } from '../health-monitor.service';
import { HealthSnapshot } from '../types';

const mockGetSnapshot = jest.fn();
const mockCaptureMessage = jest.fn();
const mockNotifyAlert = jest.fn();
const mockNotifyRecovery = jest.fn();

jest.mock('../health.service.instance', () => ({
  healthService: { getSnapshot: (...args: unknown[]) => mockGetSnapshot(...args) },
}));
jest.mock('../../../lib/sentry', () => ({
  Sentry: { captureMessage: (...args: unknown[]) => mockCaptureMessage(...args) },
}));
jest.mock('../../telegram.instance', () => ({
  telegramService: {
    notifyHealthAlert: (...args: unknown[]) => mockNotifyAlert(...args),
    notifyHealthRecovery: (...args: unknown[]) => mockNotifyRecovery(...args),
  },
}));

const okSnap: HealthSnapshot = {
  status: 'ok',
  timestamp: 'now',
  uptimeSeconds: 1,
  checks: { db: { ok: true, latencyMs: 1 }, redis: { ok: true, latencyMs: 1 } },
  integrations: {
    wfirma: { ok: true, latencyMs: 1 },
    openai: { ok: true, latencyMs: 1 },
    anthropic: { ok: true, latencyMs: 1 },
  },
};
const downSnap: HealthSnapshot = { ...okSnap, status: 'down', checks: { db: { ok: false, latencyMs: 1 }, redis: { ok: true, latencyMs: 1 } } };

describe('HealthMonitorService', () => {
  let monitor: HealthMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new HealthMonitorService();
  });
  afterEach(() => monitor.stop());

  it('does not alert on first failure (debounce: needs 2 in a row)', async () => {
    mockGetSnapshot.mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    expect(mockNotifyAlert).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('alerts after 2 consecutive failures', async () => {
    mockGetSnapshot.mockResolvedValueOnce(downSnap).mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage.mock.calls[0][1].level).toBe('error');
  });

  it('does not re-alert on continued failures (one alert per transition)', async () => {
    mockGetSnapshot
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
  });

  it('fires recovery with downtime when transitioning back to ok', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-27T14:30:00Z'));

    mockGetSnapshot.mockResolvedValueOnce(downSnap).mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-04-27T14:34:12Z')); // +4m 12s
    mockGetSnapshot.mockResolvedValueOnce(okSnap);
    await monitor['tick']();
    expect(mockNotifyRecovery).toHaveBeenCalledTimes(1);
    expect(mockNotifyRecovery.mock.calls[0][1]).toBe(252_000);

    jest.useRealTimers();
  });

  it('uses warning level in Sentry for degraded state', async () => {
    const degradedSnap = { ...okSnap, status: 'degraded' as const, integrations: { ...okSnap.integrations, openai: { ok: false, latencyMs: 1 } } };
    mockGetSnapshot.mockResolvedValueOnce(degradedSnap).mockResolvedValueOnce(degradedSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockCaptureMessage.mock.calls[0][1].level).toBe('warning');
  });

  it('survives a getSnapshot exception (treats it as down)', async () => {
    mockGetSnapshot.mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('boom'));
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
  });

  it('start() runs an immediate first tick', async () => {
    mockGetSnapshot.mockResolvedValue(okSnap);
    monitor.start();
    await new Promise((r) => setImmediate(r));
    expect(mockGetSnapshot).toHaveBeenCalledTimes(1);
  });

  it('stop() prevents further ticks', () => {
    jest.useFakeTimers();
    mockGetSnapshot.mockResolvedValue(okSnap);
    monitor.start();
    monitor.stop();
    mockGetSnapshot.mockClear();
    jest.advanceTimersByTime(60_000);
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Verify tests fail (module not found)**

```bash
cd packages/api && npx jest src/services/health/__tests__/health-monitor.service.test.ts --no-coverage
```

- [ ] **Step 3: Implement `HealthMonitorService`**

```ts
// packages/api/src/services/health/health-monitor.service.ts
import { healthService } from './health.service.instance';
import { HealthSnapshot } from './types';
import { Sentry } from '../../lib/sentry';
import { telegramService } from '../telegram.instance';
import { logger } from '../../utils/logger';

type State = HealthSnapshot['status'];

export class HealthMonitorService {
  private currentState: State = 'ok';
  private consecutiveFailures = 0;
  private downSince: Date | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly FAIL_THRESHOLD = 2;
  private readonly POLL_INTERVAL_MS = 30_000;

  start(): void {
    if (this.timer) return;
    // Immediate first tick — no 30s blind window after boot.
    this.tick().catch((err) => logger.error('[HealthMonitor] First tick failed', err));
    this.timer = setInterval(
      () => this.tick().catch((err) => logger.error('[HealthMonitor] Tick failed', err)),
      this.POLL_INTERVAL_MS,
    );
    logger.info('[HealthMonitor] Started');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    let snapshot: HealthSnapshot;
    try {
      snapshot = await healthService.getSnapshot();
    } catch (err) {
      logger.error('[HealthMonitor] getSnapshot threw', err);
      // Synthetic down snapshot
      snapshot = {
        status: 'down',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 0,
        checks: { db: { ok: false, latencyMs: 0, error: (err as Error).message }, redis: { ok: false, latencyMs: 0 } },
        integrations: {
          wfirma: { ok: false, latencyMs: 0 },
          openai: { ok: false, latencyMs: 0 },
          anthropic: { ok: false, latencyMs: 0 },
        },
      };
    }

    const next = snapshot.status;

    if (next !== 'ok' && this.currentState === 'ok') {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures < this.FAIL_THRESHOLD) return;
    } else {
      this.consecutiveFailures = 0;
    }

    if (next !== this.currentState) {
      await this.transitionTo(next, snapshot);
    }
  }

  private async transitionTo(next: State, snapshot: HealthSnapshot): Promise<void> {
    const prev = this.currentState;
    this.currentState = next;

    if (next === 'down' || next === 'degraded') {
      this.downSince = new Date();
      Sentry.captureMessage(`Health: ${prev} → ${next}`, {
        level: next === 'down' ? 'error' : 'warning',
        tags: { component: 'health-monitor', state: next },
        extra: { snapshot },
      });
      try {
        await telegramService.notifyHealthAlert(prev, next, snapshot);
      } catch (err) {
        logger.error('[HealthMonitor] Telegram alert failed', err);
      }
    } else if (next === 'ok') {
      const downtimeMs = this.downSince ? Date.now() - this.downSince.getTime() : 0;
      this.downSince = null;
      try {
        await telegramService.notifyHealthRecovery(prev, downtimeMs);
      } catch (err) {
        logger.error('[HealthMonitor] Telegram recovery failed', err);
      }
    }
  }
}
```

```ts
// packages/api/src/services/health/health-monitor.service.instance.ts
import { HealthMonitorService } from './health-monitor.service';
export const healthMonitorService = new HealthMonitorService();
```

Update barrel `packages/api/src/services/health/index.ts`:

```ts
export { HealthService } from './health.service';
export { healthService } from './health.service.instance';
export { HealthMonitorService } from './health-monitor.service';
export { healthMonitorService } from './health-monitor.service.instance';
export * from './types';
```

- [ ] **Step 4: Verify tests pass**

```bash
cd packages/api && npx jest src/services/health/__tests__/health-monitor.service.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/health/
git commit -m "feat(api): HealthMonitorService with debounce, Sentry + Telegram on transitions"
```

---

## Task 11: Wire `HealthMonitorService` into bootstrap

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Start the monitor after `app.listen` and stop it on shutdown signals**

In `packages/api/src/index.ts`, find the `app.listen(...)` call. Right after it (but inside the same function/block), add:

```ts
import { healthMonitorService } from './services/health';

// ... after app.listen(...):
healthMonitorService.start();

const shutdown = () => {
  healthMonitorService.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

(Place the `import` at the top with the other imports.)

- [ ] **Step 2: Boot test**

```bash
npm run dev --filter=@accounting-ai-agent/api
# Expect logs: "[HealthMonitor] Started"
```

- [ ] **Step 3: Verify Telegram alert path manually (optional, requires real Telegram creds)**

If `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are set, stop Postgres for >60s and watch the chat. Bring it back, recovery message should follow within 30s.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/index.ts
git commit -m "feat(api): start HealthMonitorService on boot, stop on SIGTERM/SIGINT"
```

---

## Task 12: Frontend hooks — `useOnlineStatus`, `useSystemHealth`, `fetchHealth` (TDD)

**Files:**
- Create: `packages/web/src/lib/api/health.ts`
- Create: `packages/web/src/hooks/useOnlineStatus.ts`
- Create: `packages/web/src/hooks/useSystemHealth.ts`
- Create: `packages/web/src/hooks/__tests__/useSystemHealth.test.tsx`

- [ ] **Step 1: Create `fetchHealth` and types**

```ts
// packages/web/src/lib/api/health.ts
export type HealthCheck = { ok: boolean; latencyMs?: number; error?: string };

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  checks: { db: HealthCheck; redis: HealthCheck };
  integrations: {
    wfirma: HealthCheck;
    openai: HealthCheck;
    anthropic: HealthCheck;
  };
}

export const fetchHealth = async (): Promise<HealthSnapshot> => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const res = await fetch(`${base}/health`, {
    cache: 'no-store',
  });
  // Note: 503 also returns a JSON snapshot — do not throw.
  return res.json();
};
```

- [ ] **Step 2: Create `useOnlineStatus`**

```ts
// packages/web/src/hooks/useOnlineStatus.ts
'use client';
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true); // SSR-safe default

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}
```

- [ ] **Step 3: Create `useSystemHealth`**

```ts
// packages/web/src/hooks/useSystemHealth.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, HealthSnapshot } from '@/lib/api/health';
import { useOnlineStatus } from './useOnlineStatus';

export type SystemStatus = HealthSnapshot['status'] | 'unreachable';

const POLL_MS = Number(process.env.NEXT_PUBLIC_HEALTH_POLL_MS) || 30_000;

export function useSystemHealth(): {
  status: SystemStatus;
  snapshot: HealthSnapshot | undefined;
  browserOnline: boolean;
} {
  const browserOnline = useOnlineStatus();

  const result = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: Math.floor(POLL_MS * 0.83),
    enabled: browserOnline,
  });

  const status: SystemStatus = !browserOnline
    ? 'unreachable'
    : result.isError
    ? 'down'
    : (result.data?.status ?? 'ok');

  return { status, snapshot: result.data, browserOnline };
}
```

- [ ] **Step 4: Write the failing test for `useSystemHealth`**

```tsx
// packages/web/src/hooks/__tests__/useSystemHealth.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSystemHealth } from '../useSystemHealth';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('useSystemHealth', () => {
  it('returns ok when fetch resolves with status=ok', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok' }),
    });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ok'));
  });

  it('returns degraded when API responds with degraded', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'degraded', integrations: { openai: { ok: false } } }),
    });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('degraded'));
  });

  it('returns down on fetch rejection', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('netfail'));
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('down'));
  });

  it('returns unreachable when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    expect(result.current.status).toBe('unreachable');
  });
});
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
cd packages/web && npx jest src/hooks/__tests__/useSystemHealth.test.tsx --no-coverage
```

Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/lib/api/health.ts packages/web/src/hooks/useOnlineStatus.ts packages/web/src/hooks/useSystemHealth.ts packages/web/src/hooks/__tests__/useSystemHealth.test.tsx
git commit -m "feat(web): useSystemHealth hook with online detection and React Query polling"
```

---

## Task 13: i18n messages for system banner

**Files:**
- Modify: `packages/web/src/i18n/messages/en.json`
- Modify: `packages/web/src/i18n/messages/pl.json`
- Modify: `packages/web/src/i18n/messages/ru.json`

- [ ] **Step 1: Locate the right section in each file**

Open each `messages/*.json`. Find the top-level keys to understand structure. Add a new top-level key `system` (or merge into existing similar group).

- [ ] **Step 2: Add keys to `en.json`**

```json
"system": {
  "banner": {
    "unreachable": "No internet connection. We'll reconnect automatically.",
    "down": "Service is temporarily unavailable. We're aware and working on it.",
    "degraded": {
      "ai": "AI chat is temporarily unavailable. Other features still work.",
      "wfirma": "wFirma integration is temporarily unavailable. Other features still work."
    }
  }
}
```

- [ ] **Step 3: Add keys to `pl.json`**

```json
"system": {
  "banner": {
    "unreachable": "Brak połączenia z internetem. Spróbujemy ponownie automatycznie.",
    "down": "Serwis jest tymczasowo niedostępny. Już o tym wiemy i pracujemy nad rozwiązaniem.",
    "degraded": {
      "ai": "Czat AI jest tymczasowo niedostępny. Pozostałe funkcje działają.",
      "wfirma": "Integracja z wFirmą jest tymczasowo niedostępna. Pozostałe funkcje działają."
    }
  }
}
```

- [ ] **Step 4: Add keys to `ru.json`**

```json
"system": {
  "banner": {
    "unreachable": "Нет соединения с интернетом. Повторим попытку автоматически.",
    "down": "Сервис временно недоступен. Мы уже знаем и работаем над этим.",
    "degraded": {
      "ai": "AI чат временно недоступен. Остальные функции работают.",
      "wfirma": "Интеграция с wFirma временно недоступна. Остальные функции работают."
    }
  }
}
```

- [ ] **Step 5: Verify JSON is valid**

```bash
cd packages/web && node -e "['en','pl','ru'].forEach(l => JSON.parse(require('fs').readFileSync('src/i18n/messages/' + l + '.json', 'utf8')))"
```

Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/i18n/messages/
git commit -m "feat(web): add i18n keys for system status banner (en/pl/ru)"
```

---

## Task 14: `<SystemStatusBanner />` component (TDD)

**Files:**
- Create: `packages/web/src/components/system/SystemStatusBanner.tsx`
- Create: `packages/web/src/components/system/__tests__/SystemStatusBanner.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// packages/web/src/components/system/__tests__/SystemStatusBanner.test.tsx
import { render, screen } from '@testing-library/react';
import { SystemStatusBanner } from '../SystemStatusBanner';

const mockSystemHealth = jest.fn();
jest.mock('@/hooks/useSystemHealth', () => ({
  useSystemHealth: () => mockSystemHealth(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key, // returns key, easy to assert
}));

describe('SystemStatusBanner', () => {
  it('renders nothing when status is ok', () => {
    mockSystemHealth.mockReturnValue({ status: 'ok' });
    const { container } = render(<SystemStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders unreachable copy when offline', () => {
    mockSystemHealth.mockReturnValue({ status: 'unreachable' });
    render(<SystemStatusBanner />);
    expect(screen.getByText(/banner.unreachable/)).toBeInTheDocument();
  });

  it('renders down copy when status=down', () => {
    mockSystemHealth.mockReturnValue({ status: 'down' });
    render(<SystemStatusBanner />);
    expect(screen.getByText(/banner.down/)).toBeInTheDocument();
  });

  it('prioritizes AI degradation over wFirma when both fail', () => {
    mockSystemHealth.mockReturnValue({
      status: 'degraded',
      snapshot: {
        integrations: { openai: { ok: false }, anthropic: { ok: true }, wfirma: { ok: false } },
      },
    });
    render(<SystemStatusBanner />);
    expect(screen.getByText(/banner.degraded.ai/)).toBeInTheDocument();
    expect(screen.queryByText(/banner.degraded.wfirma/)).not.toBeInTheDocument();
  });

  it('shows wFirma copy when only wFirma is down', () => {
    mockSystemHealth.mockReturnValue({
      status: 'degraded',
      snapshot: {
        integrations: { openai: { ok: true }, anthropic: { ok: true }, wfirma: { ok: false } },
      },
    });
    render(<SystemStatusBanner />);
    expect(screen.getByText(/banner.degraded.wfirma/)).toBeInTheDocument();
  });

  it('uses role=status and aria-live=polite', () => {
    mockSystemHealth.mockReturnValue({ status: 'down' });
    render(<SystemStatusBanner />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });
});
```

- [ ] **Step 2: Implement the component**

```tsx
// packages/web/src/components/system/SystemStatusBanner.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import type { HealthSnapshot } from '@/lib/api/health';

function buildKey(
  status: 'unreachable' | 'down' | 'degraded',
  snapshot: HealthSnapshot | undefined,
): string | null {
  if (status === 'unreachable') return 'banner.unreachable';
  if (status === 'down') return 'banner.down';
  if (status === 'degraded') {
    const i = snapshot?.integrations;
    if (i && (!i.openai.ok || !i.anthropic.ok)) return 'banner.degraded.ai';
    if (i && !i.wfirma.ok) return 'banner.degraded.wfirma';
    return 'banner.down'; // fallback if degraded but reason unknown
  }
  return null;
}

export function SystemStatusBanner() {
  const { status, snapshot } = useSystemHealth();
  const t = useTranslations('system');

  if (status === 'ok') return null;

  const key = buildKey(status, snapshot);
  if (!key) return null;

  const isError = status === 'down' || status === 'unreachable';
  const className = [
    'sticky top-0 z-50 w-full px-4 py-2 text-sm font-medium text-center',
    isError
      ? 'bg-red-600 text-white'
      : 'bg-amber-500 text-amber-950',
  ].join(' ');

  return (
    <div role="status" aria-live="polite" className={className}>
      {t(key)}
    </div>
  );
}
```

- [ ] **Step 3: Verify tests pass**

```bash
cd packages/web && npx jest src/components/system/__tests__/SystemStatusBanner.test.tsx --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/system/
git commit -m "feat(web): SystemStatusBanner component with status precedence"
```

---

## Task 15: Mount banner inside `<ProtectedRoute>`

**Files:**
- Modify: `packages/web/src/components/auth/ProtectedRoute.tsx`

- [ ] **Step 1: Add the banner to `ProtectedRoute`**

Edit `packages/web/src/components/auth/ProtectedRoute.tsx`. Import the banner near the existing imports:

```tsx
import { SystemStatusBanner } from '@/components/system/SystemStatusBanner';
```

Find the final return at the bottom of `ProtectedRoute`:

```tsx
  // Render children
  return <>{children}</>;
```

Replace with:

```tsx
  // Render children with health banner above
  return (
    <>
      <SystemStatusBanner />
      {children}
    </>
  );
```

(Do not add it to `PublicRoute` or anywhere else — banner should only mount when the user is authenticated.)

- [ ] **Step 2: Smoke test in browser**

```bash
npm run dev
# Open http://localhost:3010, log in
# Expect: no banner visible (status=ok)
# Stop Postgres: docker compose stop postgres
# Wait ≤ 30s — banner appears (red, "Service is temporarily unavailable")
# Restart: docker compose start postgres — banner disappears within 30s
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/auth/ProtectedRoute.tsx
git commit -m "feat(web): mount SystemStatusBanner inside ProtectedRoute"
```

---

## Task 16: Configure `@sentry/nextjs` (overwrite wizard files)

**Files:**
- Modify: `packages/web/sentry.client.config.ts`
- Modify: `packages/web/sentry.server.config.ts`
- Modify: `packages/web/sentry.edge.config.ts`

- [ ] **Step 1: Set `sentry.client.config.ts`**

```ts
// packages/web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    beforeSend(event) {
      // Drop /health failures — they're already surfaced via the banner.
      try {
        if (event.request?.url) {
          const path = new URL(event.request.url).pathname;
          if (path === '/health') return null;
        }
      } catch {
        // Bad URL — fall through
      }
      return event;
    },
  });
}
```

- [ ] **Step 2: Set `sentry.server.config.ts`**

```ts
// packages/web/sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

- [ ] **Step 3: Set `sentry.edge.config.ts`**

```ts
// packages/web/sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

- [ ] **Step 4: Verify build**

```bash
cd packages/web && npm run build
```

Expected: build succeeds. Without `NEXT_PUBLIC_SENTRY_DSN` set, Sentry is no-op.

- [ ] **Step 5: Commit**

```bash
git add packages/web/sentry.*.config.ts
git commit -m "feat(web): configure Sentry — Session Replay on errors, drop /health events"
```

---

## Task 17: E2E test for the banner

**Files:**
- Create: `packages/web/tests/e2e/system/availability-banner.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// packages/web/tests/e2e/system/availability-banner.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Availability banner', () => {
  test('hidden when API is healthy after login', async ({ page }) => {
    // Pre-condition: test setup logs the user in (see existing auth helpers in tests/e2e)
    await page.goto('/chat');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('appears within poll interval when /health fails', async ({ page }) => {
    // Override poll interval (handled via env in app)
    // The test runner is expected to set NEXT_PUBLIC_HEALTH_POLL_MS=1000 for this suite.

    // Block /health and force 503
    await page.route('**/health', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({
        status: 'down',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 0,
        checks: { db: { ok: false }, redis: { ok: true } },
        integrations: { wfirma: { ok: true }, openai: { ok: true }, anthropic: { ok: true } },
      })}),
    );

    await page.goto('/chat');
    // With 1s polling, banner should show within 5s
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 2: Add the env override to the test config**

In `packages/web/playwright.config.ts` (or the closest equivalent), add `NEXT_PUBLIC_HEALTH_POLL_MS: '1000'` to the `webServer.env`. If not present, leave the test as-is — the operator running E2E sets it via the shell.

- [ ] **Step 3: Run the test**

```bash
cd packages/web && npx playwright test tests/e2e/system/availability-banner.spec.ts
```

Expected: 2 passing. (May require auth-helper updates if the project uses storageState; in that case, follow existing E2E patterns in `tests/e2e/auth/`.)

- [ ] **Step 4: Commit**

```bash
git add packages/web/tests/e2e/system/availability-banner.spec.ts packages/web/playwright.config.ts
git commit -m "test(web): E2E for availability banner appearance on /health failure"
```

---

## Task 18: Operator documentation

**Files:**
- Create: `docs/MONITORING.md`
- Create: `packages/api/src/services/health/README.md`

- [ ] **Step 1: Write `docs/MONITORING.md`**

```markdown
# Monitoring & Availability Alerts

This project ships an in-app health monitoring system with three signal channels:

1. **In-app banner** — visible to authenticated users (mounted in `<ProtectedRoute>`) when the system is `down` or `degraded`
2. **Telegram admin alerts** — fired by `HealthMonitorService` on state transitions (uses existing `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`)
3. **Sentry** — captures unhandled exceptions and explicit health-state transitions (`@sentry/node` on api, `@sentry/nextjs` on web)

## What `/health` reports

- `db` — `prisma.$queryRaw\`SELECT 1\``
- `redis` — `redis.ping()`
- `integrations.wfirma` — list-companies probe with dedicated `WFIRMA_HEALTH_*` credentials (subscription-covered, not user-billed)
- `integrations.openai` — `GET /v1/models` (cost-free, no token charge)
- `integrations.anthropic` — `GET /v1/models` (cost-free, no token charge)

**Cost-free guarantee:** the OpenAI and Anthropic probes hit only the model-listing endpoints. They never call `/v1/chat/completions` or `/v1/messages`. Tests assert this.

## Status derivation

| Condition                                   | Status      | HTTP |
|---------------------------------------------|-------------|------|
| db or redis fails                           | `down`      | 503  |
| db + redis ok, integration fails            | `degraded`  | 200  |
| everything ok                               | `ok`        | 200  |

## Trigger thresholds

`HealthMonitorService` ticks every 30s. A state change from `ok` to `down`/`degraded` requires **2 consecutive failed ticks** (60s of confirmed badness). Recovery is single-tick (immediate).

## Required env vars

| Var                          | Where    | Required for                         |
|------------------------------|----------|--------------------------------------|
| `SENTRY_DSN`                 | api      | Sentry on backend                    |
| `APP_VERSION`                | api      | Sentry release tagging (optional)    |
| `WFIRMA_HEALTH_API_KEY`      | api      | wFirma probe — leave empty to skip   |
| `WFIRMA_HEALTH_COMPANY_ID`   | api      | wFirma probe                         |
| `TELEGRAM_BOT_TOKEN`         | api      | Telegram alerts (existing)           |
| `TELEGRAM_CHAT_ID`           | api      | Telegram alerts (existing)           |
| `OPENAI_API_KEY`             | api      | OpenAI probe — leave empty to skip   |
| `ANTHROPIC_API_KEY`          | api      | Anthropic probe                      |
| `NEXT_PUBLIC_SENTRY_DSN`     | web      | Sentry on frontend                   |
| `NEXT_PUBLIC_HEALTH_POLL_MS` | web      | Override 30s poll interval (testing) |

All are optional. Without them, the corresponding feature is a silent no-op.

## Wiring an external uptime monitor

Point UptimeRobot / BetterStack / Pingdom at:

- `GET /health/live` — process liveness only (always 200 if the process is up)
- `GET /health` — full snapshot (503 when DB/Redis down)

Both are unauthenticated.

## Common runbooks

- **Banner says AI chat unavailable** — check Sentry for the `health-monitor` tag with `state: degraded`. Look at the `extra.snapshot` payload to see whether OpenAI or Anthropic failed.
- **Telegram chat is silent during outage** — verify `TELEGRAM_CHAT_ID` (admin chat) is set; check `TelegramNotificationService` logs for delivery errors.
- **Recovery message did not arrive** — possible if the API instance restarted during the outage (state is in-memory). The next-tick `ok` is treated as the baseline, no recovery transition fires.
```

- [ ] **Step 2: Write `packages/api/src/services/health/README.md`**

```markdown
# Health service

`HealthService` exposes a single `getSnapshot()` method that probes the database, Redis, and three external integrations. Results for integrations are cached 5 minutes (stale-while-revalidate).

`HealthMonitorService` ticks every 30s, applies a 2-failure debounce, and fires Sentry + Telegram alerts on state transitions.

## Cost-free probes

The OpenAI and Anthropic probes call only `GET /v1/models`. Do **not** add probes that hit chat / messages / completion endpoints — those are billed.

The unit test suite asserts the URL ends with `/models` and the method is `GET` for both probes. Removing those assertions silently re-enables billable probes.

## Adding a new integration probe

1. Add a `checkX` method to `HealthService` that uses `probeWithTimeout` (5s default)
2. Honor the env-key gate: skip with `{ ok: true, error: 'not configured' }` if the credential env is absent
3. Add to `HealthSnapshot.integrations` and `refreshIntegrations()`
4. Add a regression test confirming the probe URL and method
5. Update `docs/MONITORING.md`
```

- [ ] **Step 3: Commit**

```bash
git add docs/MONITORING.md packages/api/src/services/health/README.md
git commit -m "docs: monitoring + health service operator notes"
```

---

## Task 19: Final validation — full test run + lint + build

**Files:** none (verification only)

- [ ] **Step 1: Run all backend tests**

```bash
npm run test --filter=@accounting-ai-agent/api
```

Expected: all pass, including the new `health.service.test.ts`, `health-monitor.service.test.ts`, `telegram.service.test.ts`.

- [ ] **Step 2: Run all frontend unit tests**

```bash
npm run test --filter=@accounting-ai-agent/web
```

Expected: all pass, including new banner + `useSystemHealth` tests.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 errors. Address warnings if any newly introduced.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: both packages build successfully.

- [ ] **Step 5: Manual smoke (browser)**

```bash
npm run docker:up
npm run dev
```

- Log in → no banner
- `docker compose stop postgres` → wait ≤ 60s → red banner appears
- `docker compose start postgres` → banner disappears within 30s
- Flip OS network off → "No internet connection" banner appears immediately

- [ ] **Step 6: Final cleanup commit (if any)**

```bash
git status
# Only changes should be tsbuildinfo / generated artifacts — do NOT commit those
```

- [ ] **Step 7: Push and open the PR**

```bash
git push origin feat/availability-alerts
gh pr create --title "feat: availability alerts (health monitoring + banner + Sentry + Telegram)" --body "$(cat <<'EOF'
## Summary

- Backend: full `/health` snapshot (DB+Redis+integrations) with 5-min stale-while-revalidate cache; cost-free OpenAI/Anthropic probes guarded by tests; `HealthMonitorService` debounces 2-tick failures and fires Sentry + Telegram alerts on transitions
- Frontend: `useSystemHealth` polls `/health` every 30s; `<SystemStatusBanner />` renders in `<ProtectedRoute>` for authenticated users only; precedence — unreachable > down > AI degraded > wFirma degraded
- Sentry: `@sentry/node` v8 on api, `@sentry/nextjs` on web with Session Replay only on errors; `/health` events filtered out client-side

Closes #<issue-number>

## Test plan

- [x] Unit: `health.service.test.ts`, `health-monitor.service.test.ts`, `telegram.service.test.ts`, `useSystemHealth.test.tsx`, `SystemStatusBanner.test.tsx`
- [x] Cost-free regression guard tests (OpenAI/Anthropic URL + method)
- [x] E2E: `availability-banner.spec.ts`
- [x] Manual: stop Postgres → red banner appears; start Postgres → banner clears
- [x] Manual: OS-level network off → "No internet" banner appears immediately
EOF
)"
```

---

## Summary of changes

| Layer       | New | Modified |
|-------------|-----|----------|
| Backend     | 9 files (sentry.ts, health/* incl. tests + README) | 4 (index.ts, telegram.service.ts, redis.ts, .env.example) |
| Frontend    | 8 files (hook, banner, sentry configs, instrumentation, tests, e2e) | 5 (ProtectedRoute, 3 i18n, .env.example) |
| Repo docs   | 1 (MONITORING.md) | — |

Total tasks: 20 (Task 0–19). Each task = one focused commit.
