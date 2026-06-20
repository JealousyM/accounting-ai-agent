import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Przewodnik KSeF',
  description:
    'Jak korzystać z Krajowego Systemu e-Faktur (KSeF) w eKsięgowy AI — wysyłka i odbiór e-faktur.',
  alternates: { canonical: '/guide/ksef' },
  openGraph: { title: 'Przewodnik KSeF | eKsięgowy AI', url: '/guide/ksef' },
};

export default function GuideKsefLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
