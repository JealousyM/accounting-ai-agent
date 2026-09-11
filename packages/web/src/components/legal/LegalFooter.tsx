'use client';

import React from 'react';
import { LocaleLink as Link } from '@/components/LocaleLink';
import { useLocale } from '@/contexts/LocaleContext';
import { MICODE_LINKS, type MicodeLinkKey } from '@/lib/external-links';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

const fallback = {
  allRightsReserved: 'All rights reserved',
  links: {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    cookies: 'Cookie Policy',
    rodo: 'GDPR Clause',
  },
};

type ProductLabels = Record<MicodeLinkKey | 'allProducts', string>;

/** Product link labels live under `landing.footer.products`, shared with LandingFooter. */
function productLabels(t: Record<string, unknown>): ProductLabels | undefined {
  const landing = t.landing as { footer?: { products?: ProductLabels } } | undefined;
  return landing?.footer?.products;
}

export function LegalFooter() {
  const { locale } = useLocale();
  const legalT = (translations[locale] as Record<string, unknown>).legal as { footer?: typeof fallback };
  const footerT: typeof fallback = legalT.footer ?? fallback;
  const guideT = (translations[locale] as Record<string, unknown>).guide as { title?: string } | undefined;
  const guideLabel = guideT?.title ?? 'Guide';
  const productsT = productLabels(translations[locale] as Record<string, unknown>);

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-4 justify-center">
          <Link
            href="/guide"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {guideLabel}
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {footerT.links.terms}
          </Link>
          <Link
            href="/privacy-policy"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {footerT.links.privacy}
          </Link>
          <Link
            href="/cookies"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {footerT.links.cookies}
          </Link>
          <Link
            href="/rodo"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {footerT.links.rodo}
          </Link>
        </nav>
        {/* Our other properties. Own sites, so the links stay followable. */}
        <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-4 justify-center">
          <Link
            href="/products"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {productsT?.allProducts ?? 'Products'}
          </Link>
          {MICODE_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {productsT?.[link.key] ?? link.name}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
          <img
            src="/mi_code_logo.svg"
            alt="MICODE sp. z o.o."
            width={40}
            height={40}
            className="rounded-full"
          />
          <p className="text-center text-xs text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} eKsięgowy AI — MICODE sp. z o.o. {footerT.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
}
