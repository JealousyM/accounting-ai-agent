'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, Locale } from '@/contexts/LocaleContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'pl', label: 'PL' },
  { value: 'ru', label: 'RU' },
];

export function LandingHeader() {
  const { locale, setLocale } = useLocale();
  const t = translations[locale].landing.nav;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 dark:text-white shrink-0"
        >
          eKsiegowy AI
        </Link>

        {/* Desktop nav - center */}
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t.features}
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t.pricing}
          </a>
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          {/* Locale switcher */}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer mr-1"
          >
            {localeOptions.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          <ThemeToggle />

          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t.login}
            </Button>
          </Link>

          <Link href="/register">
            <Button size="sm">
              {t.register}
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="px-4 py-4 space-y-4">
            {/* Nav links */}
            <nav className="flex flex-col gap-2">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 transition-colors"
              >
                {t.features}
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 transition-colors"
              >
                {t.pricing}
              </a>
            </nav>

            {/* Auth buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full">
                  {t.login}
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">
                  {t.register}
                </Button>
              </Link>
            </div>

            {/* Locale + Theme */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {localeOptions.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
