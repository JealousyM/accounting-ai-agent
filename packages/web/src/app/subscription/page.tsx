'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { ArrowLeft, Gift } from 'lucide-react';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function SubscriptionPage() {
  const { locale } = useLocale();
  const t = translations[locale].subscription.pages;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t.subscription}
              </h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubscriptionManagement />

          {/* Referral Banner */}
          <Link
            href="/referral"
            className="block mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">{translations[locale].referral.reward.banner}</p>
                <p className="text-sm text-blue-500 dark:text-blue-400">{translations[locale].referral.reward.referrerReward}</p>
              </div>
            </div>
          </Link>
        </main>
      </div>
    </ProtectedRoute>
  );
}
