'use client';

import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  resetAt?: string | null;
}

export function UsageMeter({ label, used, limit, resetAt }: UsageMeterProps) {
  const { locale } = useLocale();
  const t = translations[locale].subscription.meter;
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isDanger
              ? 'bg-red-500'
              : isWarning
                ? 'bg-yellow-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {resetAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t.resetsOn.replace('{date}', formatDate(resetAt))}
        </p>
      )}

      {isDanger && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {t.approachingLimit}
        </p>
      )}
    </div>
  );
}
