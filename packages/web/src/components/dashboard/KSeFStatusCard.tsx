'use client';

import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import type { DashboardKSeFSummary } from '@/types/dashboard.types';

interface KSeFStatusTranslations {
  title: string;
  totalSent: string;
  totalReceived: string;
  accepted: string;
  rejected: string;
  pending: string;
  acceptanceRate: string;
  noData: string;
  noActivity: string;
}

interface KSeFStatusCardProps {
  data: DashboardKSeFSummary | null;
  isLoading?: boolean;
  translations: KSeFStatusTranslations;
}

const DONUT_COLORS = {
  accepted: '#22c55e',
  rejected: '#ef4444',
  pending: '#f59e0b',
};

export function KSeFStatusCard({ data, isLoading, translations }: KSeFStatusCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-36 rounded mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />
      </div>
    );
  }

  const donutData = data
    ? [
        { name: translations.accepted, value: data.acceptedCount, color: DONUT_COLORS.accepted },
        { name: translations.rejected, value: data.rejectedCount, color: DONUT_COLORS.rejected },
        { name: translations.pending, value: data.pendingCount, color: DONUT_COLORS.pending },
      ]
    : [];

  // Donut + acceptance rate are only meaningful once at least one sent invoice
  // has a decision. Without it the chart renders as an empty ring at 0%, which
  // reads as broken — show a neutral note instead.
  const hasDecisionData = donutData.some((d) => d.value > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
          <Send className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {translations.title}
        </h3>
      </div>

      {data == null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.noData}</p>
      ) : (
        <div className="space-y-2">
          {hasDecisionData ? (
            <>
              {/* Donut chart with acceptance rate centered */}
              <div className="flex items-center justify-center">
                <div className="relative" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered acceptance rate */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(data.acceptanceRate)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Acceptance rate label */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {translations.acceptanceRate}
              </p>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {translations.noActivity}
            </p>
          )}

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{translations.totalSent}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.totalSent}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{translations.totalReceived}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.totalReceived}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{translations.rejected}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.rejectedCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{translations.pending}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.pendingCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
