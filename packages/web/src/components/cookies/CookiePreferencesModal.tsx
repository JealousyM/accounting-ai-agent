'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { useLocale, Locale } from '@/contexts/LocaleContext';
import { Shield, BarChart2, Megaphone, Lock } from 'lucide-react';

interface CategoryTranslation {
  title: string;
  description: string;
}

interface ModalTranslations {
  preferencesTitle: string;
  preferencesDescription: string;
  acceptAll: string;
  rejectAll: string;
  savePreferences: string;
  alwaysActive: string;
  cookiePolicyLink: string;
  rodoLink: string;
  categories: {
    necessary: CategoryTranslation;
    analytics: CategoryTranslation;
    marketing: CategoryTranslation;
  };
}

const translations: Record<Locale, ModalTranslations> = {
  en: {
    preferencesTitle: 'Cookie Preferences',
    preferencesDescription:
      'Manage your cookie preferences below. You can enable or disable different types of cookies.',
    acceptAll: 'Accept All',
    rejectAll: 'Reject All',
    savePreferences: 'Save Preferences',
    alwaysActive: 'Always active',
    cookiePolicyLink: 'Cookie Policy',
    rodoLink: 'GDPR Clause',
    categories: {
      necessary: {
        title: 'Necessary Cookies',
        description:
          'These cookies are essential for the website to function properly. They enable basic features like page navigation and secure areas. The website cannot function without these cookies.',
      },
      analytics: {
        title: 'Analytics Cookies',
        description:
          'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our service.',
      },
      marketing: {
        title: 'Marketing Cookies',
        description:
          'These cookies are used to track visitors across websites. They are used to display ads that are relevant and engaging for individual users.',
      },
    },
  },
  pl: {
    preferencesTitle: 'Preferencje plik\u00f3w cookie',
    preferencesDescription:
      'Zarz\u0105dzaj swoimi preferencjami dotycz\u0105cymi plik\u00f3w cookie poni\u017cej. Mo\u017cesz w\u0142\u0105czy\u0107 lub wy\u0142\u0105czy\u0107 r\u00f3\u017cne typy cookies.',
    acceptAll: 'Akceptuj wszystkie',
    rejectAll: 'Odrzu\u0107 wszystkie',
    savePreferences: 'Zapisz preferencje',
    alwaysActive: 'Zawsze aktywne',
    cookiePolicyLink: 'Polityka Cookies',
    rodoLink: 'Klauzula RODO',
    categories: {
      necessary: {
        title: 'Niezb\u0119dne pliki cookie',
        description:
          'Te pliki cookie s\u0105 niezb\u0119dne do prawid\u0142owego funkcjonowania strony. Umo\u017cliwiaj\u0105 podstawowe funkcje, takie jak nawigacja i dost\u0119p do bezpiecznych obszar\u00f3w. Strona nie mo\u017ce dzia\u0142a\u0107 bez tych plik\u00f3w.',
      },
      analytics: {
        title: 'Analityczne pliki cookie',
        description:
          'Te pliki cookie pomagaj\u0105 nam zrozumie\u0107, w jaki spos\u00f3b odwiedzaj\u0105cy korzystaj\u0105 z naszej strony, zbieraj\u0105c i raportuj\u0105c informacje anonimowo. Pomaga nam to ulepsza\u0107 nasz\u0105 us\u0142ug\u0119.',
      },
      marketing: {
        title: 'Marketingowe pliki cookie',
        description:
          'Te pliki cookie s\u0142u\u017c\u0105 do \u015bledzenia odwiedzaj\u0105cych na r\u00f3\u017cnych stronach. S\u0105 u\u017cywane do wy\u015bwietlania reklam, kt\u00f3re s\u0105 istotne i anga\u017cuj\u0105ce dla poszczeg\u00f3lnych u\u017cytkownik\u00f3w.',
      },
    },
  },
  ru: {
    preferencesTitle: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0444\u0430\u0439\u043b\u043e\u0432 cookie',
    preferencesDescription:
      '\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0441\u0432\u043e\u0438\u043c\u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c\u0438 \u0444\u0430\u0439\u043b\u043e\u0432 cookie \u043d\u0438\u0436\u0435. \u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0438\u043b\u0438 \u043e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0440\u0430\u0437\u043b\u0438\u0447\u043d\u044b\u0435 \u0442\u0438\u043f\u044b cookies.',
    acceptAll: '\u041f\u0440\u0438\u043d\u044f\u0442\u044c \u0432\u0441\u0435',
    rejectAll: '\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c \u0432\u0441\u0435',
    savePreferences: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438',
    alwaysActive: '\u0412\u0441\u0435\u0433\u0434\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u044b',
    cookiePolicyLink: '\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 cookies',
    rodoLink: '\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f GDPR',
    categories: {
      necessary: {
        title: '\u041d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u044b\u0435 \u0444\u0430\u0439\u043b\u044b cookie',
        description:
          '\u042d\u0442\u0438 \u0444\u0430\u0439\u043b\u044b cookie \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u044b \u0434\u043b\u044f \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0439 \u0440\u0430\u0431\u043e\u0442\u044b \u0441\u0430\u0439\u0442\u0430. \u041e\u043d\u0438 \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0438\u0432\u0430\u044e\u0442 \u0431\u0430\u0437\u043e\u0432\u044b\u0435 \u0444\u0443\u043d\u043a\u0446\u0438\u0438, \u0442\u0430\u043a\u0438\u0435 \u043a\u0430\u043a \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f \u043f\u043e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430\u043c \u0438 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u043d\u044b\u043c \u043e\u0431\u043b\u0430\u0441\u0442\u044f\u043c. \u0421\u0430\u0439\u0442 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0431\u0435\u0437 \u044d\u0442\u0438\u0445 \u0444\u0430\u0439\u043b\u043e\u0432.',
      },
      analytics: {
        title: '\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0444\u0430\u0439\u043b\u044b cookie',
        description:
          '\u042d\u0442\u0438 \u0444\u0430\u0439\u043b\u044b cookie \u043f\u043e\u043c\u043e\u0433\u0430\u044e\u0442 \u043d\u0430\u043c \u043f\u043e\u043d\u044f\u0442\u044c, \u043a\u0430\u043a \u043f\u043e\u0441\u0435\u0442\u0438\u0442\u0435\u043b\u0438 \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044e\u0442 \u0441 \u043d\u0430\u0448\u0438\u043c \u0441\u0430\u0439\u0442\u043e\u043c, \u0441\u043e\u0431\u0438\u0440\u0430\u044f \u0438 \u0441\u043e\u043e\u0431\u0449\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044e \u0430\u043d\u043e\u043d\u0438\u043c\u043d\u043e. \u042d\u0442\u043e \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u043d\u0430\u043c \u0443\u043b\u0443\u0447\u0448\u0430\u0442\u044c \u043d\u0430\u0448 \u0441\u0435\u0440\u0432\u0438\u0441.',
      },
      marketing: {
        title: '\u041c\u0430\u0440\u043a\u0435\u0442\u0438\u043d\u0433\u043e\u0432\u044b\u0435 \u0444\u0430\u0439\u043b\u044b cookie',
        description:
          '\u042d\u0442\u0438 \u0444\u0430\u0439\u043b\u044b cookie \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f \u0434\u043b\u044f \u043e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u043f\u043e\u0441\u0435\u0442\u0438\u0442\u0435\u043b\u0435\u0439 \u043d\u0430 \u0440\u0430\u0437\u043d\u044b\u0445 \u0441\u0430\u0439\u0442\u0430\u0445. \u041e\u043d\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f \u0434\u043b\u044f \u043f\u043e\u043a\u0430\u0437\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u044b, \u043a\u043e\u0442\u043e\u0440\u0430\u044f \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0430 \u0438 \u0438\u043d\u0442\u0435\u0440\u0435\u0441\u043d\u0430 \u0434\u043b\u044f \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439.',
      },
    },
  },
};

interface CookieCategoryProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  alwaysActiveLabel?: string;
  onChange?: (checked: boolean) => void;
}

function CookieCategory({
  icon,
  title,
  description,
  checked,
  disabled,
  alwaysActiveLabel,
  onChange,
}: CookieCategoryProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg',
        'border border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full',
              'transition-colors duration-200 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'dark:focus:ring-offset-gray-900',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full',
                'bg-white shadow-lg transform ring-0',
                'transition duration-200 ease-in-out',
                checked ? 'translate-x-5' : 'translate-x-0.5',
                'mt-0.5'
              )}
            />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        {disabled && alwaysActiveLabel && (
          <span className="inline-flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            <Lock className="h-3 w-3 mr-1" />
            {alwaysActiveLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function CookiePreferencesModal() {
  const { state, isPreferencesOpen, closePreferences, savePreferences, acceptAll, rejectAll } =
    useCookieConsent();
  const { locale } = useLocale();
  const t = translations[locale];

  const [analytics, setAnalytics] = useState(state.preferences.analytics);
  const [marketing, setMarketing] = useState(state.preferences.marketing);

  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalytics(state.preferences.analytics);
      setMarketing(state.preferences.marketing);
    }
  }, [isPreferencesOpen, state.preferences]);

  const handleSave = () => {
    savePreferences({ analytics, marketing });
  };

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.preferencesTitle}</DialogTitle>
          <DialogDescription>{t.preferencesDescription}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <CookieCategory
            icon={<Shield className="h-5 w-5 text-green-600 dark:text-green-400" />}
            title={t.categories.necessary.title}
            description={t.categories.necessary.description}
            checked={true}
            disabled={true}
            alwaysActiveLabel={t.alwaysActive}
          />

          <CookieCategory
            icon={<BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            title={t.categories.analytics.title}
            description={t.categories.analytics.description}
            checked={analytics}
            onChange={setAnalytics}
          />

          <CookieCategory
            icon={<Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            title={t.categories.marketing.title}
            description={t.categories.marketing.description}
            checked={marketing}
            onChange={setMarketing}
          />

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            <a
              href="/cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t.cookiePolicyLink}
            </a>
            {' · '}
            <a
              href="/rodo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t.rodoLink}
            </a>
          </p>
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={rejectAll} className="w-full sm:w-auto">
            {t.rejectAll}
          </Button>
          <Button variant="outline" onClick={acceptAll} className="w-full sm:w-auto">
            {t.acceptAll}
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            {t.savePreferences}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
