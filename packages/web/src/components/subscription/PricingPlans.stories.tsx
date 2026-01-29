import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Check, Loader2, Crown, Zap } from 'lucide-react';

// Static stories - PricingPlans component requires hook mocking which is not available in Storybook with Vite
// These stories showcase the UI design without live data

// Static pricing plan card component
const PlanCard = ({
  name,
  price,
  period,
  features,
  isCurrent,
  isPro,
  isCheckingOut,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent?: boolean;
  isPro?: boolean;
  isCheckingOut?: boolean;
}) => (
  <div
    className={`relative rounded-2xl border p-8 ${
      isPro
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}
  >
    {isPro && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
          Popular
        </span>
      </div>
    )}
    <div className="text-center mb-6">
      <div className="flex items-center justify-center gap-2 mb-2">
        {isPro ? (
          <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h3>
      </div>
      <div className="mt-4">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">{price}</span>
        <span className="text-gray-500 dark:text-gray-400">/{period}</span>
      </div>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
        </li>
      ))}
    </ul>
    <button
      disabled={isCurrent || isCheckingOut}
      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
        isCurrent
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          : isPro
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
      }`}
    >
      {isCheckingOut ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </span>
      ) : isCurrent ? (
        'Current Plan'
      ) : (
        'Get Started'
      )}
    </button>
  </div>
);

// Static pricing plans component
const StaticPricingPlans = ({
  showHeader = true,
  currentPlan = 'free',
  isCheckingOut = false,
}: {
  showHeader?: boolean;
  currentPlan?: 'free' | 'pro';
  isCheckingOut?: boolean;
}) => (
  <div className="py-12 px-4">
    {showHeader && (
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Select the plan that best fits your accounting needs. Upgrade anytime to unlock more features.
        </p>
      </div>
    )}
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      <PlanCard
        name="Free"
        price="0 PLN"
        period="month"
        features={[
          'Basic AI chat assistance',
          '10 conversations per month',
          'Standard response time',
          'Community support',
        ]}
        isCurrent={currentPlan === 'free'}
      />
      <PlanCard
        name="Pro"
        price="49 PLN"
        period="month"
        features={[
          'Unlimited AI conversations',
          'Priority response time',
          'wFirma integration',
          'Document analysis',
          'Invoice automation',
          'Priority email support',
        ]}
        isPro
        isCurrent={currentPlan === 'pro'}
        isCheckingOut={isCheckingOut && currentPlan === 'free'}
      />
    </div>
  </div>
);

const meta: Meta = {
  title: 'Subscription/PricingPlans',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Default view with header
export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={true} />
    </div>
  ),
};

// Without header (for embedding in other pages)
export const WithoutHeader: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={false} />
    </div>
  ),
};

// Loading state showcase
export const LoadingState: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'When isLoading is true, a centered spinner is displayed.',
      },
    },
  },
};

// Pro user view
export const ProUserView: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={true} currentPlan="pro" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'When the user has a Pro subscription, the Pro plan shows "Current Plan" instead of the upgrade button.',
      },
    },
  },
};

// Checkout in progress
export const CheckoutInProgress: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={true} isCheckingOut={true} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'When isCheckingOut is true, the upgrade button shows a loading spinner with "Processing..." text.',
      },
    },
  },
};

// Dark mode comparison
export const DarkModeComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium p-4 text-gray-900 border-b">Light Mode</h3>
        <StaticPricingPlans showHeader={false} />
      </div>
      <div className="bg-gray-900 rounded-lg dark">
        <h3 className="text-sm font-medium p-4 text-white border-b border-gray-700">Dark Mode</h3>
        <StaticPricingPlans showHeader={false} />
      </div>
    </div>
  ),
};

// Embedded in page context
export const EmbeddedInPage: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade Your Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a plan that works best for your accounting needs.
          </p>
        </div>
        <StaticPricingPlans showHeader={false} />
      </div>
    </div>
  ),
};

// Mobile viewport
export const MobileView: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={true} />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// Tablet viewport
export const TabletView: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StaticPricingPlans showHeader={true} />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
