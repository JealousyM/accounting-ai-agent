'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KSeFSettingsForm, KSeFEnvironmentBadge } from '@/components/ksef';
import { KSeFContractorManager } from '../../../components/ksef/KSeFContractorManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function KSeFSettingsPage() {
  return (
    <ProtectedRoute>
      <KSeFSettingsContent />
    </ProtectedRoute>
  );
}

function KSeFSettingsContent() {
  const { locale } = useLocale();
  const t = translations[locale].ksef;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Link href="/ksef" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{t.title} {t.settings}</h1>
            </div>
            <KSeFEnvironmentBadge />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <KSeFSettingsForm />
        <KSeFContractorManager />
      </main>
    </div>
  );
}
