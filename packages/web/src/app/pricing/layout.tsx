import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Choose your eKsięgowy AI plan. Start free with your own API key or upgrade to Pro for included AI credits and unlimited wFirma access.',
  openGraph: {
    title: 'Pricing | eKsięgowy AI',
    description:
      'Simple, transparent pricing. Start free or upgrade to Pro for included AI credits.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
