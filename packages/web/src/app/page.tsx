'use client';

import { useAuth } from '@/contexts/AuthContext';
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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block">
          <svg
            className="animate-spin h-12 w-12 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
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
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <ChatContainer />;
  }

  return <LandingPage />;
}
