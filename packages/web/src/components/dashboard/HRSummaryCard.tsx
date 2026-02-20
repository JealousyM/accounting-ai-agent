'use client';

import { Users } from 'lucide-react';
import type { DashboardHRSummary } from '@/types/dashboard.types';

interface HRSummaryTranslations {
  title: string;
  totalEmployees: string;
  activeContracts: string;
  monthlyPayroll: string;
  noData: string;
  contractTypes: Record<string, string>;
}

interface HRSummaryCardProps {
  data: DashboardHRSummary | null;
  isLoading?: boolean;
  translations: HRSummaryTranslations;
}

const formatPLN = (value: number): string =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

export function HRSummaryCard({ data, isLoading, translations }: HRSummaryCardProps) {
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
        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
          <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {translations.title}
        </h3>
      </div>

      {data == null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.noData}</p>
      ) : (
        <div className="space-y-2">
          {/* Employee count */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{translations.totalEmployees}</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
              {data.employeeCount}
            </p>
          </div>

          {/* Active contracts by type */}
          {Object.keys(data.activeContractsByType).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {translations.activeContracts}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.activeContractsByType).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                  >
                    {translations.contractTypes[type] ?? type}
                    <span className="bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-200 rounded-full px-1.5 py-0.5 text-xs font-bold ml-0.5">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Monthly payroll */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{translations.monthlyPayroll}</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatPLN(data.totalMonthlyPayroll)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
