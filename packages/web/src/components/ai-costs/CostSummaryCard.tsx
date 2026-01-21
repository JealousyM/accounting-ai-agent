'use client';

import { UserCostSummary } from '@/types/ai-costs.types';
import { DollarSign, Cpu, MessageSquare, Zap, Clock } from 'lucide-react';

interface SummaryTranslations {
  totalCost: string;
  totalTokens: string;
  conversations: string;
  llmRuns: string;
  avgLatency: string;
}

interface CostSummaryCardProps {
  summary?: UserCostSummary;
  isLoading?: boolean;
  translations?: SummaryTranslations;
}

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const DEFAULT_TRANSLATIONS: SummaryTranslations = {
  totalCost: 'Total Cost',
  totalTokens: 'Total Tokens',
  conversations: 'Conversations',
  llmRuns: 'LLM Runs',
  avgLatency: 'Avg Latency',
};

export function CostSummaryCard({ summary, isLoading, translations = DEFAULT_TRANSLATIONS }: CostSummaryCardProps) {
  const t = translations;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

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

  const stats: StatItem[] = [
    {
      label: t.totalCost,
      value: formatCost(summary?.totalCost || 0),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t.totalTokens,
      value: formatNumber(summary?.totalTokens || 0),
      icon: Cpu,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t.conversations,
      value: (summary?.conversationCount || 0).toString(),
      icon: MessageSquare,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: t.llmRuns,
      value: (summary?.runCount || 0).toString(),
      icon: Zap,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: t.avgLatency,
      value: `${Math.round(summary?.avgLatencyMs || 0)}ms`,
      icon: Clock,
      color: 'text-gray-600 bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.color.split(' ')[1]}`}>
                <Icon className={`h-4 w-4 ${stat.color.split(' ')[0]}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
