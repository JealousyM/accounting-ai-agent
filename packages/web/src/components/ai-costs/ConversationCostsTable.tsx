'use client';

import { ConversationCost } from '@/types/ai-costs.types';
import { MessageSquare, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TableTranslations {
  title: string;
  cost: string;
  tokens: string;
  messages: string;
  runs: string;
  lastActive: string;
}

interface ConversationsTranslations {
  title: string;
  noConversations: string;
  table: TableTranslations;
}

interface ConversationCostsTableProps {
  conversations: ConversationCost[];
  isLoading?: boolean;
  showViewAll?: boolean;
  limit?: number;
  translations?: ConversationsTranslations;
}

const DEFAULT_TRANSLATIONS: ConversationsTranslations = {
  title: 'Conversation Costs',
  noConversations: 'No conversations found',
  table: {
    title: 'Conversation',
    cost: 'Cost',
    tokens: 'Tokens',
    messages: 'Messages',
    runs: 'Model',
    lastActive: 'Last Active',
  },
};

export function ConversationCostsTable({
  conversations,
  isLoading,
  showViewAll = true,
  limit,
  translations = DEFAULT_TRANSLATIONS,
}: ConversationCostsTableProps) {
  const t = translations;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayConversations = limit ? conversations.slice(0, limit) : conversations;

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.title}</h3>
        {showViewAll && conversations.length > (limit || 0) && (
          <Link
            href="/dashboard/costs/conversations"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {displayConversations.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
          <p>{t.noConversations}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.title}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.cost}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.tokens}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.messages}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.runs}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.table.lastActive}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {displayConversations.map((conv) => (
                <tr
                  key={conv.conversationId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Link
                      href={`/dashboard/costs/conversations/${conv.conversationId}`}
                      className="flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <MessageSquare className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="font-medium truncate max-w-[120px] sm:max-w-xs">
                        {conv.title || 'Untitled'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    </Link>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCost(conv.cost)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(conv.tokens)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {conv.messageCount}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {conv.primaryModel || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTimeAgo(conv.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
