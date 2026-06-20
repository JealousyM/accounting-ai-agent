import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Przewodnik',
  description:
    'Przewodniki krok po kroku, jak skonfigurować i korzystać z eKsięgowy AI — integracja z wFirma, KSeF i bot Telegram.',
  alternates: { canonical: '/guide' },
  openGraph: { title: 'Przewodnik | eKsięgowy AI', url: '/guide' },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
