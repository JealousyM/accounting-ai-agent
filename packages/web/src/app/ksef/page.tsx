'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KSeFDashboard, KSeFEnvironmentBadge } from '@/components/ksef';
import Link from 'next/link';
import { Settings, FileText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function KSeFPage() {
  return (
    <ProtectedRoute>
      <KSeFPageContent />
    </ProtectedRoute>
  );
}

function KSeFPageContent() {
  const { locale } = useLocale();
  const t = translations[locale].ksef;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <KSeFEnvironmentBadge />
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/ksef/invoices"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" />
                {t.invoices}
              </Link>
              <Link
                href="/ksef/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                {t.settings}
              </Link>
              <Link
                href="/chat"
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {t.backToChat}
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KSeFDashboard />
      </main>
    </div>
  );
}
