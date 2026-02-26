'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

export function CTASection() {
  const { locale } = useLocale();
  const t = translations[locale].landing.cta;

  return (
    <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          {t.title}
        </h2>
        <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
          {t.subtitle}
        </p>
        <Link
          href="/register"
          className="inline-block bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          {t.button}
        </Link>
      </div>
    </section>
  );
}
