'use client';

import { Suspense } from 'react';
import { LocaleLink as Link } from '@/components/LocaleLink';
import { Loader2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

export function PricingPreviewSection() {
  const { locale } = useLocale();
  const t = translations[locale].landing.pricingPreview;

  return (
    <section id="pricing" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Pricing plans */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <PricingPlans isPublic showHeader={false} />
        </Suspense>

        {/* View all link */}
        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            {t.viewAll} &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
