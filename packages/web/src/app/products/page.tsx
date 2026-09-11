'use client';

import { ExternalLink } from 'lucide-react';
import { LocaleLink as Link } from '@/components/LocaleLink';
import { useLocale } from '@/contexts/LocaleContext';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { PRODUCTS_ITEMLIST_JSONLD } from '@/lib/seo';
import { micodeLink } from '@/lib/external-links';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

const linkClass =
  'inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline';

/**
 * Hub page for the MICODE product family. Its job is twofold: tell visitors what
 * else we make, and give each of our properties a followed link from an indexed
 * page (the outbound links are our own sites, so no rel=nofollow).
 */
export default function ProductsPage() {
  const { locale } = useLocale();
  const t = translations[locale].productsPage;
  const labels = translations[locale].landing.footer.products;

  const cards = [
    {
      item: t.items.eksiegowy,
      // This site itself — an internal link, kept locale-aware.
      internalHref: '/',
      external: [],
    },
    {
      item: t.items.micode,
      internalHref: undefined,
      external: [{ url: micodeLink('micode').url, label: t.visit }],
    },
    {
      item: t.items.aiBudget,
      internalHref: undefined,
      external: [
        { url: micodeLink('aiBudget').url, label: t.visit },
        { url: micodeLink('aiBudgetApp').url, label: labels.aiBudgetApp },
        { url: micodeLink('aiBudgetPlay').url, label: labels.aiBudgetPlay },
      ],
    },
  ];

  return (
    <LegalPageLayout title={t.title}>
      <JsonLd data={PRODUCTS_ITEMLIST_JSONLD} />
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed -mt-4">{t.subtitle}</p>

      {cards.map(({ item, internalHref, external }) => (
        <section
          key={item.name}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{item.name}</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {item.description}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {internalHref && (
              <Link href={internalHref} className={linkClass}>
                {t.visit}
              </Link>
            )}
            {external.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener"
                className={linkClass}
              >
                {link.label}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </LegalPageLayout>
  );
}
