/**
 * Centralised SEO configuration and JSON-LD structured-data builders.
 *
 * i18n strategy (localePrefix: as-needed): Polish is the default and canonical
 * language served on unprefixed URLs (e.g. /pricing). English and Russian are
 * served on prefixed URLs (/en/pricing, /ru/pricing) via middleware rewrite, and
 * every public page advertises the full hreflang trio so all three are indexable.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://eksiegowyai.pl'
).replace(/\/$/, '');

export const SITE_NAME = 'eKsięgowy AI';

// ============================================
// Locale routing (as-needed prefixing)
// ============================================

export type Locale = 'pl' | 'en' | 'ru';

/** All supported locales. Polish is the default (unprefixed). */
export const LOCALES: Locale[] = ['pl', 'en', 'ru'];

/** The default locale, served on unprefixed URLs and used as x-default. */
export const DEFAULT_LOCALE: Locale = 'pl';

/** Locales that carry a URL prefix (everything except the default). */
export const PREFIXED_LOCALES: Locale[] = ['en', 'ru'];

/** BCP-47 tags for hreflang / og:locale, keyed by our short locale codes. */
export const LOCALE_BCP47: Record<Locale, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  ru: 'ru-RU',
};

function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/**
 * Build the locale-aware path for a canonical (unprefixed) path.
 * Polish stays unprefixed; en/ru get a `/en` or `/ru` prefix.
 *   localizedPath('/pricing', 'en') -> '/en/pricing'
 *   localizedPath('/', 'ru')        -> '/ru'
 *   localizedPath('/pricing', 'pl') -> '/pricing'
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  if (locale === DEFAULT_LOCALE) return clean || '/';
  return `/${locale}${clean}`;
}

/**
 * Strip a leading locale prefix from a pathname, returning the canonical
 * (unprefixed) path plus the detected locale.
 *   splitLocale('/en/pricing') -> { locale: 'en', path: '/pricing' }
 *   splitLocale('/pricing')    -> { locale: 'pl', path: '/pricing' }
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split('/');
  const maybe = segments[1];
  if (maybe && isLocale(maybe) && maybe !== DEFAULT_LOCALE) {
    const path = '/' + segments.slice(2).join('/');
    return { locale: maybe, path: path === '/' ? '/' : path.replace(/\/$/, '') };
  }
  return { locale: DEFAULT_LOCALE, path: pathname === '/' ? '/' : pathname.replace(/\/$/, '') };
}

/**
 * hreflang alternates for a canonical path, ready to drop into a Metadata
 * `alternates` block. Includes a self-referencing canonical for the given
 * locale plus the full pl/en/ru + x-default language map.
 */
export function alternatesFor(path: string, locale: Locale) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[LOCALE_BCP47[l]] = localizedPath(path, l);
  }
  languages['x-default'] = localizedPath(path, DEFAULT_LOCALE);
  return {
    canonical: localizedPath(path, locale),
    languages,
  };
}

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
