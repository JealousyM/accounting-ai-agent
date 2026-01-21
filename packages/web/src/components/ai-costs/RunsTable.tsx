'use client';

import { RunCostDetail } from '@/types/ai-costs.types';
import { Zap } from 'lucide-react';

interface RunsTableTranslations {
  title: string;
  noRuns: string;
  table: {
    name: string;
    model: string;
    cost: string;
    tokens: string;
    latency: string;
    timestamp: string;
  };
}

interface RunsTableProps {
  runs: RunCostDetail[];
  isLoading?: boolean;
  translations?: RunsTableTranslations;
}

const DEFAULT_TRANSLATIONS: RunsTableTranslations = {
  title: 'Individual Runs',
  noRuns: 'No runs recorded yet',
  table: {
    name: 'Run Name',
    model: 'Model',
    cost: 'Cost',
    tokens: 'Tokens',
    latency: 'Latency',
    timestamp: 'Timestamp',
  },
};

export function RunsTable({ runs, isLoading, translations = DEFAULT_TRANSLATIONS }: RunsTableProps) {
  const t = translations;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCost = (cost: number): string => {
    if (cost < 0.0001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(3)}`;
  };

  const formatNumber = (num: number): string => {
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

  const getProviderColor = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'bg-green-100 text-green-700';
      case 'anthropic':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {runs.length} LLM {runs.length === 1 ? 'call' : 'calls'}
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>{t.noRuns}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.name}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.model}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.cost}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.tokens}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.latency}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.table.timestamp}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {runs.map((run) => (
                <tr key={run.runId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-gray-900 truncate max-w-xs">
                        {run.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-900">{run.model}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${getProviderColor(run.provider)}`}
                      >
                        {run.provider}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCost(run.totalCost)}
                      </span>
                      <span className="text-xs text-gray-500">
                        In: {formatCost(run.inputCost)} / Out: {formatCost(run.outputCost)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(run.totalTokens)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatNumber(run.promptTokens)} / {formatNumber(run.completionTokens)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    {run.latencyMs}ms
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatTimeAgo(run.timestamp)}
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
