import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_URL, SITE_NAME, ORGANIZATION_JSONLD, WEBSITE_JSONLD } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { CookieConsentBanner, CookiePreferencesModal } from '@/components/cookies';
import { GoogleAnalytics, MarketingAITracking } from '@/components/analytics';

export const metadata: Metadata = {
  title: {
    default: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    template: '%s | eKsięgowy AI',
  },
  description:
    'AI-powered accounting assistant for Polish businesses. Integrates with wFirma, supports KSeF e-invoices, and answers your tax questions about VAT, PIT, CIT, and ZUS.',
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
  alternates: {
    canonical: '/',
    languages: {
      'pl-PL': '/',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    alternateLocale: ['en_US', 'ru_RU'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    description:
      'Your intelligent accounting assistant that integrates with wFirma. Ask about VAT, PIT, CIT, ZUS, invoices, and more.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    description:
      'Your intelligent accounting assistant that integrates with wFirma. Ask about VAT, PIT, CIT, ZUS, invoices, and more.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logo.svg',
  },
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
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
                  <LocaleProvider>
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
