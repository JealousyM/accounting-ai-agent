import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Produkty MICODE',
    description:
      'Narzędzia AI od MICODE sp. z o.o.: eKsięgowy AI dla księgowości firmowej i AI Budget dla budżetu domowego.',
    ogDescription: 'Poznaj rodzinę produktów MICODE — AI dla finansów firmy i domu.',
  },
  en: {
    title: 'MICODE products',
    description:
      'AI tools by MICODE sp. z o.o.: eKsięgowy AI for business accounting and AI Budget for household finances.',
    ogDescription: 'Meet the MICODE product family — AI for business and household finances.',
  },
  ru: {
    title: 'Продукты MICODE',
    description:
      'ИИ-инструменты MICODE sp. z o.o.: eKsięgowy AI для бухгалтерии бизнеса и AI Budget для домашнего бюджета.',
    ogDescription: 'Семейство продуктов MICODE — ИИ для финансов бизнеса и дома.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/products', locale);
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
