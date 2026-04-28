export type HealthCheck = { ok: boolean; latencyMs?: number; error?: string };

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  checks: { db: HealthCheck; redis: HealthCheck };
  integrations: {
    wfirma: HealthCheck;
    openai: HealthCheck;
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
