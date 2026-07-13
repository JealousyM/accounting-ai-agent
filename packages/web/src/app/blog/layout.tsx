import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';
import { LandingHeader, LandingFooter } from '@/components/landing';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Blog',
    description:
      'Poradnik dla przedsiębiorców: KSeF, VAT, ZUS, PIT i automatyzacja księgowości z asystentem AI.',
  },
  en: {
    title: 'Blog',
    description:
      'Guides for entrepreneurs: KSeF, VAT, ZUS, PIT and AI-driven accounting automation.',
  },
  ru: {
    title: 'Блог',
    description:
      'Гид для предпринимателей: KSeF, VAT, ZUS, PIT и автоматизация бухгалтерии с ИИ-ассистентом.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/blog', locale);
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <LandingHeader />
      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}
