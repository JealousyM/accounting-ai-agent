import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { CookieConsentBanner, CookiePreferencesModal } from '@/components/cookies';
import { GoogleAnalytics } from '@/components/analytics';

export const metadata: Metadata = {
  title: 'eKsięgowy AI',
  description: 'AI-powered accounting assistant for Polish businesses',
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
