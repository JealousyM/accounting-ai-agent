import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Jak skonfigurować bota Telegram',
    description:
      'Połącz konto Telegram z eKsięgowy AI i zacznij korzystać z czatu AI na telefonie — instrukcja krok po kroku.',
  },
  en: {
    title: 'How to Set Up the Telegram Bot',
    description:
      'Link your Telegram account to eKsięgowy AI and start using AI chat on your phone — a step-by-step guide.',
  },
  ru: {
    title: 'Как настроить бота Telegram',
    description:
      'Привяжите аккаунт Telegram к eKsięgowy AI и начните пользоваться ИИ-чатом на телефоне — пошаговая инструкция.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/telegram/setup', locale);
}

export default function GuideTelegramSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
