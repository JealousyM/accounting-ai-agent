'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DailyCostData } from '@/types/ai-costs.types';

interface ChartTranslations {
  dailyCost: string;
  noData: string;
}

interface CostChartProps {
  data: DailyCostData[];
  isLoading?: boolean;
  translations?: ChartTranslations;
}

const DEFAULT_TRANSLATIONS: ChartTranslations = {
  dailyCost: 'Daily Cost Trend',
  noData: 'No data available for the selected period',
};

export function CostChart({ data, isLoading, translations = DEFAULT_TRANSLATIONS }: CostChartProps) {
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.dailyCost}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {t.noData}
        </div>
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    cost: Number(item.cost.toFixed(4)),
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.dailyCost}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                return [value.toLocaleString(), name];
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5, fill: '#2563eb' }}
              name="Cost (PLN)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
