'use client';
import React from 'react';
import { LocaleLink as Link } from '@/components/LocaleLink';
import { ArrowLeft } from 'lucide-react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { useLocaleSwitcher } from '@/hooks/useLocalizedHref';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl } from '@/lib/seo';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

interface Props {
  title: string;
  summary?: string;
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'pl', label: 'PL' },
  { value: 'ru', label: 'RU' },
];

export function GuidePageLayout({ title, summary, breadcrumbs, children }: Props) {
  const { locale } = useLocale();
  const switchLocale = useLocaleSwitcher();

  // BreadcrumbList structured data (only meaningful for multi-level trails)
  const breadcrumbJsonLd =
    breadcrumbs.length > 1
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absoluteUrl(item.href) } : {}),
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}
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
          <select
            value={locale}
            onChange={(e) => switchLocale(e.target.value as Locale)}
            className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            aria-label="Language"
          >
            {LOCALE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
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
