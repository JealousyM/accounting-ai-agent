import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Jak uzyskać tokeny KSeF',
    description:
      'Wygeneruj token uwierzytelniający w portalu KSeF i podłącz go do eKsięgowy AI — instrukcja krok po kroku.',
  },
  en: {
    title: 'How to Get KSeF Tokens',
    description:
      'Generate an authentication token in the KSeF portal and connect it to eKsięgowy AI — a step-by-step guide.',
  },
  ru: {
    title: 'Как получить токены KSeF',
    description:
      'Сгенерируйте токен аутентификации в портале KSeF и подключите его к eKsięgowy AI — пошаговая инструкция.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/ksef/get-tokens', locale);
}

export default function GuideKsefTokensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
