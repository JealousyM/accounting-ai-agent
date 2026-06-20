/**
 * Centralised SEO configuration and JSON-LD structured-data builders.
 *
 * i18n strategy (pragmatic): the Polish version is the canonical, server-rendered
 * one (primary market). en/ru remain client-side via LocaleContext. Metadata and
 * structured data below are therefore authored in Polish.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://eksiegowyai.pl'
).replace(/\/$/, '');

export const SITE_NAME = 'eKsięgowy AI';

/** Routes that must never be indexed (auth-gated or API). Used by robots.ts. */
export const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/dashboard/',
  '/chat',
  '/settings/',
  '/subscription/',
  '/ksef/',
  '/referral',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/',
];

/** Public, indexable routes. Used by sitemap.ts. */
export const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/guide',
  '/guide/ksef',
  '/guide/ksef/get-tokens',
  '/guide/wfirma',
  '/guide/wfirma/get-api-credentials',
  '/guide/telegram',
  '/guide/telegram/setup',
  '/terms',
  '/privacy-policy',
  '/cookies',
  '/rodo',
];

/** Absolute URL for a given path. */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

// ============================================
// Organization (legal entity behind the service)
// ============================================

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MICODE sp. z o.o.',
  legalName: 'MICODE SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  taxID: '5833510147',
  vatID: 'PL5833510147',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'ul. Jana Heweliusza 11/811',
    postalCode: '80-890',
    addressLocality: 'Gdańsk',
    addressCountry: 'PL',
  },
};

// ============================================
// WebSite (enables sitelinks search box)
// ============================================

export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'pl-PL',
  publisher: { '@type': 'Organization', name: 'MICODE sp. z o.o.' },
};

// ============================================
// SoftwareApplication (the product itself)
// ============================================

export const SOFTWARE_APPLICATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'Asystent księgowy oparty na AI dla polskich firm. Integracja z wFirma, obsługa e-faktur KSeF oraz odpowiedzi na pytania o VAT, PIT, CIT i ZUS.',
  inLanguage: ['pl-PL', 'en-US', 'ru-RU'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'PLN',
  },
  publisher: { '@type': 'Organization', name: 'MICODE sp. z o.o.' },
};

/** Build a BreadcrumbList for a guide page. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
