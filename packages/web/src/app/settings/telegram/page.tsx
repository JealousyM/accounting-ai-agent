'use client';
import { useLocale } from '@/contexts/LocaleContext';
import { GuidePageLayout } from '@/components/guide';
import { TelegramSetupWizard } from '@/components/telegram/TelegramSetupWizard';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function TelegramSettingsPage() {
  const { locale } = useLocale();
  const t = translations[locale];
  const setup = t.telegramSetup;
  const guide = t.guide;

  return (
    <GuidePageLayout
      title={setup.title}
      summary={setup.subtitle}
      breadcrumbs={[
        { label: guide.breadcrumbHome, href: '/guide' },
        { label: setup.title },
      ]}
    >
      <TelegramSetupWizard translations={setup} />
    </GuidePageLayout>
  );
}
