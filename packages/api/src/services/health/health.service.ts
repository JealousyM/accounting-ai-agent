import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { CheckResult } from './types';

export class HealthService {
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

  // Stub: callers added in Task 4 (full snapshot composition).
  // Kept here so noUnusedLocals does not flag the private check methods.
  async getCoreChecks(): Promise<{ db: CheckResult; redis: CheckResult }> {
    const [db, redisCheck] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return { db, redis: redisCheck };
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
}
