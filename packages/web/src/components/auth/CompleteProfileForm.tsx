'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { completeProfile, type CompleteProfileData, getPublicLLMModels, type LLMModelInfo } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';

// Validation schema for complete profile form
const completeProfileSchema = z.object({
  llmProvider: z.enum(['openai', 'google'], {
    required_error: 'Please select an AI provider',
  }),
  llmApiKey: z.string().min(1, 'API key is required'),
  llmModel: z.string().optional(),
  useWfirma: z.boolean().optional(),
  wfirmaAccessKey: z.string().optional(),
  wfirmaSecretKey: z.string().optional(),
  wfirmaCompanyId: z.string().optional(),
}).refine((data) => {
  // If useWfirma is true, all wFirma fields are required
  if (data.useWfirma) {
    return data.wfirmaAccessKey && data.wfirmaSecretKey && data.wfirmaCompanyId;
  }
  return true;
}, {
  message: 'All wFirma credentials are required when wFirma integration is enabled',
  path: ['wfirmaAccessKey'],
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export function CompleteProfileForm() {
  const router = useRouter();
  const { clearNeedsProfileCompletion, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<LLMModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Determine locale from user or default to 'en'
  const userLocale = user?.locale || 'en';
  const selectedLocale = userLocale === 'pl' ? 'pl' : 'en';

  // Get translations based on locale
  const t = selectedLocale === 'pl'
    ? plTranslations.auth.completeProfile
    : enTranslations.auth.completeProfile;

  // Fallback translations
  const translations = {
    title: t.title || 'Complete Your Profile',
    subtitle: t.subtitle || 'Add your AI provider credentials to start using the app',
    llmProvider: t.llmProvider || 'AI Provider',
    llmProviderSelect: t.llmProviderSelect || 'Select AI provider...',
    llmProviderHelp: t.llmProviderHelp || 'Select your AI provider. You will need to provide your own API key.',
    llmApiKey: t.llmApiKey || 'API Key',
    llmApiKeyHelpOpenai: t.llmApiKeyHelpOpenai || 'Get your API key from platform.openai.com',
    useWfirma: t.useWfirma || 'Do you use wFirma?',
    wfirmaHelp: t.wfirmaHelp || 'You can find these credentials in your wFirma account settings under API section.',
    wfirmaAccessKey: t.wfirmaAccessKey || 'Access Key',
    wfirmaSecretKey: t.wfirmaSecretKey || 'Secret Key',
    wfirmaCompanyId: t.wfirmaCompanyId || 'Company ID',
    wfirmaCompanyIdPlaceholder: t.wfirmaCompanyIdPlaceholder || 'Your wFirma Company ID',
    submitButton: t.submitButton || 'Complete Setup',
    submitting: t.submitting || 'Saving...',
    successMessage: t.successMessage || 'Profile completed successfully! Redirecting...',
    unexpectedError: t.errorMessage || 'An unexpected error occurred. Please try again.',
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onChange',
    defaultValues: {
      useWfirma: false,
    },
  });

  const watchedLlmProvider = watch('llmProvider');
  const watchedLlmApiKey = watch('llmApiKey');

  // Fetch available models when provider and API key are set
  useEffect(() => {
    const fetchModels = async () => {
      if (!watchedLlmProvider || !watchedLlmApiKey || watchedLlmApiKey.length < 10) {
        setAvailableModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        const models = await getPublicLLMModels(watchedLlmProvider, watchedLlmApiKey);
        setAvailableModels(models);
      } catch {
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(fetchModels, 500);
    return () => clearTimeout(timer);
  }, [watchedLlmProvider, watchedLlmApiKey]);

  const errorRef = React.useRef<HTMLDivElement>(null);

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      const profileData: CompleteProfileData = {
        llmProvider: data.llmProvider,
        llmApiKey: data.llmApiKey,
        llmModel: data.llmModel,
        useWfirma: data.useWfirma,
        wfirmaAccessKey: data.wfirmaAccessKey,
        wfirmaSecretKey: data.wfirmaSecretKey,
        wfirmaCompanyId: data.wfirmaCompanyId,
      };

      await completeProfile(profileData);

      setSuccessMessage(translations.successMessage);

      // Clear the profile completion flag
      clearNeedsProfileCompletion();

      // Store flag for welcome modal if wFirma is enabled
      if (data.useWfirma) {
        localStorage.setItem('showWfirmaWelcome', 'true');
      }

      // Redirect to chat after success
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError(translations.unexpectedError);
      }
      // Scroll to error message
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
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
                {translations.submitting}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{translations.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{translations.subtitle}</p>
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
      {apiError && (
        <div ref={errorRef} className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <X className="h-5 w-5" />
            <p className="text-sm font-medium">{apiError}</p>
          </div>
        </div>
      )}

      {/* Complete Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        {/* LLM Provider Section (Required) */}
        <div>
          <label htmlFor="llmProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {translations.llmProvider} <span className="text-red-500">*</span>
          </label>
          <select
            id="llmProvider"
            className={cn(
              "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.llmProvider ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            )}
            {...register('llmProvider')}
          >
            <option value="">{translations.llmProviderSelect}</option>
            <option value="openai">OpenAI (GPT-4)</option>
            <option value="google">Google (Gemini)</option>
          </select>
          {errors.llmProvider && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.llmProvider.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {translations.llmProviderHelp}
          </p>

          {watch('llmProvider') && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="llmApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {translations.llmApiKey} <span className="text-red-500">*</span>
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
                    ? translations.llmApiKeyHelpOpenai
                    : 'Get your API key from aistudio.google.com'
                  }
                </p>
              </div>

              {/* Model Selection */}
              {isLoadingModels && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading available models...</span>
                </div>
              )}
              {availableModels.length > 0 && (
                <div>
                  <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Model
                  </label>
                  <select
                    id="llmModel"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600"
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
              {translations.useWfirma}
            </label>
          </div>

          {watch('useWfirma') && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {translations.wfirmaHelp}
              </p>
              <div>
                <label htmlFor="wfirmaAccessKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {translations.wfirmaAccessKey} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="wfirmaAccessKey"
                  type="password"
                  placeholder="********"
                  error={!!errors.wfirmaAccessKey}
                  {...register('wfirmaAccessKey')}
                />
                {errors.wfirmaAccessKey && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.wfirmaAccessKey.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="wfirmaSecretKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {translations.wfirmaSecretKey} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="wfirmaSecretKey"
                  type="password"
                  placeholder="********"
                  error={!!errors.wfirmaSecretKey}
                  {...register('wfirmaSecretKey')}
                />
                {errors.wfirmaSecretKey && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.wfirmaSecretKey.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="wfirmaCompanyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {translations.wfirmaCompanyId} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="wfirmaCompanyId"
                  type="text"
                  placeholder={translations.wfirmaCompanyIdPlaceholder}
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? translations.submitting : translations.submitButton}
        </Button>
      </form>
    </div>
  );
}
