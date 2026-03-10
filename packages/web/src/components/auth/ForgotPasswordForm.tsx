'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Check, X, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppVersion } from '@/components/ui/app-version';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { forgotPassword } from '@/lib/api/auth';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [emailNotSent, setEmailNotSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'pl' | 'ru'>('en');

  // Get translations based on selected locale
  const getTranslations = () => {
    switch (selectedLocale) {
      case 'pl':
        return plTranslations.auth.forgotPassword;
      case 'ru':
        return ruTranslations.auth.forgotPassword;
      default:
        return enTranslations.auth.forgotPassword;
    }
  };

  const t = getTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      const response = await forgotPassword(data.email, selectedLocale);
      if (response.resetLink) {
        setDevResetLink(response.resetLink);
      }
      if (response.emailSent === false) {
        setEmailNotSent(true);
      }
      if (response.emailError) {
        setEmailError(response.emailError);
      }
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      if (err.response?.data) {
        setApiError(err.response.data.message || t.errorMessage);
      } else if (err.message) {
        setApiError(err.message);
      } else {
        setApiError(t.errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            emailNotSent
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          }`}>
            {emailNotSent
              ? <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              : <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            }
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {emailNotSent ? t.successTitle : t.successTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {emailNotSent ? t.emailNotSent : t.successMessage}
          </p>
        </div>

        {/* Email sent successfully */}
        {!emailNotSent && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
              <Check className="h-5 w-5" />
              <p className="text-sm font-medium">{t.checkEmail}</p>
            </div>
          </div>
        )}

        {/* Email NOT sent — show warning with reason */}
        {emailNotSent && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.emailNotSent}</p>
                {emailError && (
                  <p className="text-xs mt-1 opacity-80">{t.emailError}: {emailError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dev mode: show reset link directly */}
        {devResetLink && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-2">Reset link:</p>
            <a
              href={devResetLink}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {devResetLink}
            </a>
          </div>
        )}

        {/* Back to Login */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToLogin}
        </Link>

        {/* App Version */}
        <div className="mt-8 text-center">
          <AppVersion />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Language Selector */}
      <div className="flex justify-end mb-6">
        <select
          value={selectedLocale}
          onChange={(e) => setSelectedLocale(e.target.value as 'en' | 'pl' | 'ru')}
          className="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500"
        >
          <option value="en">English</option>
          <option value="pl">Polski</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.subtitle}
        </p>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <X className="h-5 w-5" />
            <p className="text-sm font-medium">{apiError}</p>
          </div>
        </div>
      )}

      {/* Forgot Password Form */}
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? t.submitting : t.submitButton}
        </Button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToLogin}
        </Link>
      </div>

      {/* App Version */}
      <div className="mt-8 text-center">
        <AppVersion />
      </div>
    </div>
  );
}
