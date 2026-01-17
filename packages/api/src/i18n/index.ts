import plTranslations from './locales/pl.json';
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';

export type Locale = 'pl' | 'en' | 'ru';

export interface ContractorTranslations {
  notFound: string;
  contractorsTitle: string;
  tableHeaders: string;
  updateDeleteHint: string;
  contractorTitle: string;
  field: string;
  value: string;
  id: string;
  name: string;
  nip: string;
  regon: string;
  email: string;
  phone: string;
  address: string;
  bankAccount: string;
  notes: string;
  created: string;
  createdHint: string;
  updated: string;
  updatedHint: string;
  deleted: string;
  deletedWarning: string;
  errorCreateTitle: string;
  errorReason: string;
  requiredFields: string;
  recommendedFields: string;
  tryAgain: string;
  errorFetch: string;
  errorCreate: string;
  errorUpdate: string;
  errorDelete: string;
  notFoundByName: string;
  didYouMean: string;
  exactNotFound: string;
  similarContractors: string;
  specifyNameUpdate: string;
  specifyNameDelete: string;
}

export interface Translations {
  contractor: ContractorTranslations;
}

const translations: Record<Locale, Translations> = {
  pl: plTranslations,
  en: enTranslations,
  ru: ruTranslations,
};

export function getTranslations(locale: Locale = 'pl'): Translations {
  return translations[locale] || translations.pl;
}

export function getContractorTranslations(locale: Locale = 'pl'): ContractorTranslations {
  return getTranslations(locale).contractor;
}
