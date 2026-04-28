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
