'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLocale } from '@/contexts/LocaleContext';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const t = translations[locale].subscription.pages.success;

  useEffect(() => {
    // Invalidate subscription cache to fetch updated status
    queryClient.invalidateQueries({ queryKey: ['subscription'] });

    // Redirect to chat after 5 seconds
    const timeout = setTimeout(() => {
      router.push('/chat');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [queryClient, router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t.title}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {t.description}
          </p>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {t.startUsing}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t.redirecting}
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
