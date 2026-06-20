import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polityka Plików Cookie',
  description: 'Polityka plików cookie serwisu eKsięgowy AI.',
  alternates: { canonical: '/cookies' },
  openGraph: { title: 'Polityka Plików Cookie | eKsięgowy AI', url: '/cookies' },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
