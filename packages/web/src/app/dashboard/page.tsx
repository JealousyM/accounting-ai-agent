'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDashboard } from '@/hooks/useDashboard';
import { useLocale } from '@/contexts/LocaleContext';
import {
  SummaryCards,
  RevenueExpenseChart,
  UnpaidInvoicesCard,
  TaxDeadlines,
  KSeFStatusCard,
} from '@/components/dashboard';
import { AppHeader } from '@/components/layout/AppHeader';
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { locale } = useLocale();
  const t = translations[locale].dashboard;

  const {
    financial,
    invoices,
    deadlines,
    ksef,
    isLoading,
    refetch,
  } = useDashboard();

  return (
    <div className="h-dvh flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Shared application header */}
      <AppHeader
        title={t.title}
        leading={
          <Link
            href="/chat"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t.backToChat}
          >
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Link>
        }
        actions={
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title={t.refresh}
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        }
      />

      {/* Scrollable Content */}
      <main className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-2">
          {/* Row 1: Summary Cards */}
          <SummaryCards
            financial={financial}
            invoices={invoices}
            ksef={ksef}
            isLoading={isLoading}
            translations={t.summary}
          />

          {/* Row 2: Revenue Chart + Unpaid Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="lg:col-span-2">
              <RevenueExpenseChart
                data={financial?.monthlyBreakdown ?? []}
                isLoading={isLoading}
                translations={t.charts}
              />
            </div>
            <UnpaidInvoicesCard
              data={invoices}
              isLoading={isLoading}
              translations={t.invoices}
            />
          </div>

          {/* Row 3: Deadlines + KSeF */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <TaxDeadlines
              deadlines={deadlines}
              isLoading={isLoading}
              translations={t.deadlines}
            />
            <KSeFStatusCard
              data={ksef}
              isLoading={isLoading}
              translations={t.ksef}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
