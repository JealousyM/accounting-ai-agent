'use client';

import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const steps = [
  { key: 'step1' as const, number: 1 },
  { key: 'step2' as const, number: 2 },
  { key: 'step3' as const, number: 3 },
];

export function HowItWorksSection() {
  const { locale } = useLocale();
  const t = translations[locale].landing.howItWorks;

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center">
          {t.title}
        </h2>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {steps.map(({ key, number }) => {
            const step = t[key];
            return (
              <div key={key} className="text-center md:text-left">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4 mx-auto md:mx-0">
                  {number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
