import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Przewodnik KSeF',
    description:
      'Jak korzystać z Krajowego Systemu e-Faktur (KSeF) w eKsięgowy AI — wysyłka i odbiór e-faktur.',
  },
  en: {
    title: 'KSeF Guide',
    description:
      'How to use Poland’s National e-Invoicing System (KSeF) in eKsięgowy AI — sending and receiving e-invoices.',
  },
  ru: {
    title: 'Руководство по KSeF',
    description:
      'Как использовать Национальную систему электронных фактур (KSeF) в eKsięgowy AI — отправка и получение e-фактур.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/ksef', locale);
}

export default function GuideKsefLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
