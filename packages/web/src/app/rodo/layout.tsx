import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klauzula Informacyjna RODO',
  description:
    'Klauzula informacyjna RODO (art. 13 i 14 RODO) serwisu eKsięgowy AI — informacje o przetwarzaniu danych osobowych.',
  alternates: { canonical: '/rodo' },
  openGraph: { title: 'Klauzula Informacyjna RODO | eKsięgowy AI', url: '/rodo' },
};

export default function RodoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
