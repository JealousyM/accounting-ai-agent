import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jak uzyskać tokeny KSeF',
  description:
    'Wygeneruj token uwierzytelniający w portalu KSeF i podłącz go do eKsięgowy AI — instrukcja krok po kroku.',
  alternates: { canonical: '/guide/ksef/get-tokens' },
  openGraph: { title: 'Jak uzyskać tokeny KSeF | eKsięgowy AI', url: '/guide/ksef/get-tokens' },
};

export default function GuideKsefTokensLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
