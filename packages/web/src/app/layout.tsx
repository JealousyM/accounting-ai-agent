import type { Metadata, Viewport } from 'next';
import './globals.css';
import {
  SITE_URL,
  SITE_NAME,
  ORGANIZATION_JSONLD,
  WEBSITE_JSONLD,
  alternatesFor,
  LOCALE_BCP47,
  LOCALES,
  type Locale,
} from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';
import { JsonLd } from '@/components/seo/JsonLd';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { CookieConsentBanner, CookiePreferencesModal } from '@/components/cookies';
import { GoogleAnalytics, MarketingAITracking } from '@/components/analytics';

/** Localized homepage metadata (title + descriptions) keyed by locale. */
const HOME_META: Record<Locale, { title: string; description: string; ogDescription: string }> = {
  pl: {
    title: 'eKsięgowy AI — Księgowość AI dla polskich firm',
    description:
      'Asystent księgowy oparty na AI dla polskich firm. Integruje się z wFirma, obsługuje e-faktury KSeF i odpowiada na pytania o VAT, PIT, CIT i ZUS.',
    ogDescription:
      'Twój inteligentny asystent księgowy zintegrowany z wFirma. Zapytaj o VAT, PIT, CIT, ZUS, faktury i więcej.',
  },
  en: {
    title: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    description:
      'AI-powered accounting assistant for Polish businesses. Integrates with wFirma, supports KSeF e-invoices, and answers your tax questions about VAT, PIT, CIT, and ZUS.',
    ogDescription:
      'Your intelligent accounting assistant that integrates with wFirma. Ask about VAT, PIT, CIT, ZUS, invoices, and more.',
  },
  ru: {
    title: 'eKsięgowy AI — ИИ-бухгалтерия для польского бизнеса',
    description:
      'ИИ-ассистент бухгалтера для польских компаний. Интеграция с wFirma, поддержка e-фактур KSeF, ответы на вопросы о VAT, PIT, CIT и ZUS.',
    ogDescription:
      'Ваш умный бухгалтерский ассистент с интеграцией wFirma. Спросите про VAT, PIT, CIT, ZUS, фактуры и многое другое.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const m = HOME_META[locale];

  return {
    title: {
      default: m.title,
      template: '%s | eKsięgowy AI',
    },
    description: m.description,
    keywords: [
      'accounting',
      'AI',
      'Poland',
      'wFirma',
      'KSeF',
      'VAT',
      'PIT',
      'CIT',
      'ZUS',
      'invoices',
      'eKsięgowy',
      'księgowość',
    ],
    authors: [{ name: 'MICODE sp. z o.o.' }],
    metadataBase: new URL(SITE_URL),
    alternates: alternatesFor('/', locale),
    openGraph: {
      type: 'website',
      locale: LOCALE_BCP47[locale].replace('-', '_'),
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) =>
        LOCALE_BCP47[l].replace('-', '_'),
      ),
      url: SITE_URL,
      siteName: SITE_NAME,
      title: m.title,
      description: m.ogDescription,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: m.title,
      description: m.ogDescription,
      images: ['/opengraph-image'],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
      apple: [{ url: '/logo.svg', type: 'image/svg+xml' }],
      shortcut: '/logo.svg',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var isDark = false;

      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system' || !theme) {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd data={ORGANIZATION_JSONLD} />
        <JsonLd data={WEBSITE_JSONLD} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <CookieConsentProvider>
              <GoogleAnalytics />
              <MarketingAITracking />
              <GoogleOAuthProvider>
                <AuthProvider>
                  <LocaleProvider initialLocale={locale}>
                    {children}
                    <CookieConsentBanner />
                    <CookiePreferencesModal />
                  </LocaleProvider>
                </AuthProvider>
              </GoogleOAuthProvider>
            </CookieConsentProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
