import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integracja z wFirma',
  description:
    'Połącz eKsięgowy AI ze swoim kontem wFirma i zarządzaj fakturami oraz kontrahentami przez AI.',
  alternates: { canonical: '/guide/wfirma' },
  openGraph: { title: 'Integracja z wFirma | eKsięgowy AI', url: '/guide/wfirma' },
};

export default function GuideWfirmaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
