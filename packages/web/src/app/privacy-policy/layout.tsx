import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Polityka Prywatności',
    description: 'Polityka prywatności serwisu eKsięgowy AI — jak przetwarzamy Twoje dane.',
  },
  en: {
    title: 'Privacy Policy',
    description: 'Privacy policy of the eKsięgowy AI platform — how we process your data.',
  },
  ru: {
    title: 'Политика конфиденциальности',
    description: 'Политика конфиденциальности сервиса eKsięgowy AI — как мы обрабатываем ваши данные.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/privacy-policy', locale);
}

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
