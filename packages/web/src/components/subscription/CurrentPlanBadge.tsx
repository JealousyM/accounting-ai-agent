'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useLocale } from '@/contexts/LocaleContext';
import { Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface CurrentPlanBadgeProps {
  showUpgradeLink?: boolean;
  className?: string;
}

export function CurrentPlanBadge({ showUpgradeLink = true, className = '' }: CurrentPlanBadgeProps) {
  const { locale } = useLocale();
  const t = translations[locale].subscription.badge;
  const { subscription, isPro, isLoading } = useSubscription();

  if (isLoading || !subscription) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isPro
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
      >
        {isPro ? <Crown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
        {isPro ? t.pro : t.free}
      </div>

      {!isPro && showUpgradeLink && (
        <Link
          href="/pricing"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          {t.upgrade}
        </Link>
      )}
    </div>
  );
}
