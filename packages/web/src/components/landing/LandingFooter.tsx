'use client';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { useLocale } from '@/contexts/LocaleContext';
import { MICODE_LINKS } from '@/lib/external-links';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const linkClass =
  'text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';

export function LandingFooter() {
  const { locale } = useLocale();
  const t = translations[locale].landing.footer;
  const guideT = translations[locale].guide;
  const productsT = t.products;

  return (
    <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
              <img
                src="/logo.svg"
                alt="eKsięgowy AI"
                width={128}
                height={128}
              />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                eKsięgowy AI
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t.description}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              {t.product}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.features}
                </a>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.pricing}
                </Link>
              </li>
              <li>
                <Link
                  href="/guide"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {guideT.title}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.blog}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              {t.legal}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.terms}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.cookies}
                </Link>
              </li>
              <li>
                <Link
                  href="/rodo"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t.links.rodo}
                </Link>
              </li>
            </ul>
          </div>

          {/* Other MICODE products — outbound links to our own properties, so
              they are intentionally followed (no rel=nofollow). */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              {productsT.title}
            </h4>
            <ul className="space-y-2">
              {MICODE_LINKS.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                    className={linkClass}
                  >
                    {productsT[link.key]}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/products" className={linkClass}>
                  {productsT.allProducts}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
          <img
            src="/mi_code_logo.svg"
            alt="MICODE sp. z o.o."
            width={52}
            height={52}
            className="rounded-full"
          />
          <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
            &copy; 2026 eKsięgowy AI &mdash; MICODE sp. z o.o. {t.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
}
