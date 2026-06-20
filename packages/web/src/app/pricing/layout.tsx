import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cennik',
  description:
    'Wybierz plan eKsięgowy AI. Zacznij za darmo z własnym kluczem API lub przejdź na Pro, aby uzyskać kredyty AI w cenie i nielimitowany dostęp do wFirma.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Cennik | eKsięgowy AI',
    description:
      'Prosty, przejrzysty cennik. Zacznij za darmo lub przejdź na Pro z kredytami AI w cenie.',
    url: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
