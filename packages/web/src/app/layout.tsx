import type { Metadata } from 'next';
import './globals.css';
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
  metadataBase: new URL('https://eksiegowyai.pl'),
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    alternateLocale: ['en_US', 'ru_RU'],
    url: 'https://eksiegowyai.pl',
    siteName: 'eKsięgowy AI',
    title: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    description:
      'Your intelligent accounting assistant that integrates with wFirma. Ask about VAT, PIT, CIT, ZUS, invoices, and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eKsięgowy AI — AI Accounting for Polish Businesses',
    description:
      'Your intelligent accounting assistant that integrates with wFirma. Ask about VAT, PIT, CIT, ZUS, invoices, and more.',
  },
  robots: {
    index: true,
    follow: true,
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
