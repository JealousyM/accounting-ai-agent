import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Crown, Zap } from 'lucide-react';

// Static stories - CurrentPlanBadge component requires hook mocking which is not available in Storybook with Vite
// These stories showcase the UI design without live data

// Static badge components for stories
const FreePlanBadge = ({ showUpgradeLink = true, className = '' }: { showUpgradeLink?: boolean; className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
      <Zap className="w-3 h-3 mr-1" />
      Free
    </span>
    {showUpgradeLink && (
      <a href="/pricing" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
        Upgrade
      </a>
    )}
  </div>
);

const ProPlanBadge = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
      <Crown className="w-3 h-3 mr-1" />
      Pro
    </span>
  </div>
);

const meta: Meta = {
  title: 'Subscription/CurrentPlanBadge',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Default - Free plan with upgrade link
export const Default: Story = {
  render: () => <FreePlanBadge showUpgradeLink={true} />,
};

// Free plan without upgrade link
export const FreePlanNoUpgradeLink: Story = {
  render: () => <FreePlanBadge showUpgradeLink={false} />,
};

// With custom className
export const WithCustomClass: Story = {
  render: () => <FreePlanBadge showUpgradeLink={true} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2" />,
};

// Pro plan view
export const ProPlanView: Story = {
  render: () => <ProPlanBadge />,
  parameters: {
    docs: {
      description: {
        story: 'Pro badge with Crown icon displayed for Pro users.',
      },
    },
  },
};

// Loading state - shows nothing
export const LoadingState: Story = {
  render: () => <div className="text-sm text-gray-500 italic">Loading state renders nothing</div>,
  parameters: {
    docs: {
      description: {
        story: 'When isLoading is true or subscription is null, the component returns null (renders nothing).',
      },
    },
  },
};

// In context - Header usage
export const InHeader: Story = {
  render: () => (
    <div className="flex items-center justify-between w-96 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">JD</span>
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">John Doe</span>
      </div>
      <FreePlanBadge showUpgradeLink={true} />
    </div>
  ),
};

// In context - Sidebar usage
export const InSidebar: Story = {
  render: () => (
    <div className="w-64 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">JD</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">John Doe</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Plan</p>
          <FreePlanBadge showUpgradeLink={true} />
        </div>
      </div>
    </div>
  ),
};

// In context - Settings page
export const InSettingsPage: Story = {
  render: () => (
    <div className="w-96 p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription</h3>
      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">Current Plan</span>
        <FreePlanBadge showUpgradeLink={true} />
      </div>
      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">Billing Cycle</span>
        <span className="text-sm text-gray-900 dark:text-white">Monthly</span>
      </div>
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">Next Billing Date</span>
        <span className="text-sm text-gray-900 dark:text-white">Feb 28, 2026</span>
      </div>
    </div>
  ),
};

// Dark mode comparison
export const DarkModeComparison: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-sm font-medium mb-4 text-gray-900">Light Mode</h3>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Free Plan</p>
            <FreePlanBadge showUpgradeLink={true} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Without Upgrade Link</p>
            <FreePlanBadge showUpgradeLink={false} />
          </div>
        </div>
      </div>
      <div className="bg-gray-900 p-6 rounded-lg dark">
        <h3 className="text-sm font-medium mb-4 text-white">Dark Mode</h3>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-2">Free Plan</p>
            <FreePlanBadge showUpgradeLink={true} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Without Upgrade Link</p>
            <FreePlanBadge showUpgradeLink={false} />
          </div>
        </div>
      </div>
    </div>
  ),
};

// All variants overview
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Free Plan with Upgrade Link
        </h4>
        <FreePlanBadge showUpgradeLink={true} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Free Plan without Upgrade Link
        </h4>
        <FreePlanBadge showUpgradeLink={false} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          With Custom Styling
        </h4>
        <FreePlanBadge
          showUpgradeLink={true}
          className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg"
        />
      </div>
    </div>
  ),
};
