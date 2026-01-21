'use client';

import { TimeRange } from '@/types/ai-costs.types';

interface TimeRangeTranslations {
  today: string;
  week: string;
  month: string;
  quarter: string;
  year: string;
}

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  translations?: TimeRangeTranslations;
}

const DEFAULT_TRANSLATIONS: TimeRangeTranslations = {
  today: 'Today',
  week: '7 Days',
  month: '30 Days',
  quarter: '3 Months',
  year: '1 Year',
};

export function TimeRangeSelector({ value, onChange, translations = DEFAULT_TRANSLATIONS }: TimeRangeSelectorProps) {
  const t = translations;

  const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: 'day', label: t.today },
    { value: 'week', label: t.week },
    { value: 'month', label: t.month },
    { value: 'quarter', label: t.quarter },
    { value: 'year', label: t.year },
  ];

  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            value === range.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
