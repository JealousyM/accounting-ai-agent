'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { useLocale, Locale } from '@/contexts/LocaleContext';

const translations: Record<Locale, { managePreferences: string }> = {
  en: { managePreferences: 'Cookie Settings' },
  pl: { managePreferences: 'Ustawienia cookies' },
  ru: { managePreferences: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 cookie' },
};

interface CookieSettingsButtonProps {
  className?: string;
  variant?: 'link' | 'button';
}

export function CookieSettingsButton({ className, variant = 'link' }: CookieSettingsButtonProps) {
  const { openPreferences, state } = useCookieConsent();
  const { locale } = useLocale();
  const t = translations[locale];

  if (!state.hasConsented) return null;

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={openPreferences}
        className={cn(
          'text-sm text-gray-500 hover:text-gray-700',
          'dark:text-gray-400 dark:hover:text-gray-200',
          'hover:underline transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
          className
        )}
      >
        {t.managePreferences}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openPreferences}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
        'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
    >
      <Cookie className="h-4 w-4" />
      {t.managePreferences}
    </button>
  );
}
