'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueExpenseChartTranslations {
  revenueExpenses: string;
  noData: string;
  revenue: string;
  expenses: string;
  profit: string;
}

interface RevenueExpenseChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
  translations: RevenueExpenseChartTranslations;
}

const formatPLN = (value: number): string =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

const formatShortMonth = (month: string): string => {
  const date = new Date(month + '-01');
  if (isNaN(date.getTime())) return month;
  return date.toLocaleDateString('en-US', { month: 'short' });
};

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  translations: RevenueExpenseChartTranslations;
}

function CustomTooltip({ active, payload, label, translations }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((p) => p.name === translations.revenue)?.value ?? 0;
  const expenses = payload.find((p) => p.name === translations.expenses)?.value ?? 0;
  const profit = revenue - expenses;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatPLN(entry.value)}
        </p>
      ))}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
        {translations.profit}: {formatPLN(profit)}
      </p>
    </div>
  );
}

export function RevenueExpenseChart({ data, isLoading, translations }: RevenueExpenseChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-36 rounded mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-[280px] rounded-lg" />
      </div>
    );
  }

  const hasData = data.length > 0 && data.some((d) => d.revenue > 0 || d.expenses > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {translations.revenueExpenses}
      </h3>
      {!hasData ? (
        <div className="flex items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
          {translations.noData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="month"
              tickFormatter={formatShortMonth}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              tickFormatter={(value: number) => formatPLN(value)}
              tick={{ fontSize: 11 }}
              width={100}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip translations={translations} />} />
            <Legend />
            <Bar dataKey="revenue" name={translations.revenue} fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name={translations.expenses} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
