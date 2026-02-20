'use client';

import React, { useState } from 'react';
import { FlaskConical, AlertTriangle, X } from 'lucide-react';
import { useKSeF } from '@/hooks/useKSeF';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

export function KSeFEnvironmentBadge() {
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const { config, isLoadingConfig } = useKSeF();
  const [dismissed, setDismissed] = useState(false);

  if (isLoadingConfig || !config || dismissed) return null;

  const isProduction = config.environment === 'production';

  if (isProduction) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold shadow">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t.envBadgeProduction}</span>
        <div className="group relative ml-1">
          <span className="cursor-help underline decoration-dotted text-xs font-normal opacity-80">?</span>
          <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
            {t.envBadgeProductionWarning}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm font-semibold">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{t.envBadgeTest}</span>
      <div className="group relative ml-1">
        <span className="cursor-help underline decoration-dotted text-xs font-normal opacity-70">?</span>
        <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
          {t.envBadgeTestWarning}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 rounded p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
