'use client';

import React from 'react';
import { Send, Download, CheckCircle, XCircle, Clock, FileCheck } from 'lucide-react';
import { useKSeF } from '@/hooks/useKSeF';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export function KSeFDashboard() {
  const { statistics, isLoadingStatistics } = useKSeF();
  const { locale } = useLocale();
  const t = translations[locale].ksef;

  if (isLoadingStatistics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!statistics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t.sent}
          value={statistics.totalSent}
          icon={<Send className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label={t.received}
          value={statistics.totalReceived}
          icon={<Download className="h-5 w-5 text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label={t.accepted}
          value={statistics.acceptedCount}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          label={t.rejected}
          value={statistics.rejectedCount}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          color="bg-red-50"
        />
        <StatCard
          label={t.pending}
          value={statistics.pendingCount}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          color="bg-yellow-50"
        />
        <StatCard
          label={t.completed}
          value={statistics.completedCount}
          icon={<FileCheck className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-50"
        />
      </div>

      {statistics.byMonth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.monthlyTrend}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">{t.month}</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">{t.sent}</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">{t.received}</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">{t.accepted}</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">{t.rejected}</th>
                </tr>
              </thead>
              <tbody>
                {statistics.byMonth.map((m) => (
                  <tr key={m.month} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{m.month}</td>
                    <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">{m.sent}</td>
                    <td className="py-2 px-3 text-right text-purple-600 dark:text-purple-400">{m.received}</td>
                    <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">{m.accepted}</td>
                    <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{m.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
