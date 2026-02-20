'use client';

import { FileWarning, AlertCircle } from 'lucide-react';
import type { DashboardInvoiceSummary } from '@/types/dashboard.types';

interface UnpaidInvoicesTranslations {
  title: string;
  unpaidCount: string;
  unpaidTotal: string;
  overdueCount: string;
  overdueTotal: string;
  noData: string;
  notConnected: string;
}

interface UnpaidInvoicesCardProps {
  data: DashboardInvoiceSummary | null;
  isLoading?: boolean;
  translations: UnpaidInvoicesTranslations;
}

const formatPLN = (value: number): string =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

export function UnpaidInvoicesCard({ data, isLoading, translations }: UnpaidInvoicesCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-36 rounded mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30">
          <FileWarning className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {translations.title}
        </h3>
      </div>

      {data == null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.notConnected}</p>
      ) : (
        <div className="space-y-2">
          {/* Unpaid row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{translations.unpaidCount}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {data.unpaidCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">{translations.unpaidTotal}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {formatPLN(data.unpaidTotal)}
              </p>
            </div>
          </div>

          {/* Overdue row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-red-600 dark:text-red-400">{translations.overdueCount}</p>
                <p className="text-xl font-semibold text-red-700 dark:text-red-300">
                  {data.overdueCount}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-600 dark:text-red-400">{translations.overdueTotal}</p>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">
                {formatPLN(data.overdueTotal)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
