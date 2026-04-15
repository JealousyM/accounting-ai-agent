'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileWarning,
  Send,
} from 'lucide-react';
import type {
  DashboardFinancialSummary,
  DashboardInvoiceSummary,
  DashboardKSeFSummary,
} from '@/types/dashboard.types';

interface SummaryCardsTranslations {
  revenue: string;
  expenses: string;
  profit: string;
  unpaidInvoices: string;
  ksefSent: string;
}

interface SummaryCardsProps {
  financial: DashboardFinancialSummary | null;
  invoices: DashboardInvoiceSummary | null;
  ksef: DashboardKSeFSummary | null;
  isLoading?: boolean;
  translations: SummaryCardsTranslations;
}

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const formatPLN = (value: number): string =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

export function SummaryCards({
  financial,
  invoices,
  ksef,
  isLoading,
  translations,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const stats: StatItem[] = [
    {
      label: translations.revenue,
      value: financial ? formatPLN(financial.revenue) : '--',
      icon: TrendingUp,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: translations.expenses,
      value: financial ? formatPLN(financial.expenses) : '--',
      icon: TrendingDown,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: translations.profit,
      value: financial ? formatPLN(financial.profit) : '--',
      icon: DollarSign,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: translations.unpaidInvoices,
      value: invoices != null ? String(invoices.unpaidCount) : '--',
      icon: FileWarning,
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    },
    {
      label: translations.ksefSent,
      value: ksef != null ? String(ksef.totalSent) : '--',
      icon: Send,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
              <div className={`p-1.5 rounded-lg ${stat.iconBg}`}>
                <Icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
