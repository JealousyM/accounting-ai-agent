'use client';

import { useAuth } from '@/contexts/AuthContext';
import { JsonLd } from '@/components/seo/JsonLd';
import { SOFTWARE_APPLICATION_JSONLD } from '@/lib/seo';
import { ChatContainer } from '@/components/chat';
import {
  LandingHeader,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingPreviewSection,
  CTASection,
  LandingFooter,
} from '@/components/landing';

function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <JsonLd data={SOFTWARE_APPLICATION_JSONLD} />
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingPreviewSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();

  // Authenticated users get the app shell. Everyone else (including the
  // initial loading state and all crawlers, which never authenticate) gets the
  // landing page — so the marketing content + JSON-LD are in the server HTML
  // instead of being hidden behind a client-side auth gate.
  if (isAuthenticated) {
    return <ChatContainer />;
  }

  return <LandingPage />;
}
