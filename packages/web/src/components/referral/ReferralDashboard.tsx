'use client';

import React, { useState } from 'react';
import { Copy, Check, Users, Trophy, Clock, Gift } from 'lucide-react';
import { useReferral } from '@/hooks/useReferral';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export function ReferralDashboard() {
  const { info, stats, isLoading, error } = useReferral();
  const { locale } = useLocale();
  const t = translations[locale].referral;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (info?.shareLink) {
      await navigator.clipboard.writeText(info.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">{error}</div>
    );
  }

  if (!info) return null;

  const statCards = [
    { label: t.stats.totalReferred, value: info.stats.totalReferred, icon: Users, color: 'text-blue-500' },
    { label: t.stats.converted, value: info.stats.converted, icon: Trophy, color: 'text-green-500' },
    { label: t.stats.pending, value: info.stats.pending, icon: Clock, color: 'text-yellow-500' },
    { label: t.stats.rewardsEarned, value: info.stats.totalRewardsEarned, icon: Gift, color: 'text-purple-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-blue-100">{t.description}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-white/10 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-200">{t.yourCode}</p>
            <p className="text-lg font-mono font-bold">{info.referralCode}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 flex items-center gap-2">
            <div className="flex-1 truncate">
              <p className="text-xs text-blue-200">{t.shareLink}</p>
              <p className="text-sm font-mono truncate">{info.shareLink}</p>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-200">{t.reward.referrerReward}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-200">{t.reward.referredReward}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Referrals Table */}
      {stats && stats.referrals.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t.table.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t.table.status}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t.table.date}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-4 py-3 text-sm dark:text-white">{referral.referredUserName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        referral.status === 'converted'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : referral.status === 'revoked'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {t.status[referral.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t.noReferrals}</p>
        </div>
      )}
    </div>
  );
}
