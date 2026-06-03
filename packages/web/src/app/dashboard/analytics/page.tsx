'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { useLocale } from '@/contexts/LocaleContext';
import {
  AnalyticsSummaryCards,
  ActivityChart,
  TopToolsList,
  UsageQuotaBar,
} from '@/components/analytics';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import { AnalyticsRange } from '@/types/user-analytics.types';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function AnalyticsDashboardPage() {
  return (
    <ProtectedRoute>
      <AnalyticsDashboardContent />
    </ProtectedRoute>
  );
}

function AnalyticsDashboardContent() {
  const { locale } = useLocale();
  const t = (translations[locale] as typeof enTranslations).analytics;

  const { data, range, setRange, isLoading, refetch } = useUserAnalytics();

  const rangeOptions: { value: AnalyticsRange; label: string }[] = [
    { value: 'week', label: t.timeRange.week },
    { value: 'month', label: t.timeRange.month },
    { value: 'year', label: t.timeRange.year },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t.backToChat}
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t.title}
              </h1>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title={t.refresh}
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Range selector */}
        <div className="flex gap-2">
          {rangeOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <AnalyticsSummaryCards
          data={data}
          isLoading={isLoading}
          translations={t.summary}
        />

        {/* Quota bar */}
        <UsageQuotaBar
          quota={data?.usageQuota ?? { used: 0, limit: 500 }}
          isLoading={isLoading}
          translations={t.quota}
        />

        {/* Activity chart + Top tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityChart
            data={data?.activityByDay ?? []}
            isLoading={isLoading}
            translations={t.activity}
          />
          <TopToolsList
            tools={data?.toolUsage.topTools ?? []}
            isLoading={isLoading}
            translations={t.topTools}
          />
        </div>
      </main>
    </div>
  );
}
