'use client';

import { UserAnalytics } from '@/types/user-analytics.types';

interface Translations {
  conversations: string;
  toolCalls: string;
  topTool: string;
  noData: string;
}

interface Props {
  data: UserAnalytics | undefined;
  isLoading: boolean;
  translations: Translations;
}

const Skeleton = () => (
  <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
);

export function AnalyticsSummaryCards({ data, isLoading, translations: t }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const topTool = data?.toolUsage.topTools[0]?.toolName
    ? formatToolName(data.toolUsage.topTools[0].toolName)
    : t.noData;

  const cards = [
    { label: t.conversations, value: data?.conversations.totalInRange ?? 0 },
    { label: t.toolCalls, value: data?.toolUsage.totalCalls ?? 0 },
    { label: t.topTool, value: topTool },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-5"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function formatToolName(toolName: string): string {
  return toolName
    .replace(/^(wfirma|ksef|hr|org|memory|prefer)_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
