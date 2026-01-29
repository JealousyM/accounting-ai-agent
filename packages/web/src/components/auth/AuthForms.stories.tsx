import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Eye, EyeOff, Check, X, Github, Globe, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Static preview stories for auth forms.
 * These showcase the form layouts without the complex hook dependencies.
 */
const meta = {
  title: 'Auth/AuthForms',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Password requirement item component
const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2">
    <div
      className={`flex items-center justify-center h-4 w-4 rounded-full ${
        met ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      {met && <Check className="h-3 w-3 text-white" />}
    </div>
    <span className={`text-xs ${met ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
      {text}
    </span>
  </div>
);

/**
 * Login Form Preview
 * Static preview of the login form layout using the same Tailwind classes from LoginForm.tsx
 */
export const LoginFormPreview: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to continue to your account
        </p>
      </div>

      {/* Social Auth Buttons */}
      <div className="space-y-3 mb-6">
        <Button type="button" variant="outline" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>

        <Button type="button" variant="outline" className="w-full">
          <Github className="w-5 h-5 mr-2" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            or continue with email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder="name@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <a
            href="#"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <Button type="button" className="w-full">
          Sign In
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <a
          href="#"
          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          Register
        </a>
      </p>

      {/* App Version */}
      <div className="mt-8 text-center">
        <span className="text-xs text-gray-400 dark:text-gray-500">v1.0.0</span>
      </div>
    </div>
  ),
};

/**
 * Login Form with Error State
 */
export const LoginFormWithError: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to continue to your account
        </p>
      </div>

      {/* API Error */}
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
          <X className="h-5 w-5" />
          <p className="text-sm font-medium">Invalid email or password</p>
        </div>
      </div>

      {/* Social Auth Buttons */}
      <div className="space-y-3 mb-6">
        <Button type="button" variant="outline" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            or continue with email
          </span>
        </div>
      </div>

      {/* Login Form with errors */}
      <form className="space-y-5">
        <div>
          <label htmlFor="error-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email
          </label>
          <Input
            id="error-email"
            type="email"
            defaultValue="invalid@"
            error
          />
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Invalid email format</p>
        </div>

        <div>
          <label htmlFor="error-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Input
              id="error-password"
              type="password"
              error
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Password is required</p>
        </div>

        <Button type="button" className="w-full">
          Sign In
        </Button>
      </form>
    </div>
  ),
};

/**
 * Registration Form Preview
 * Static preview of the registration form layout using the same Tailwind classes from RegistrationForm.tsx
 */
export const RegistrationFormPreview: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
      {/* Language Selector */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
          >
            <Globe className="h-4 w-4" />
            English
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <Globe className="h-4 w-4" />
            Polski
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create account</h1>
        <p className="text-gray-600 dark:text-gray-400">Get started with your free account</p>
      </div>

      {/* Social Auth Buttons */}
      <div className="space-y-3 mb-6">
        <Button type="button" variant="outline" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>

        <Button type="button" variant="outline" className="w-full">
          <Github className="w-5 h-5 mr-2" />
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or continue with email</span>
        </div>
      </div>

      {/* Registration Form */}
      <form className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email
          </label>
          <Input
            id="reg-email"
            type="email"
            placeholder="name@example.com"
          />
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              First Name
            </label>
            <Input
              id="reg-firstName"
              type="text"
              placeholder="John"
            />
          </div>

          <div>
            <label htmlFor="reg-lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Last Name
            </label>
            <Input
              id="reg-lastName"
              type="text"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="reg-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company Name
          </label>
          <Input
            id="reg-company"
            type="text"
            placeholder="Your company (optional)"
          />
        </div>

        {/* Subscription Plan Selection */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-5">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Choose your plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Plan */}
            <label className="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <input type="radio" className="sr-only" defaultChecked />
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Free</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">$0</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>- Use your own API key</li>
                <li>- Unlimited conversations</li>
                <li>- wFirma integration</li>
              </ul>
            </label>

            {/* Pro Plan */}
            <label className="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500">
              <input type="radio" className="sr-only" />
              <div className="absolute top-2 right-2">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white">Pro</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                $29<span className="text-sm font-normal text-gray-500">/month</span>
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>- AI credits included</li>
                <li>- Or use your own key</li>
                <li>- wFirma integration</li>
              </ul>
            </label>
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Input
              id="reg-password"
              type="password"
              placeholder="Create a password"
              defaultValue="Password123"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>

          {/* Password Requirements */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password Requirements:
            </p>
            <div className="space-y-1">
              <RequirementItem met={true} text="At least 8 characters" />
              <RequirementItem met={true} text="One uppercase letter" />
              <RequirementItem met={true} text="One lowercase letter" />
              <RequirementItem met={true} text="One number" />
              <RequirementItem met={false} text="One special character (!@#$%^&*)" />
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="reg-confirm"
              type="password"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div>
          <div className="flex items-start gap-2">
            <input
              id="reg-terms"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              defaultChecked
            />
            <label htmlFor="reg-terms" className="text-sm text-gray-700 dark:text-gray-300">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                Privacy Policy
              </a>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <Button type="button" className="w-full">
          Create Account
        </Button>
      </form>

      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <a
          href="#"
          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          Sign In
        </a>
      </p>

      {/* App Version */}
      <div className="mt-8 text-center">
        <span className="text-xs text-gray-400 dark:text-gray-500">v1.0.0</span>
      </div>
    </div>
  ),
};

/**
 * Registration Form with Pro Plan Selected
 * Shows the billing period toggle that appears when Pro is selected
 */
export const RegistrationFormWithProPlan: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create account</h1>
        <p className="text-gray-600 dark:text-gray-400">Get started with your account</p>
      </div>

      <form className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="pro-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email
          </label>
          <Input
            id="pro-email"
            type="email"
            defaultValue="user@company.com"
          />
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pro-firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              First Name
            </label>
            <Input id="pro-firstName" type="text" defaultValue="John" />
          </div>
          <div>
            <label htmlFor="pro-lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Last Name
            </label>
            <Input id="pro-lastName" type="text" defaultValue="Doe" />
          </div>
        </div>

        {/* Subscription Plan Selection */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-5">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Choose your plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Plan - Not selected */}
            <label className="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500">
              <input type="radio" className="sr-only" />
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Free</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">$0</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>- Use your own API key</li>
                <li>- Unlimited conversations</li>
                <li>- wFirma integration</li>
              </ul>
            </label>

            {/* Pro Plan - Selected */}
            <label className="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <input type="radio" className="sr-only" defaultChecked />
              <div className="absolute top-2 right-2">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white">Pro</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                $29<span className="text-sm font-normal text-gray-500">/month</span>
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>- AI credits included</li>
                <li>- Or use your own key</li>
                <li>- wFirma integration</li>
              </ul>
            </label>
          </div>

          {/* Billing Period Selector - shown when Pro is selected */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Billing Period
            </label>
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg grid grid-cols-2 gap-1">
              <button
                type="button"
                className="px-4 py-3 text-sm font-medium rounded-md transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              >
                <div className="text-left">
                  <div className="font-semibold">Monthly</div>
                  <div className="text-xs opacity-75 mt-0.5">$29/month</div>
                </div>
              </button>
              <button
                type="button"
                className="px-4 py-3 text-sm font-medium rounded-md transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="text-left">
                  <div className="font-semibold">
                    Yearly
                    <span className="ml-1 text-green-600 dark:text-green-500 text-xs font-normal">
                      Save 17%
                    </span>
                  </div>
                  <div className="text-xs opacity-75 mt-0.5">$290/year</div>
                </div>
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            You will be redirected to complete payment after registration.
          </p>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="pro-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Input id="pro-password" type="password" placeholder="Create a password" />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-2">
          <input
            id="pro-terms"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            defaultChecked
          />
          <label htmlFor="pro-terms" className="text-sm text-gray-700 dark:text-gray-300">
            I agree to the{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Privacy Policy
            </a>
          </label>
        </div>

        {/* Submit Button */}
        <Button type="button" className="w-full">
          Create Account
        </Button>
      </form>
    </div>
  ),
};

/**
 * Dark Mode Comparison
 * Shows both login and registration forms in light and dark modes side by side
 */
export const DarkModeComparison: Story = {
  render: () => (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Light Mode */}
      <div className="bg-gray-100 p-6 rounded-xl">
        <h2 className="text-lg font-semibold mb-6 text-gray-900">Light Mode</h2>

        {/* Login Form - Light */}
        <div className="w-80 bg-white p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome back</h3>

          <Button type="button" variant="outline" className="w-full mb-4">
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input type="email" placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <Input type="password" placeholder="Enter password" />
            </div>
            <Button type="button" className="w-full">Sign In</Button>
          </div>
        </div>

        {/* Plan Cards - Light */}
        <div className="w-80 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Choose Plan</h3>
          <div className="space-y-3">
            <div className="p-3 border-2 border-blue-500 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-900">Free</span>
              </div>
              <p className="text-lg font-bold text-gray-900">$0</p>
            </div>
            <div className="p-3 border-2 border-gray-300 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">Pro</span>
              </div>
              <p className="text-lg font-bold text-gray-900">$29<span className="text-sm font-normal text-gray-500">/mo</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Dark Mode */}
      <div className="bg-gray-800 p-6 rounded-xl dark">
        <h2 className="text-lg font-semibold mb-6 text-white">Dark Mode</h2>

        {/* Login Form - Dark */}
        <div className="w-80 bg-gray-900 p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-gray-100 mb-4">Welcome back</h3>

          <Button type="button" variant="outline" className="w-full mb-4">
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-400">or</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <Input type="email" placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <Input type="password" placeholder="Enter password" />
            </div>
            <Button type="button" className="w-full">Sign In</Button>
          </div>
        </div>

        {/* Plan Cards - Dark */}
        <div className="w-80 bg-gray-900 p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-100 mb-4">Choose Plan</h3>
          <div className="space-y-3">
            <div className="p-3 border-2 border-blue-500 bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-white">Free</span>
              </div>
              <p className="text-lg font-bold text-white">$0</p>
            </div>
            <div className="p-3 border-2 border-gray-600 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-white">Pro</span>
              </div>
              <p className="text-lg font-bold text-white">$29<span className="text-sm font-normal text-gray-500">/mo</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * Loading States
 * Shows the forms with loading indicators
 */
export const LoadingStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {/* Login Loading */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Login - Submitting</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <Input type="email" defaultValue="user@example.com" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
            <Input type="password" defaultValue="********" disabled />
          </div>
          <Button type="button" className="w-full" loading disabled>
            Signing in...
          </Button>
        </div>
      </div>

      {/* OAuth Loading */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">OAuth - Connecting</h3>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full" disabled>
            <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            Connecting...
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled>
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  ),
};

/**
 * Form Validation States
 * Shows various validation error states
 */
export const ValidationStates: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl space-y-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Validation Examples</h3>

      {/* Email Validation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Email - Invalid Format
        </label>
        <Input type="email" defaultValue="invalid-email" error />
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Please enter a valid email address</p>
      </div>

      {/* Email Already Exists */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Email - Already Registered
        </label>
        <Input type="email" defaultValue="existing@example.com" error />
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">This email is already registered</p>
      </div>

      {/* Password Too Short */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Password - Too Short
        </label>
        <Input type="password" defaultValue="short" error />
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Password must be at least 8 characters</p>
      </div>

      {/* Passwords Don't Match */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Confirm Password - Mismatch
        </label>
        <Input type="password" defaultValue="different" error />
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
      </div>

      {/* Terms Not Accepted */}
      <div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-red-500 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">
            I agree to the Terms of Service
          </label>
        </div>
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">You must accept the terms to continue</p>
      </div>

      {/* Success State */}
      <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
          <Check className="h-5 w-5" />
          <p className="text-sm font-medium">Account created successfully! Redirecting...</p>
        </div>
      </div>
    </div>
  ),
};
