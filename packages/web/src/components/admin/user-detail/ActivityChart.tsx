'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLocale } from '@/contexts/LocaleContext';
import type { UserDeepStats } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface ActivityChartProps {
  data: UserDeepStats['activityByDay'];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.stats;

  if (!data || data.length === 0) {
    return (
      <section className="border rounded-lg p-6 bg-white dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t.noActivity}</p>
      </section>
    );
  }

  // Format date labels — show only MM/DD to avoid crowding
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
  }));

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t.activity}</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) =>
              value === 'toolCalls' ? 'Tool calls' : 'Conversations'
            }
          />
          <Bar dataKey="toolCalls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="conversations" fill="#10b981" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
