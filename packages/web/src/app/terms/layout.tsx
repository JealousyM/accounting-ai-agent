import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Regulamin',
    description: 'Regulamin świadczenia usług serwisu eKsięgowy AI.',
  },
  en: {
    title: 'Terms of Service',
    description: 'Terms of service for the eKsięgowy AI platform.',
  },
  ru: {
    title: 'Условия использования',
    description: 'Условия предоставления услуг сервиса eKsięgowy AI.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/terms', locale);
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
