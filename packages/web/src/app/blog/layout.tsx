import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';
import { LocaleLink } from '@/components/LocaleLink';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <LocaleLink
            href="/"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← eKsięgowy AI
          </LocaleLink>
        </div>
      </header>
      {children}
    </div>
  );
}
