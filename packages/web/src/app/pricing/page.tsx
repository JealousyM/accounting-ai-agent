'use client';

import { Suspense } from 'react';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function PricingPage() {
  const { locale } = useLocale();
  const { isAuthenticated, isLoading } = useAuth();
  const t = translations[locale].subscription.pages;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={isAuthenticated ? '/chat' : '/'}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t.pricing}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <PricingPlans isPublic={!isAuthenticated && !isLoading} />
        </Suspense>
      </main>
    </div>
  );
}
