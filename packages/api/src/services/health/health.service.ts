import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { CheckResult, HealthSnapshot } from './types';

export class HealthService {
  private startedAt = Date.now();
  private integrationsCache: { value: HealthSnapshot['integrations']; expiresAt: number } | null = null;
  private refreshing = false;
  private readonly INTEGRATIONS_TTL_MS = 5 * 60 * 1000;

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
}
