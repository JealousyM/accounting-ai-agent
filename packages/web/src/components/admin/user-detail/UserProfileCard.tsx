'use client';

import { useLocale } from '@/contexts/LocaleContext';
import type { UserDetailResponse, UserDeepStats } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UserProfileCardProps {
  user: UserDetailResponse['user'];
  stats: UserDeepStats | undefined;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function UserProfileCard({ user, stats }: UserProfileCardProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail;

  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : null;

  const roleBadgeColor =
    user.role === 'admin'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

  const planBadgeColor =
    user.subscriptionPlan === 'pro'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';

  const statusBadgeColor = user.deletedAt
    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';

  const kpis = stats
    ? [
        {
          label: t.stats.totalCost,
          value: `$${stats.cost.totalUsd.toFixed(4)}`,
        },
        {
          label: t.stats.totalTokens,
          value: new Intl.NumberFormat().format(stats.cost.totalTokens),
        },
        {
          label: t.stats.conversations,
          value: stats.conversations.totalInRange.toString(),
        },
        {
          label: t.stats.lastConversation,
          value: stats.lastActivity.lastConversationAt
            ? new Date(stats.lastActivity.lastConversationAt).toLocaleDateString()
            : t.stats.noActivity,
        },
      ]
    : null;

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {user.email}
          </h1>
          {fullName && (
            <p className="mt-1 text-base text-gray-600 dark:text-gray-300">{fullName}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label={user.role} color={roleBadgeColor} />
            <Badge label={user.subscriptionPlan} color={planBadgeColor} />
            <Badge
              label={user.deletedAt ? t.deletedBadge : t.activeBadge}
              color={statusBadgeColor}
            />
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 shrink-0">
          <p>
            Registered:{' '}
            <span className="text-gray-700 dark:text-gray-200">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </p>
          <p>
            Updated:{' '}
            <span className="text-gray-700 dark:text-gray-200">
              {new Date(user.updatedAt).toLocaleDateString()}
            </span>
          </p>
          {user.deletedAt && (
            <p>
              Deleted:{' '}
              <span className="text-red-600 dark:text-red-400">
                {new Date(user.deletedAt).toLocaleDateString()}
              </span>
            </p>
          )}
        </div>
      </div>

      {kpis && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4 dark:border-gray-700">
          {kpis.map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
