import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Jak uzyskać dane API wFirma',
    description:
      'Wygeneruj dane uwierzytelniające API w wFirma i wklej je do eKsięgowy AI — instrukcja krok po kroku.',
  },
  en: {
    title: 'How to Get wFirma API Credentials',
    description:
      'Generate API credentials in wFirma and paste them into eKsięgowy AI — a step-by-step guide.',
  },
  ru: {
    title: 'Как получить данные API wFirma',
    description:
      'Сгенерируйте учётные данные API в wFirma и вставьте их в eKsięgowy AI — пошаговая инструкция.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/wfirma/get-api-credentials', locale);
}

export default function GuideWfirmaCredentialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
