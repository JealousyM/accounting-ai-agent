import { useParams } from 'next/navigation';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';

type Locale = 'en' | 'pl';

const translations = {
  en: enTranslations,
  pl: plTranslations,
};

export function useTranslation() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  return {
    t: translations[locale],
    locale,
  };
}
