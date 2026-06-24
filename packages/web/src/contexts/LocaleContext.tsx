'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// ============================================
// TYPES
// ============================================

export type Locale = 'en' | 'pl' | 'ru';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// ============================================
// CONSTANTS
// ============================================

const SUPPORTED_LOCALES: Locale[] = ['en', 'pl', 'ru'];
const DEFAULT_LOCALE: Locale = 'pl';
const LOCALE_STORAGE_KEY = 'locale';

// ============================================
// UTILS
// ============================================

/**
 * Check if a string is a valid locale
 */
function isValidLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
}

/**
 * Get locale from browser preferences
 */
function getBrowserLocale(): Locale | null {
  if (typeof window === 'undefined') return null;

  const browserLang = navigator.language.split('-')[0];
  return isValidLocale(browserLang) ? browserLang : null;
}

/**
 * Get locale from localStorage
 */
function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isValidLocale(stored) ? stored : null;
}

/**
 * Save locale to localStorage
 */
function saveLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

// ============================================
// CONTEXT
// ============================================

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface LocaleProviderProps {
  children: React.ReactNode;
  /**
   * Locale resolved server-side from the URL (via middleware's `x-locale`
   * header). When the URL carries an explicit `/en` or `/ru` prefix this is
   * authoritative and overrides any stored preference, so a shared link always
   * renders in its own language. Defaults to `pl` for unprefixed URLs.
   */
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE }: LocaleProviderProps) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize locale on mount.
   * If the URL explicitly selected a non-default locale (e.g. /en/pricing),
   * that wins and is persisted. Otherwise fall back to the stored preference,
   * then the browser language, then the default.
   */
  useEffect(() => {
    if (isInitialized) return;

    if (initialLocale !== DEFAULT_LOCALE) {
      // Explicit /en or /ru URL — authoritative.
      saveLocale(initialLocale);
    } else {
      const storedLocale = getStoredLocale();
      if (storedLocale) {
        setLocaleState(storedLocale);
      } else {
        const browserLocale = getBrowserLocale();
        if (browserLocale) {
          setLocaleState(browserLocale);
          saveLocale(browserLocale);
        }
      }
    }

    setIsInitialized(true);
  }, [isInitialized, initialLocale]);

  /**
   * Sync locale when user changes (e.g., login)
   * User's locale preference takes priority if set
   */
  useEffect(() => {
    if (user?.locale && isValidLocale(user.locale)) {
      setLocaleState(user.locale as Locale);
      saveLocale(user.locale as Locale);
    }
  }, [user?.locale]);

  /**
   * Keep <html lang> in sync with the active locale (SEO + a11y).
   * The server renders lang="pl" (canonical); update it once the client
   * resolves the user's actual locale.
   */
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  /**
   * Set locale and persist to localStorage
   */
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);

  const value: LocaleContextType = {
    locale,
    setLocale,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * useLocale hook
 * Access locale state and setter
 */
export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);

  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}
