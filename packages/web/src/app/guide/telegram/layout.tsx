import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bot Telegram',
  description:
    'Skonfiguruj bota Telegram eKsięgowy AI — czat z asystentem AI na telefonie i skanowanie paragonów.',
  alternates: { canonical: '/guide/telegram' },
  openGraph: { title: 'Bot Telegram | eKsięgowy AI', url: '/guide/telegram' },
};

export default function GuideTelegramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
