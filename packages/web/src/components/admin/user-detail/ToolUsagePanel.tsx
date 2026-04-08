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

interface ToolUsagePanelProps {
  toolUsage: UserDeepStats['toolUsage'];
}

export function ToolUsagePanel({ toolUsage }: ToolUsagePanelProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.stats;

  const topTools = toolUsage.topTools.slice(0, 10);
  const maxCount = topTools.length > 0 ? Math.max(...topTools.map((t) => t.count)) : 1;

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800 space-y-6">
      {/* Top tools */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t.topTools}
        </h2>
        {topTools.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.noActivity}</p>
        ) : (
          <ul className="space-y-2">
            {topTools.map(({ toolName, count }) => {
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <li key={toolName} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-36 shrink-0 truncate text-gray-700 dark:text-gray-300 font-mono text-xs"
                    title={toolName}
                  >
                    {toolName}
                  </span>
                  <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t.byCategory}
        </h2>
        {toolUsage.byCategory.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.noActivity}</p>
        ) : (
          <ul className="space-y-1">
            {toolUsage.byCategory.map(({ category, count }) => (
              <li
                key={category}
                className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="capitalize">{category}</span>
                <span className="font-medium text-gray-900 dark:text-white">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
