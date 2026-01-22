'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { useLocale, Locale } from '@/contexts/LocaleContext';
import { Shield, Settings } from 'lucide-react';

const translations: Record<Locale, {
  title: string;
  description: string;
  privacyPolicyLink: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
}> = {
  en: {
    title: 'We value your privacy',
    description: 'We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
    privacyPolicyLink: 'Learn more in our Privacy Policy',
    acceptAll: 'Accept All',
    rejectAll: 'Reject All',
    customize: 'Customize',
  },
  pl: {
    title: 'Cenimy Twoj\u0105 prywatno\u015b\u0107',
    description: 'U\u017cywamy plik\u00f3w cookie, aby ulepszy\u0107 przegl\u0105danie i analizowa\u0107 ruch. Klikaj\u0105c "Akceptuj wszystkie", wyra\u017casz zgod\u0119 na u\u017cywanie plik\u00f3w cookie.',
    privacyPolicyLink: 'Dowiedz si\u0119 wi\u0119cej w naszej Polityce Prywatno\u015bci',
    acceptAll: 'Akceptuj wszystkie',
    rejectAll: 'Odrzu\u0107 wszystkie',
    customize: 'Dostosuj',
  },
  ru: {
    title: '\u041c\u044b \u0446\u0435\u043d\u0438\u043c \u0432\u0430\u0448\u0443 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
    description: '\u041c\u044b \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u043c \u0444\u0430\u0439\u043b\u044b cookie \u0434\u043b\u044f \u0443\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u0438 \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u0442\u0440\u0430\u0444\u0438\u043a\u0430. \u041d\u0430\u0436\u0438\u043c\u0430\u044f "\u041f\u0440\u0438\u043d\u044f\u0442\u044c \u0432\u0441\u0435", \u0432\u044b \u0441\u043e\u0433\u043b\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044c \u043d\u0430 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0435 \u0444\u0430\u0439\u043b\u043e\u0432 cookie.',
    privacyPolicyLink: '\u0423\u0437\u043d\u0430\u0439\u0442\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 \u0432 \u043d\u0430\u0448\u0435\u0439 \u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0435 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438',
    acceptAll: '\u041f\u0440\u0438\u043d\u044f\u0442\u044c \u0432\u0441\u0435',
    rejectAll: '\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c \u0432\u0441\u0435',
    customize: '\u041d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c',
  },
};

export function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectAll, openPreferences } = useCookieConsent();
  const { locale } = useLocale();
  const t = translations[locale];

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white dark:bg-gray-800',
        'border-t border-gray-200 dark:border-gray-700',
        'shadow-lg'
      )}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2
                id="cookie-banner-title"
                className="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                {t.title}
              </h2>
              <p
                id="cookie-banner-description"
                className="mt-1 text-sm text-gray-600 dark:text-gray-400"
              >
                {t.description}{' '}
                <a
                  href="/privacy-policy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t.privacyPolicyLink}
                </a>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={openPreferences}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {t.customize}
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll}>
              {t.rejectAll}
            </Button>
            <Button variant="default" size="sm" onClick={acceptAll}>
              {t.acceptAll}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
