'use client';

import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpcomingTaxDeadline, TaxUrgency } from '@/types/tax-calendar.types';

interface TaxDeadlineNudgesTranslations {
  title: string;
  overdue: string;
  today: string;
  daysLeft: string;
  daysOverdue: string;
  promptTemplate: string;
}

interface TaxDeadlineNudgesProps {
  deadlines: UpcomingTaxDeadline[];
  isLoading: boolean;
  translations: TaxDeadlineNudgesTranslations;
  onNudgeClick: (prompt: string) => void;
}

const urgencyBar: Record<TaxUrgency, string> = {
  overdue: 'bg-red-500',
  urgent: 'bg-orange-400',
  soon: 'bg-yellow-400',
  normal: 'bg-blue-400',
};

const urgencyText: Record<TaxUrgency, string> = {
  overdue: 'text-red-700 dark:text-red-400',
  urgent: 'text-orange-700 dark:text-orange-400',
  soon: 'text-yellow-700 dark:text-yellow-400',
  normal: 'text-blue-700 dark:text-blue-400',
};

function getLabel(deadline: UpcomingTaxDeadline, t: TaxDeadlineNudgesTranslations): string {
  if (deadline.daysUntil === 0) return t.today;
  if (deadline.urgency === 'overdue') {
    return t.daysOverdue.replace('{days}', String(Math.abs(deadline.daysUntil)));
  }
  return t.daysLeft.replace('{days}', String(deadline.daysUntil));
}

function buildPrompt(deadline: UpcomingTaxDeadline, template: string): string {
  return template
    .replace('{name}', deadline.name)
    .replace('{days}', String(Math.abs(deadline.daysUntil)));
}

export function TaxDeadlineNudges({
  deadlines,
  isLoading,
  translations,
  onNudgeClick,
}: TaxDeadlineNudgesProps) {
  if (isLoading) {
    return (
      <div className="px-3 py-2 space-y-1.5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (deadlines.length === 0) return null;

  const shown = deadlines.slice(0, 5);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Calendar className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {translations.title}
        </span>
      </div>
      <div className="space-y-1">
        {shown.map((d) => (
          <button
            key={d.id}
            onClick={() => onNudgeClick(buildPrompt(d, translations.promptTemplate))}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
            title={d.description}
          >
            <span className={cn('w-1 h-6 rounded-full flex-shrink-0', urgencyBar[d.urgency])} />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                {d.name}
              </span>
            </span>
            <span className={cn('text-xs font-medium whitespace-nowrap flex items-center gap-0.5', urgencyText[d.urgency])}>
              {d.urgency === 'overdue' && <AlertTriangle className="w-3 h-3" />}
              {d.urgency !== 'overdue' && d.daysUntil <= 3 && <Clock className="w-3 h-3" />}
              {getLabel(d, translations)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
