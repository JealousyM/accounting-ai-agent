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
