'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import {
  updateUserLimits,
  resetUserUsage,
  type UserDetailResponse,
} from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

type ResetType = 'ai' | 'wfirma' | 'both';

interface LimitsPanelProps {
  user: UserDetailResponse['user'];
}

export function LimitsPanel({ user }: LimitsPanelProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.limits;
  const queryClient = useQueryClient();

  const [aiLimit, setAiLimit] = useState(user.aiMessagesLimit);
  const [wfirmaLimit, setWfirmaLimit] = useState(user.wfirmaRequestsLimit);
  const [savedMsg, setSavedMsg] = useState('');
  const [resetConfirm, setResetConfirm] = useState<ResetType | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'user', user.id] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateUserLimits(user.id, {
        aiMessagesLimit: aiLimit,
        wfirmaRequestsLimit: wfirmaLimit,
      }),
    onSuccess: () => {
      invalidate();
      setSavedMsg(t.saved);
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  const resetMutation = useMutation({
    mutationFn: (type: ResetType) => resetUserUsage(user.id, type),
    onSuccess: () => {
      invalidate();
      setResetConfirm(null);
    },
  });

  const usedHint = (used: number, limit: number) =>
    t.used.replace('{used}', String(used)).replace('{limit}', String(limit));

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.title}</h2>

      <div className="space-y-4">
        {/* AI messages limit */}
        <div>
          <label
            htmlFor="ai-limit-input"
            className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
          >
            {t.aiMessages}
          </label>
          <input
            id="ai-limit-input"
            type="number"
            min={0}
            max={1000000}
            step={1}
            value={aiLimit}
            onChange={(e) => setAiLimit(Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {usedHint(user.aiMessagesUsed, aiLimit)}
          </p>
        </div>

        {/* wFirma requests limit */}
        <div>
          <label
            htmlFor="wfirma-limit-input"
            className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
          >
            {t.wfirmaRequests}
          </label>
          <input
            id="wfirma-limit-input"
            type="number"
            min={0}
            max={1000000}
            step={1}
            value={wfirmaLimit}
            onChange={(e) => setWfirmaLimit(Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {usedHint(user.wfirmaRequestsUsed, wfirmaLimit)}
          </p>
        </div>

        {/* Save limits */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => {
              setSavedMsg('');
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? '…' : t.save}
          </button>
          {savedMsg && (
            <span className="text-sm text-green-600 dark:text-green-400">{savedMsg}</span>
          )}
          {saveMutation.isError && (
            <span className="text-sm text-red-600 dark:text-red-400">Error saving</span>
          )}
        </div>

        {/* Reset buttons */}
        <div className="pt-3 border-t dark:border-gray-700 space-y-3">
          {(
            [
              { type: 'ai' as ResetType, label: t.resetAi },
              { type: 'wfirma' as ResetType, label: t.resetWfirma },
              { type: 'both' as ResetType, label: t.resetBoth },
            ] as const
          ).map(({ type, label }) => (
            <div key={type}>
              {resetConfirm === type ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t.confirmReset}
                  </span>
                  <button
                    onClick={() => resetMutation.mutate(type)}
                    disabled={resetMutation.isPending}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {t.confirm}
                  </button>
                  <button
                    onClick={() => setResetConfirm(null)}
                    disabled={resetMutation.isPending}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResetConfirm(type)}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  {label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
