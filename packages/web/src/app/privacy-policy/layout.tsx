import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polityka Prywatności',
  description: 'Polityka prywatności serwisu eKsięgowy AI — jak przetwarzamy Twoje dane.',
  alternates: { canonical: '/privacy-policy' },
  openGraph: { title: 'Polityka Prywatności | eKsięgowy AI', url: '/privacy-policy' },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
