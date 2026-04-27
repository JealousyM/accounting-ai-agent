'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { GuidePageLayout } from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function GuideIndexPage() {
  const { locale } = useLocale();
  const t = translations[locale].guide;

  return (
    <GuidePageLayout
      title={t.title}
      summary={t.description}
      breadcrumbs={[{ label: t.breadcrumbHome }]}
    >
      <div className="grid gap-4">
        <Link
          href="/guide/ksef"
          className="group flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {t.topics.ksef.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t.topics.ksef.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" />
        </Link>
      </div>
    </GuidePageLayout>
  );
}
