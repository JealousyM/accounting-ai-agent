import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Klauzula Informacyjna RODO',
    description:
      'Klauzula informacyjna RODO (art. 13 i 14 RODO) serwisu eKsięgowy AI — informacje o przetwarzaniu danych osobowych.',
  },
  en: {
    title: 'GDPR Information Notice',
    description:
      'GDPR information notice (Art. 13 and 14 GDPR) of the eKsięgowy AI platform — information on personal data processing.',
  },
  ru: {
    title: 'Информация об обработке данных (GDPR/RODO)',
    description:
      'Информационная оговорка GDPR/RODO (ст. 13 и 14) сервиса eKsięgowy AI — сведения об обработке персональных данных.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/rodo', locale);
}

export default function RodoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
