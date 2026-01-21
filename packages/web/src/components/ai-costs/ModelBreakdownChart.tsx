'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CostByModel } from '@/types/ai-costs.types';

interface ChartTranslations {
  costByModel: string;
  noData: string;
}

interface ModelBreakdownChartProps {
  data: CostByModel[];
  isLoading?: boolean;
  translations?: ChartTranslations;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const DEFAULT_TRANSLATIONS: ChartTranslations = {
  costByModel: 'Cost by Model',
  noData: 'No data available for the selected period',
};

export function ModelBreakdownChart({ data, isLoading, translations = DEFAULT_TRANSLATIONS }: ModelBreakdownChartProps) {
  const t = translations;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.costByModel}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {t.noData}
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.model,
    value: item.cost,
    percentage: item.percentage,
    provider: item.provider,
  }));

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.costByModel}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCost(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value, entry: any) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value} ({entry.payload?.percentage?.toFixed(1)}%)
                </span>
              )}
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
