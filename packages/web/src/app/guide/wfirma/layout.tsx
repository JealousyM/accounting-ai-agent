import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Integracja z wFirma',
    description:
      'Połącz eKsięgowy AI ze swoim kontem wFirma i zarządzaj fakturami oraz kontrahentami przez AI.',
  },
  en: {
    title: 'wFirma Integration',
    description:
      'Connect eKsięgowy AI to your wFirma account and manage invoices and contractors through AI.',
  },
  ru: {
    title: 'Интеграция с wFirma',
    description:
      'Подключите eKsięgowy AI к своему аккаунту wFirma и управляйте фактурами и контрагентами через ИИ.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/guide/wfirma', locale);
}

export default function GuideWfirmaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
