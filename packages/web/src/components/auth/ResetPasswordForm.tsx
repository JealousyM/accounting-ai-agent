'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppVersion } from '@/components/ui/app-version';
import { resetPasswordSchema, type ResetPasswordFormData, checkPasswordStrength } from '@/lib/validations/auth';
import { resetPassword } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'pl' | 'ru'>('en');

  // Get translations based on selected locale
  const getTranslations = () => {
    switch (selectedLocale) {
      case 'pl':
        return plTranslations.auth.resetPassword;
      case 'ru':
        return ruTranslations.auth.resetPassword;
      default:
        return enTranslations.auth.resetPassword;
    }
  };

  const getPasswordRequirements = () => {
    switch (selectedLocale) {
      case 'pl':
        return plTranslations.auth.register.passwordRequirements;
      case 'ru':
        return ruTranslations.auth.register.passwordRequirements;
      default:
        return enTranslations.auth.register.passwordRequirements;
    }
  };

  const t = getTranslations();
  const passwordReqs = getPasswordRequirements();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');
  const passwordStrength = checkPasswordStrength(password);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    try {
      setIsSubmitting(true);
      setApiError(null);

      await resetPassword(token, data.password, data.confirmPassword);
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      if (error.response?.data) {
        setApiError(error.response.data.message || t.errorMessage);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError(t.errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invalid token state
  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t.invalidTokenTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.invalidTokenMessage}
          </p>
        </div>

        {/* Error Message */}
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <X className="h-5 w-5" />
            <p className="text-sm font-medium">{t.tokenExpired}</p>
          </div>
        </div>

        {/* Request New Link */}
        <Link href="/forgot-password">
          <Button className="w-full">
            {t.requestNewLink}
          </Button>
        </Link>

        {/* Back to Login */}
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
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

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t.successTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.successMessage}
          </p>
        </div>

        {/* Success Message */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
            <Check className="h-5 w-5" />
            <p className="text-sm font-medium">{t.redirecting}</p>
          </div>
        </div>

        {/* Back to Login */}
        <Link href="/login">
          <Button className="w-full">
            {t.goToLogin}
          </Button>
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

      {/* Reset Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.newPassword}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t.newPasswordPlaceholder}
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
                {passwordReqs.title}
              </p>
              <div className="space-y-1">
                <RequirementItem
                  met={passwordStrength.checks.length}
                  text={passwordReqs.length}
                />
                <RequirementItem
                  met={passwordStrength.checks.uppercase}
                  text={passwordReqs.uppercase}
                />
                <RequirementItem
                  met={passwordStrength.checks.lowercase}
                  text={passwordReqs.lowercase}
                />
                <RequirementItem
                  met={passwordStrength.checks.number}
                  text={passwordReqs.number}
                />
                <RequirementItem
                  met={passwordStrength.checks.special}
                  text={passwordReqs.special}
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
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
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
