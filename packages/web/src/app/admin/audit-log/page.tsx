'use client';

import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

function AuditLogPage() {
  const { locale } = useLocale();
  const t = translations[locale].admin.auditLog;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.pageTitle}</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuditLogTable />
      </main>
    </div>
  );
}

export default function AuditLogPageWrapper() {
  return (
    <AdminRoute>
      <AuditLogPage />
    </AdminRoute>
  );
}
