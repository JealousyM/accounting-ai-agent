'use client';

import { UserAnalytics } from '@/types/user-analytics.types';

interface Translations {
  title: string;
  used: string;
  of: string;
  unlimited: string;
}

interface Props {
  quota: UserAnalytics['usageQuota'];
  isLoading: boolean;
  translations: Translations;
}

export function UsageQuotaBar({ quota, isLoading, translations: t }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const { used, limit } = quota;
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit === 0;

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.title}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {isUnlimited ? t.unlimited : `${used.toLocaleString()} ${t.of} ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
