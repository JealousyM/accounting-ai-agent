'use client';

import { useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { RegistrationFormData } from '@/lib/validations/auth';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

type Locale = 'en' | 'pl' | 'ru';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export function useRegistrationLocale(setValue: UseFormSetValue<RegistrationFormData>) {
  const [selectedLocale, setSelectedLocale] = useState<Locale>('en');

  const handleLocaleChange = (locale: Locale) => {
    setSelectedLocale(locale);
    setValue('locale', locale);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legalLinks = (translations[selectedLocale] as any)?.legal?.footer?.links;
  const t = translations[selectedLocale].auth.register;
  const tReferral = translations[selectedLocale].referral;

  return { selectedLocale, handleLocaleChange, t, legalLinks, tReferral };
}
