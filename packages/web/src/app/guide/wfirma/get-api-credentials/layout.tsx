import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jak uzyskać dane API wFirma',
  description:
    'Wygeneruj dane uwierzytelniające API w wFirma i wklej je do eKsięgowy AI — instrukcja krok po kroku.',
  alternates: { canonical: '/guide/wfirma/get-api-credentials' },
  openGraph: {
    title: 'Jak uzyskać dane API wFirma | eKsięgowy AI',
    url: '/guide/wfirma/get-api-credentials',
  },
};

export default function GuideWfirmaCredentialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
