import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Regulamin',
  description: 'Regulamin świadczenia usług serwisu eKsięgowy AI.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Regulamin | eKsięgowy AI', url: '/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
