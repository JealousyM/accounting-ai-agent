'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { HeaderUserMenu } from './HeaderUserMenu';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface AppHeaderProps {
  /** Page title shown next to the logo. */
  title?: string;
  /** Optional element rendered between the logo and the title (e.g. a back button). */
  leading?: React.ReactNode;
  /** Optional page-specific actions rendered before the shared user controls (e.g. refresh). */
  actions?: React.ReactNode;
}

/**
 * Canonical application header for authenticated, non-chat pages. Shares the
 * same logo + user-controls cluster (language, theme, profile, logout) as the
 * chat header via {@link HeaderUserMenu}, so the chrome stays consistent
 * everywhere and language/logout are always reachable.
 */
export function AppHeader({ title, leading, actions }: AppHeaderProps) {
  const { locale, setLocale } = useLocale();
  const t = translations[locale];

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="shrink-0" aria-label="eKsięgowy AI home">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
            <img src="/logo.svg" alt="eKsięgowy AI" width={48} height={48} />
          </Link>
          {leading}
          {title && (
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {actions}
          <HeaderUserMenu
            locale={locale}
            onLocaleChange={setLocale}
            logoutLabel={t.chat.header.logout}
            profileTranslations={t.profile}
            apiCredentialsTranslations={t.apiCredentials}
            helpTranslations={t.help}
            telegramTranslations={t.telegram}
          />
        </div>
      </div>
    </header>
  );
}
