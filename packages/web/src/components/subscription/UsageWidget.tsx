'use client';

import Link from 'next/link';
import { Database, MessageSquare } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UsageWidgetProps {
  compact?: boolean;
}

export function UsageWidget({ compact = false }: UsageWidgetProps) {
  const { locale } = useLocale();
  const t = translations[locale].subscription;
  const { subscription, usage, isFree, isPro, useOwnLLMKey } = useSubscription();

  // Determine what to show
  const usageData = usage || subscription?.usage;
  const showWFirma = isFree && usageData?.wfirmaRequests?.limit;
  const showAI = isPro && !useOwnLLMKey && usageData?.aiMessages?.limit;

  // If nothing to show, return null
  if (!showWFirma && !showAI) {
    return null;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderUsageBar = (
    label: string,
    icon: React.ReactNode,
    used: number,
    limit: number,
    resetAt?: string | null
  ) => {
    const percentage = Math.min((used / limit) * 100, 100);
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 95;

    return (
      <div className={compact ? 'py-1' : 'py-2'}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {used}/{limit}
          </span>
        </div>

        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

        {!compact && resetAt && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {t.meter.resetsOn.replace('{date}', formatDate(resetAt))}
          </p>
        )}

        {isDanger && !compact && (
          <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
            {t.meter.approachingLimit}
          </p>
        )}
      </div>
    );
  };

  return (
    <Link href="/subscription" className="block">
      <div className="hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors px-2 -mx-2">
        {showWFirma && usageData?.wfirmaRequests && (
          renderUsageBar(
            'wFirma',
            <Database className="w-3.5 h-3.5" />,
            usageData.wfirmaRequests.used,
            usageData.wfirmaRequests.limit!,
            usageData.wfirmaRequests.resetAt
          )
        )}

        {showAI && usageData?.aiMessages && (
          renderUsageBar(
            'AI',
            <MessageSquare className="w-3.5 h-3.5" />,
            usageData.aiMessages.used,
            usageData.aiMessages.limit!,
            usageData.aiMessages.resetAt
          )
        )}
      </div>
    </Link>
  );
}
