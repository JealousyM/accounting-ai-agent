import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: {
    title: 'Cennik',
    description:
      'Wybierz plan eKsięgowy AI. Zacznij za darmo z własnym kluczem API lub przejdź na Pro, aby uzyskać kredyty AI w cenie i nielimitowany dostęp do wFirma.',
    ogDescription:
      'Prosty, przejrzysty cennik. Zacznij za darmo lub przejdź na Pro z kredytami AI w cenie.',
  },
  en: {
    title: 'Pricing',
    description:
      'Choose your eKsięgowy AI plan. Start free with your own API key, or go Pro for included AI credits and unlimited wFirma access.',
    ogDescription:
      'Simple, transparent pricing. Start free or go Pro with AI credits included.',
  },
  ru: {
    title: 'Тарифы',
    description:
      'Выберите тариф eKsięgowy AI. Начните бесплатно со своим ключом API или перейдите на Pro для AI-кредитов в комплекте и безлимитного доступа к wFirma.',
    ogDescription:
      'Простые и прозрачные тарифы. Начните бесплатно или перейдите на Pro с AI-кредитами в комплекте.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/pricing', locale);
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
