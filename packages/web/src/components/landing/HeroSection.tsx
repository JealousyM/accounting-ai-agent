'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

export function HeroSection() {
  const { locale } = useLocale();
  const t = translations[locale].landing.hero;

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto py-20 sm:py-28 lg:py-36 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white max-w-4xl mx-auto leading-tight">
          {t.title}
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6">
          {t.subtitle}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              {t.ctaRegister}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              {t.ctaLogin}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
