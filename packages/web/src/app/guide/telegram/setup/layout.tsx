import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jak skonfigurować bota Telegram',
  description:
    'Połącz konto Telegram z eKsięgowy AI i zacznij korzystać z czatu AI na telefonie — instrukcja krok po kroku.',
  alternates: { canonical: '/guide/telegram/setup' },
  openGraph: {
    title: 'Jak skonfigurować bota Telegram | eKsięgowy AI',
    url: '/guide/telegram/setup',
  },
};

export default function GuideTelegramSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
