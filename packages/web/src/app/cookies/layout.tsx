import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Polityka Plików Cookie',
    description: 'Polityka plików cookie serwisu eKsięgowy AI.',
  },
  en: {
    title: 'Cookie Policy',
    description: 'Cookie policy of the eKsięgowy AI platform.',
  },
  ru: {
    title: 'Политика использования cookie',
    description: 'Политика использования файлов cookie сервиса eKsięgowy AI.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/cookies', locale);
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
