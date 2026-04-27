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
}
