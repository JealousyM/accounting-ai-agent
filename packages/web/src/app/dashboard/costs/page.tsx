'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAICosts } from '@/hooks/useAICosts';
import { useLocale } from '@/contexts/LocaleContext';
import {
  CostSummaryCard,
  CostChart,
  ModelBreakdownChart,
  ConversationCostsTable,
  TimeRangeSelector,
} from '@/components/ai-costs';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function AICostsDashboardPage() {
  return (
    <ProtectedRoute>
      <AICostsDashboardContent />
    </ProtectedRoute>
  );
}

function AICostsDashboardContent() {
  const { locale } = useLocale();
  const t = translations[locale].costs;

  const {
    summary,
    dailyData,
    byModel,
    conversations,
    timeRange,
    setTimeRange,
    isLoading,
    refetch,
  } = useAICosts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex justify-between items-center">
            <TimeRangeSelector
              value={timeRange}
              onChange={setTimeRange}
              translations={t.timeRange}
            />
          </div>

          {/* Summary Cards */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.summary.title}</h2>
            <CostSummaryCard summary={summary} isLoading={isLoading} translations={t.summary} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostChart data={dailyData} isLoading={isLoading} translations={t.charts} />
            <ModelBreakdownChart data={byModel} isLoading={isLoading} translations={t.charts} />
          </div>

          {/* Conversations Table */}
          <div>
            <ConversationCostsTable
              conversations={conversations}
              isLoading={isLoading}
              showViewAll={false}
              limit={10}
              translations={t.conversations}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
