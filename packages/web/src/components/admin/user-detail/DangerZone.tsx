'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { softDeleteUser, hardDeleteUser, type UserDetailResponse } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface DangerZoneProps {
  user: UserDetailResponse['user'];
}

export function DangerZone({ user }: DangerZoneProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.danger;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();

  const isSelf = currentAdmin?.id === user.id;

  const [softModal, setSoftModal] = useState(false);
  const [hardModal, setHardModal] = useState(false);
  const [hardEmailInput, setHardEmailInput] = useState('');

  const invalidateAdminLists = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const softMutation = useMutation({
    mutationFn: () => softDeleteUser(user.id),
    onSuccess: () => {
      setSoftModal(false);
      invalidateAdminLists();
      router.push('/admin');
    },
  });

  const hardMutation = useMutation({
    mutationFn: () => hardDeleteUser(user.id),
    onSuccess: () => {
      setHardModal(false);
      invalidateAdminLists();
      router.push('/admin');
    },
  });

  const handleHardModalOpen = () => {
    setHardEmailInput('');
    setHardModal(true);
  };

  return (
    <section className="border border-red-200 dark:border-red-900/50 rounded-lg p-6 bg-white dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">{t.title}</h2>

      {isSelf && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-2">
          {t.selfActionDisabled}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Soft delete */}
        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t.softDelete}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.softDeleteHint}</p>
          <button
            onClick={() => setSoftModal(true)}
            disabled={isSelf}
            className="px-4 py-2 text-sm border border-orange-400 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t.softDelete}
          </button>
        </div>

        {/* Hard delete */}
        <div className="flex-1 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t.hardDelete}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.hardDeleteHint}</p>
          <button
            onClick={handleHardModalOpen}
            disabled={isSelf}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t.hardDelete}
          </button>
        </div>
      </div>

      {/* Soft delete modal */}
      {softModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t.softDeleteConfirm}
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSoftModal(false)}
                disabled={softMutation.isPending}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => softMutation.mutate()}
                disabled={softMutation.isPending}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {softMutation.isPending ? '…' : t.confirm}
              </button>
            </div>
            {softMutation.isError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">Error deleting user</p>
            )}
          </div>
        </div>
      )}

      {/* Hard delete modal */}
      {hardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {t.hardDelete}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {t.hardDeleteConfirm}
            </p>
            <code className="block text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mb-3 text-gray-800 dark:text-gray-200">
              {user.email}
            </code>
            <input
              type="email"
              value={hardEmailInput}
              onChange={(e) => setHardEmailInput(e.target.value)}
              placeholder={user.email}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setHardModal(false);
                  setHardEmailInput('');
                }}
                disabled={hardMutation.isPending}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => hardMutation.mutate()}
                disabled={hardEmailInput !== user.email || hardMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {hardMutation.isPending ? '…' : t.confirm}
              </button>
            </div>
            {hardMutation.isError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">Error deleting user</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
