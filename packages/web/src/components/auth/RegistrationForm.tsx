'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, Github, Globe, Crown, Zap, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppVersion } from '@/components/ui/app-version';
import { registrationSchema, type RegistrationFormData, checkPasswordStrength } from '@/lib/validations/auth';
import { registerUser, type ErrorResponse, getPublicLLMModels, type LLMModelInfo } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useGithubAuth } from '@/hooks/useGithubAuth';
import { cn } from '@/lib/utils';
import { LegalModal } from '@/components/legal/LegalModal';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import { API_URL } from '@/lib/config';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export function RegistrationForm() {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'pl' | 'ru'>('en');
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [githubVisible, setGithubVisible] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legalLinks = (translations[selectedLocale] as any)?.legal?.footer?.links;
  const [availableModels, setAvailableModels] = useState<LLMModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // OAuth hooks
  const { login: googleLogin, isLoading: googleLoading, error: googleError, clearError: clearGoogleError } = useGoogleAuth();
  const { login: githubLogin, isLoading: githubLoading, error: githubError, clearError: clearGithubError } = useGithubAuth();

  // Show OAuth errors
  const oauthError = googleError || githubError;

  // Fetch auth config to check OAuth visibility
  useEffect(() => {
    const fetchAuthConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/config`);
        if (response.data?.data?.github?.visible) {
          setGithubVisible(true);
        }
      } catch (error) {
        console.log('Could not fetch auth config');
      }
    };
    fetchAuthConfig();
  }, []);

  // Clear OAuth errors when switching providers
  useEffect(() => {
    if (googleError) clearGithubError();
    if (githubError) clearGoogleError();
  }, [googleError, githubError, clearGoogleError, clearGithubError]);

  // Get translations based on selected locale
  const t = translations[selectedLocale].auth.register;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: {
      locale: selectedLocale,
      subscribeToPro: false,
      billingPeriod: 'monthly',
    },
  });

  const password = watch('password', '');
  const agreeToTermsValue = watch('agreeToTerms', false);
  const errorRef = React.useRef<HTMLDivElement>(null);
  const passwordStrength = checkPasswordStrength(password);

  // Update locale in form when user changes language
  const handleLocaleChange = (locale: 'en' | 'pl' | 'ru') => {
    setSelectedLocale(locale);
    setValue('locale', locale);
  };

  // Watch LLM provider and API key for model fetching
  const watchedLlmProvider = watch('llmProvider');
  const watchedLlmApiKey = watch('llmApiKey');

  // Fetch available models when API key is entered
  useEffect(() => {
    const fetchModels = async () => {
      if (!watchedLlmProvider || !watchedLlmApiKey || watchedLlmApiKey.length < 10) {
        setAvailableModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        const models = await getPublicLLMModels(watchedLlmProvider as 'openai' | 'google', watchedLlmApiKey);
        setAvailableModels(models);
      } catch {
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    const timer = setTimeout(fetchModels, 500); // Debounce
    return () => clearTimeout(timer);
  }, [watchedLlmProvider, watchedLlmApiKey]);

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      const { confirmPassword, agreeToTerms, llmProvider, llmModel, ...restData } = data;

      void confirmPassword;
      void agreeToTerms;

      // Clean up llmProvider - only pass valid values
      const validProvider = llmProvider === 'openai' || llmProvider === 'google' ? llmProvider : undefined;
      const registerData = {
        ...restData,
        llmProvider: validProvider,
        llmModel: validProvider ? llmModel : undefined,
      };

      const response = await registerUser(registerData);
      console.log('Registration successful:', response);
      setSuccessMessage(t.successMessage);

      // Auto-login using returned tokens (apiClient unwraps response, so tokens are directly on response)
      if (response.token && response.refreshToken) {
        await login(response.token, response.refreshToken, selectedLocale);

        // Store flag for welcome modal if wFirma is enabled (check both checkbox and credentials)
        const wfirmaEnabled = data.useWfirma || (data.wfirmaAccessKey && data.wfirmaSecretKey && data.wfirmaCompanyId);
        if (wfirmaEnabled) {
          localStorage.setItem('showWfirmaWelcome', 'true');
        }

        // Redirect based on subscription choice
        setTimeout(() => {
          if (data.subscribeToPro) {
            // Redirect to pricing page to complete Pro subscription
            const billingParam = data.billingPeriod || 'monthly';
            router.push(`/pricing?autoCheckout=true&billingPeriod=${billingParam}`);
          } else {
            // Redirect to chat for Free plan users
            router.push('/chat');
          }
        }, 1500);
      } else {
        // Fallback: redirect to login if tokens not returned
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: unknown) {
      // Handle ApiError (from our API client)
      if (error instanceof ApiError) {
        // Check for duplicate email error
        if (error.message.toLowerCase().includes('already registered')) {
          setApiError(t.emailAlreadyExists || 'This email is already registered. Please use a different email or sign in.');
        } else {
          setApiError(error.message);
        }
      } else if (error && typeof error === 'object' && 'response' in error) {
        // Handle axios-style errors
        const axiosError = error as { response?: { data?: ErrorResponse } };
        const errorData = axiosError.response?.data;
        setApiError(errorData?.message || 'Registration failed');
      } else {
        setApiError(t.unexpectedError || 'An unexpected error occurred. Please try again.');
      }
      // Scroll to error message
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleOAuth = () => {
    setApiError(null);
    googleLogin(selectedLocale);
  };

  const handleGithubOAuth = () => {
    setApiError(null);
    githubLogin(selectedLocale);
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t.submitting}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t.pleaseWait || 'Please wait...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Language Selector */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleLocaleChange('en')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              selectedLocale === 'en'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Globe className="h-4 w-4" />
            English
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('pl')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              selectedLocale === 'pl'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Globe className="h-4 w-4" />
            Polski
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('ru')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              selectedLocale === 'ru'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Globe className="h-4 w-4" />
            Русский
          </button>
        </div>
      </div>

      {/* Beta Warning */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
        <div className="flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Wersja testowa</p>
            <p className="mt-1">
              Aplikacja znajduje się w fazie testowej. Niektóre funkcje mogą działać niestabilnie. Korzystasz na własną odpowiedzialność.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
            <Check className="h-5 w-5" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* API Error */}
      {(apiError || oauthError) && (
        <div ref={errorRef} className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <X className="h-5 w-5" />
            <p className="text-sm font-medium">{apiError || oauthError}</p>
          </div>
        </div>
      )}

      {/* Social Auth Buttons */}
      <div className="space-y-3 mb-6">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleOAuth}
          disabled={googleLoading || githubLoading || isSubmitting}
        >
          {googleLoading ? (
            <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
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
          )}
          {googleLoading ? t.connecting : t.googleButton}
        </Button>

        {githubVisible && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGithubOAuth}
            disabled={googleLoading || githubLoading || isSubmitting}
          >
            {githubLoading ? (
              <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <Github className="w-5 h-5 mr-2" />
            )}
            {githubLoading ? t.connecting : t.githubButton}
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">{t.orContinueWith}</span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.email}
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t.emailPlaceholder}
            error={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.firstName}
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder={t.firstNamePlaceholder}
              error={!!errors.firstName}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.lastName}
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder={t.lastNamePlaceholder}
              error={!!errors.lastName}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.companyName}
          </label>
          <Input
            id="companyName"
            type="text"
            placeholder={t.companyNamePlaceholder}
            error={!!errors.companyName}
            {...register('companyName')}
          />
          {errors.companyName && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.companyName.message}</p>
          )}
        </div>

        {/* Subscription Plan Selection */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-5">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t.choosePlan}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Plan */}
            <label className={cn(
              "relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all",
              !watch('subscribeToPro')
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}>
              <input
                type="radio"
                className="sr-only"
                checked={!watch('subscribeToPro')}
                onChange={() => setValue('subscribeToPro', false)}
              />
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{t.plan.free.name}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.plan.free.price}</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>✓ {t.plan.free.features.ownKey}</li>
                <li>✓ {t.plan.free.features.unlimited}</li>
                <li>✓ {t.plan.free.features.wfirma}</li>
              </ul>
            </label>

            {/* Pro Plan */}
            <label className={cn(
              "relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all",
              watch('subscribeToPro')
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}>
              <input
                type="radio"
                className="sr-only"
                checked={watch('subscribeToPro') || false}
                onChange={() => setValue('subscribeToPro', true)}
              />
              <div className="absolute top-2 right-2">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {t.plan.pro.popular}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white">{t.plan.pro.name}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t.plan.pro.price}<span className="text-sm font-normal text-gray-500">{t.plan.pro.perMonth}</span>
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>✓ {t.plan.pro.features.included}</li>
                <li>✓ {t.plan.pro.features.ownKey}</li>
                <li>✓ {t.plan.pro.features.wfirma}</li>
              </ul>
            </label>
          </div>

          {/* Billing Period Selector - shown only when Pro is selected */}
          {watch('subscribeToPro') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t.billingPeriod}
              </label>
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setValue('billingPeriod', 'monthly')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-md transition-all',
                    watch('billingPeriod') === 'monthly'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <div className="text-left">
                    <div className="font-semibold">{t.plan.billing.monthly.label}</div>
                    <div className="text-xs opacity-75 mt-0.5">{t.plan.billing.monthly.price}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('billingPeriod', 'yearly')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-md transition-all',
                    watch('billingPeriod') === 'yearly'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {t.plan.billing.yearly.label}
                      <span className="ml-1 text-green-600 dark:text-green-500 text-xs font-normal">
                        {t.plan.billing.yearly.savings}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">{t.plan.billing.yearly.price}</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {watch('subscribeToPro') && (
            <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              ℹ️ {t.proCheckoutInfo}
            </p>
          )}
        </div>

        {/* wFirma Integration Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-5">
          <div className="flex items-center mb-4">
            <input
              id="useWfirma"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...register('useWfirma')}
            />
            <label htmlFor="useWfirma" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.useWfirma || 'Do you use wFirma?'}
            </label>
          </div>

          {watch('useWfirma') && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t.wfirmaHelp || 'You can find these credentials in your wFirma account settings under API section.'}
              </p>
              <div>
                <label htmlFor="wfirmaAccessKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.wfirmaAccessKey || 'Access Key'}
                </label>
                <Input
                  id="wfirmaAccessKey"
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.wfirmaAccessKey}
                  {...register('wfirmaAccessKey')}
                />
                {errors.wfirmaAccessKey && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.wfirmaAccessKey.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="wfirmaSecretKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.wfirmaSecretKey || 'Secret Key'}
                </label>
                <Input
                  id="wfirmaSecretKey"
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.wfirmaSecretKey}
                  {...register('wfirmaSecretKey')}
                />
                {errors.wfirmaSecretKey && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.wfirmaSecretKey.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="wfirmaCompanyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.wfirmaCompanyId || 'Company ID'}
                </label>
                <Input
                  id="wfirmaCompanyId"
                  type="text"
                  placeholder={t.wfirmaCompanyIdPlaceholder || 'Your wFirma Company ID'}
                  error={!!errors.wfirmaCompanyId}
                  {...register('wfirmaCompanyId')}
                />
                {errors.wfirmaCompanyId && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.wfirmaCompanyId.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* LLM Provider Section (Required for Free plan) */}
        {!watch('subscribeToPro') && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <label htmlFor="llmProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.llmProvider || 'AI Provider'} <span className="text-red-500">*</span>
            </label>
          <select
            id="llmProvider"
            className={cn(
              "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.llmProvider ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            )}
            {...register('llmProvider')}
          >
            <option value="">{t.llmProviderSelect || 'Select AI provider...'}</option>
            <option value="openai">OpenAI (GPT-4)</option>
            <option value="google">Google (Gemini)</option>
          </select>
          {errors.llmProvider && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.llmProvider.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t.llmProviderHelp || 'Select your AI provider. You will need to provide your own API key.'}
          </p>

          {watch('llmProvider') && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="llmApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.llmApiKey || 'API Key'} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="llmApiKey"
                  type="password"
                  placeholder={watch('llmProvider') === 'openai' ? 'sk-...' : 'AIza...'}
                  error={!!errors.llmApiKey}
                  {...register('llmApiKey')}
                />
                {errors.llmApiKey && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.llmApiKey.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {watch('llmProvider') === 'openai'
                    ? (t.llmApiKeyHelpOpenai || 'Get your API key from platform.openai.com')
                    : 'Get your API key from ai.google.dev'
                  }
                </p>
              </div>

              {/* Model loading indicator */}
              {isLoadingModels && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading available models...
                </p>
              )}

              {/* Model selection dropdown */}
              {availableModels.length > 0 && (
                <div>
                  <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Model
                  </label>
                  <select
                    id="llmModel"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register('llmModel')}
                  >
                    <option value="">Default model</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.password}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t.passwordPlaceholder}
              error={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}

          {/* Password Requirements */}
          {password && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.passwordRequirements.title}
              </p>
              <div className="space-y-1">
                <RequirementItem
                  met={passwordStrength.checks.length}
                  text={t.passwordRequirements.length}
                />
                <RequirementItem
                  met={passwordStrength.checks.uppercase}
                  text={t.passwordRequirements.uppercase}
                />
                <RequirementItem
                  met={passwordStrength.checks.lowercase}
                  text={t.passwordRequirements.lowercase}
                />
                <RequirementItem
                  met={passwordStrength.checks.number}
                  text={t.passwordRequirements.number}
                />
                <RequirementItem
                  met={passwordStrength.checks.special}
                  text={t.passwordRequirements.special}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.confirmPassword}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t.confirmPasswordPlaceholder}
              error={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div>
          <div className="flex items-start gap-2">
            <input
              id="agreeToTerms"
              type="checkbox"
              className={cn(
                "mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                errors.agreeToTerms && "border-red-500"
              )}
              {...register('agreeToTerms')}
            />
            <label htmlFor="agreeToTerms" className="text-sm text-gray-700 dark:text-gray-300">
              {t.agreeToTermsPrefix || 'I agree to the'}{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                {t.termsOfService || 'Terms of Service'}
              </button>
              {' '}{t.and || 'and'}{' '}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                {t.privacyPolicy || 'Privacy Policy'}
              </button>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.agreeToTerms.message}</p>
          )}
          <p className="mt-2 ml-6 text-xs text-gray-500 dark:text-gray-400">
            <a
              href="/cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {legalLinks?.cookies || 'Cookie Policy'}
            </a>
            {' · '}
            <a
              href="/rodo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {legalLinks?.rodo || 'RODO'}
            </a>
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting || !agreeToTermsValue}
        >
          {isSubmitting ? t.submitting : t.submitButton}
        </Button>
      </form>

      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t.alreadyHaveAccount}{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          {t.signIn}
        </Link>
      </p>

      {/* App Version */}
      <div className="mt-8 text-center">
        <AppVersion />
      </div>

      {/* Legal Modals */}
      <LegalModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type="terms"
        locale={selectedLocale as 'en' | 'pl' | 'ru'}
      />
      <LegalModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="privacy"
        locale={selectedLocale as 'en' | 'pl' | 'ru'}
      />
    </div>
  );
}

// Helper component for password requirements
function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center h-4 w-4 rounded-full',
          met ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        {met && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className={cn('text-xs', met ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400')}>
        {text}
      </span>
    </div>
  );
}
