'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

interface Props {
  title: string;
  summary?: string;
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}

export function GuidePageLayout({ title, summary, breadcrumbs, children }: Props) {
  const { locale, setLocale } = useLocale();
  const locales: Locale[] = ['en', 'pl', 'ru'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">eKsięgowy AI</span>
          </div>
          <div className="flex items-center gap-1">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-2 py-1 text-xs rounded uppercase font-medium transition-colors ${
                  locale === l
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{title}</h1>
        {summary && <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{summary}</p>}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
