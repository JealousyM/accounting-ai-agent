import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Przewodnik',
    description:
      'Przewodniki krok po kroku, jak skonfigurować i korzystać z eKsięgowy AI — integracja z wFirma, KSeF i bot Telegram.',
  },
  en: {
    title: 'Guide',
    description:
      'Step-by-step guides on how to set up and use eKsięgowy AI — wFirma integration, KSeF and the Telegram bot.',
  },
  ru: {
    title: 'Руководство',
    description:
      'Пошаговые руководства по настройке и использованию eKsięgowy AI — интеграция с wFirma, KSeF и бот Telegram.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide', locale);
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
