'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const SECTION_KEYS = [
  'dataController',
  'introduction',
  'dataCollection',
  'dataUse',
  'dataStorage',
  'thirdParties',
  'cookies',
  'userRights',
  'security',
  'legalBasis',
  'dataRetention',
  'dpoInfo',
  'uodo',
  'eeaTransfers',
  'children',
  'changes',
  'contact',
] as const;

export default function PrivacyPolicyPage() {
  const { locale } = useLocale();
  const t = translations[locale].legal.privacyPolicy;
  const sections = t.sections as Record<string, { title: string; content: string }>;

  return (
    <LegalPageLayout title={t.title}>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4 mb-8">{t.lastUpdated}</p>
      {SECTION_KEYS.map((key) => {
        const section = sections[key];
        if (!section) return null;
        return (
          <section key={key}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{section.content}</p>
          </section>
        );
      })}
    </LegalPageLayout>
  );
}
