'use client';

import { UserAnalytics } from '@/types/user-analytics.types';
import { formatToolName } from './AnalyticsSummaryCards';

interface Translations {
  title: string;
  noData: string;
  calls: string;
}

interface Props {
  tools: UserAnalytics['toolUsage']['topTools'];
  isLoading: boolean;
  translations: Translations;
}

export function TopToolsList({ tools, isLoading, translations: t }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = tools[0]?.count ?? 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.title}</h3>
      {tools.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noData}</p>
      ) : (
        <ul className="space-y-3">
          {tools.map(({ toolName, count }) => {
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <li key={toolName} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {formatToolName(toolName)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {count} {t.calls}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
