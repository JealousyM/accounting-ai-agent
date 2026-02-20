'use client';

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardDeadline } from '@/types/dashboard.types';

interface TaxDeadlinesTranslations {
  title: string;
  noDeadlines: string;
  notConnected: string;
  daysLeft: string;
  today: string;
  overdue: string;
  daysOverdue: string;
}

interface TaxDeadlinesProps {
  deadlines: DashboardDeadline[] | null;
  isLoading?: boolean;
  translations: TaxDeadlinesTranslations;
}

const urgencyStyles: Record<DashboardDeadline['urgency'], string> = {
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  urgent: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  soon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  normal: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
};

function getUrgencyText(deadline: DashboardDeadline, translations: TaxDeadlinesTranslations): string {
  if (deadline.daysUntil === 0) return translations.today;
  if (deadline.urgency === 'overdue') {
    return translations.daysOverdue.replace('{days}', String(Math.abs(deadline.daysUntil)));
  }
  return translations.daysLeft.replace('{days}', String(deadline.daysUntil));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaxDeadlines({ deadlines, isLoading, translations }: TaxDeadlinesProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-36 rounded mb-2" />
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {translations.title}
        </h3>
      </div>

      {deadlines == null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.notConnected}</p>
      ) : deadlines.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.noDeadlines}</p>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-auto">
          {deadlines.map((deadline) => (
            <div
              key={deadline.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(deadline.date)}
                  </span>
                  {deadline.groupName && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {deadline.groupName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {deadline.description}
                </p>
              </div>
              <span
                className={cn(
                  'ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                  urgencyStyles[deadline.urgency]
                )}
              >
                {getUrgencyText(deadline, translations)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
