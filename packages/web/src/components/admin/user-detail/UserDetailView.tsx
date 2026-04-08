'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { fetchUserDetail, fetchUserStats, type StatsRange } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import { UserProfileCard } from './UserProfileCard';
import { SubscriptionPanel } from './SubscriptionPanel';
import { LimitsPanel } from './LimitsPanel';
import { UsageStatsPanel } from './UsageStatsPanel';
import { ActivityChart } from './ActivityChart';
import { ToolUsagePanel } from './ToolUsagePanel';
import { BehaviorPanel } from './BehaviorPanel';
import { DangerZone } from './DangerZone';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UserDetailViewProps {
  userId: string;
}

export function UserDetailView({ userId }: UserDetailViewProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail;
  const [range, setRange] = useState<StatsRange>('month');

  const userQ = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => fetchUserDetail(userId),
  });

  const statsQ = useQuery({
    queryKey: ['admin', 'user', userId, 'stats', range],
    queryFn: () => fetchUserStats(userId, range),
    enabled: !!userQ.data,
  });

  if (userQ.isLoading) {
    return <div className="p-6 text-gray-500">{t.loading}</div>;
  }
  if (userQ.isError || !userQ.data) {
    return <div className="p-6 text-red-500">{t.loadError}</div>;
  }

  const { user } = userQ.data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        ← {t.back}
      </Link>

      <UserProfileCard user={user} stats={statsQ.data} />

      <div className="grid gap-6 md:grid-cols-2">
        <SubscriptionPanel user={user} />
        <LimitsPanel user={user} />
      </div>

      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t.stats.title}</h2>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value as StatsRange)}
            aria-label={t.stats.range}
          >
            <option value="week">{t.stats.week}</option>
            <option value="month">{t.stats.month}</option>
            <option value="year">{t.stats.year}</option>
          </select>
        </header>

        {statsQ.isLoading || !statsQ.data ? (
          <div className="text-gray-500">{t.stats.loadingStats}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <UsageStatsPanel stats={statsQ.data} />
            <ActivityChart data={statsQ.data.activityByDay} />
            <ToolUsagePanel toolUsage={statsQ.data.toolUsage} />
            <BehaviorPanel stats={statsQ.data} />
          </div>
        )}
      </section>

      <DangerZone user={user} />
    </div>
  );
}
