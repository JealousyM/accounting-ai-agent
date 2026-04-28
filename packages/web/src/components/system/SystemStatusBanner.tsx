'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import type { HealthSnapshot } from '@/lib/api/health';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

type BannerKey = 'unreachable' | 'down' | 'degraded.ai' | 'degraded.wfirma';

function buildKey(
  status: 'unreachable' | 'down' | 'degraded',
  snapshot: HealthSnapshot | undefined,
): BannerKey | null {
  if (status === 'unreachable') return 'unreachable';
  if (status === 'down') return 'down';
  if (status === 'degraded') {
    const i = snapshot?.integrations;
    if (i && !i.openai.ok) return 'degraded.ai';
    if (i && !i.wfirma.ok) return 'degraded.wfirma';
    return 'down';
  }
  return null;
}

function getMessage(locale: 'en' | 'pl' | 'ru', key: BannerKey): string {
  const banner = translations[locale].system.banner;
  if (key === 'unreachable') return banner.unreachable;
  if (key === 'down') return banner.down;
  if (key === 'degraded.ai') return banner.degraded.ai;
  return banner.degraded.wfirma;
}

export function SystemStatusBanner() {
  const { status, snapshot } = useSystemHealth();
  const { locale } = useLocale();

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
      {getMessage(locale, key)}
    </div>
  );
}
