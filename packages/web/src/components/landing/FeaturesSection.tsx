'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { MessageSquare, Building2, FileText, Globe, Mic, Shield } from 'lucide-react';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const featureKeys = [
  { key: 'aiChat' as const, icon: MessageSquare },
  { key: 'wfirma' as const, icon: Building2 },
  { key: 'ksef' as const, icon: FileText },
  { key: 'multilingual' as const, icon: Globe },
  { key: 'voice' as const, icon: Mic },
  { key: 'security' as const, icon: Shield },
];

export function FeaturesSection() {
  const { locale } = useLocale();
  const t = translations[locale].landing.features;

  return (
    <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {featureKeys.map(({ key, icon: Icon }) => {
            const feature = t[key];
            return (
              <div
                key={key}
                className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
