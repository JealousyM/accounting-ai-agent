'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useConversationCosts } from '@/hooks/useConversationCosts';
import { useLocale } from '@/contexts/LocaleContext';
import { CostSummaryCard, RunsTable, CostChart, ModelBreakdownChart } from '@/components/ai-costs';
import { RefreshCw, ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserCostSummary } from '@/types/ai-costs.types';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function ConversationCostDetailPage() {
  return (
    <ProtectedRoute>
      <ConversationCostDetailContent />
    </ProtectedRoute>
  );
}

function ConversationCostDetailContent() {
  const { locale } = useLocale();
  const t = translations[locale].costs;

  const params = useParams();
  const conversationId = params.id as string;

  const { conversation, dailyData, byModel, runs, isLoading, refetch } =
    useConversationCosts(conversationId);

  // Convert conversation cost to UserCostSummary format for the summary card
  const summaryData: UserCostSummary | undefined = conversation
    ? {
        userId: '',
        totalCost: conversation.cost,
        totalTokens: conversation.tokens,
        promptTokens: conversation.promptTokens,
        completionTokens: conversation.completionTokens,
        runCount: conversation.runCount,
        conversationCount: 1,
        avgCostPerRun: conversation.runCount > 0 ? conversation.cost / conversation.runCount : 0,
        avgCostPerConversation: conversation.cost,
        avgLatencyMs: 0,
        // TTS costs not tracked per conversation yet
        ttsCost: 0,
        ttsCharacters: 0,
        ttsCalls: 0,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/costs"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                  {isLoading ? (
                    <span className="animate-pulse bg-gray-200 h-8 w-48 rounded" />
                  ) : (
                    conversation?.title || t.conversationDetail.title
                  )}
                </h1>
                {conversation && (
                  <p className="text-sm text-gray-500 mt-1">
                    {conversation.messageCount} {t.conversationDetail.messages} | {conversation.runCount} {t.conversationDetail.llmCalls}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title={t.refresh}
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.conversationDetail.summary}</h2>
            <CostSummaryCard summary={summaryData} isLoading={isLoading} translations={t.summary} />
          </div>

          {/* Charts (only show if there's data) */}
          {(dailyData.length > 0 || byModel.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dailyData.length > 0 && <CostChart data={dailyData} isLoading={isLoading} translations={t.charts} />}
              {byModel.length > 0 && <ModelBreakdownChart data={byModel} isLoading={isLoading} translations={t.charts} />}
            </div>
          )}

          {/* Runs Table */}
          <div>
            <RunsTable runs={runs} isLoading={isLoading} translations={t.runs} />
          </div>
        </div>
      </main>
    </div>
  );
}
