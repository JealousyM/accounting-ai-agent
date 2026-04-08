'use client';

import { useLocale } from '@/contexts/LocaleContext';
import type { UserDeepStats } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UsageStatsPanelProps {
  stats: UserDeepStats;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

const fmt = new Intl.NumberFormat();

export function UsageStatsPanel({ stats }: UsageStatsPanelProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.stats;
  const { cost } = stats;

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t.cost}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCell label={t.totalCost} value={`$${cost.totalUsd.toFixed(4)}`} />
        <StatCell label={t.totalTokens} value={fmt.format(cost.totalTokens)} />
        <StatCell label={t.promptTokens} value={fmt.format(cost.promptTokens)} />
        <StatCell label={t.completionTokens} value={fmt.format(cost.completionTokens)} />
        <StatCell label={t.runs} value={fmt.format(cost.runCount)} />
        <StatCell label={t.conversations} value={fmt.format(cost.langsmithConversationCount)} />
      </div>
    </section>
  );
}
