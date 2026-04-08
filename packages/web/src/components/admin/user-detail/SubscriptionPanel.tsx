'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { updateUserSubscription, type UserDetailResponse } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface SubscriptionPanelProps {
  user: UserDetailResponse['user'];
}

export function SubscriptionPanel({ user }: SubscriptionPanelProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.subscription;
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>(
    user.subscriptionPlan === 'pro' ? 'pro' : 'free'
  );
  const [savedMsg, setSavedMsg] = useState('');

  const mutation = useMutation({
    mutationFn: (plan: 'free' | 'pro') => updateUserSubscription(user.id, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSavedMsg(t.saved);
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  const handleSave = () => {
    setSavedMsg('');
    mutation.mutate(selectedPlan);
  };

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.title}</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t.status}</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {user.subscriptionStatus || '—'}
          </span>
        </div>

        {user.subscriptionEndDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t.endDate}</span>
            <span className="text-gray-900 dark:text-white">
              {new Date(user.subscriptionEndDate).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="pt-3 border-t dark:border-gray-700">
          <label
            htmlFor="subscription-plan-select"
            className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
          >
            {t.plan}
          </label>
          <select
            id="subscription-plan-select"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as 'free' | 'pro')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="free">{t.free}</option>
            <option value="pro">{t.pro}</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? '…' : t.save}
          </button>
          {savedMsg && (
            <span className="text-sm text-green-600 dark:text-green-400">{savedMsg}</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-red-600 dark:text-red-400">Error saving</span>
          )}
        </div>
      </div>
    </section>
  );
}
