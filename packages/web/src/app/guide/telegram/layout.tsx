import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Bot Telegram',
    description:
      'Skonfiguruj bota Telegram eKsięgowy AI — czat z asystentem AI na telefonie i skanowanie paragonów.',
  },
  en: {
    title: 'Telegram Bot',
    description:
      'Set up the eKsięgowy AI Telegram bot — chat with the AI assistant on your phone and scan receipts.',
  },
  ru: {
    title: 'Бот Telegram',
    description:
      'Настройте Telegram-бота eKsięgowy AI — общайтесь с ИИ-ассистентом на телефоне и сканируйте чеки.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/telegram', locale);
}

export default function GuideTelegramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
