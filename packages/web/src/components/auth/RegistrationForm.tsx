'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, Github, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { registrationSchema, type RegistrationFormData, checkPasswordStrength } from '@/lib/validations/auth';
import { registerUser, type ErrorResponse } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';

export function RegistrationForm() {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'pl'>('en');
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get translations based on selected locale
  const t = selectedLocale === 'pl' 
    ? plTranslations.auth.register 
    : enTranslations.auth.register;

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
    },
  });

  const password = watch('password', '');
  const passwordStrength = checkPasswordStrength(password);

  // Update locale in form when user changes language
  const handleLocaleChange = (locale: 'en' | 'pl') => {
    setSelectedLocale(locale);
    setValue('locale', locale);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      const { confirmPassword, agreeToTerms, ...registerData } = data;

      const response = await registerUser(registerData);
      console.log('Registration successful:', response);
      setSuccessMessage(t.successMessage);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        setApiError(errorData.message || 'Registration failed');
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleOAuth = () => {
    // Implement Google OAuth flow
    console.log('Google OAuth');
  };

  const handleGithubOAuth = () => {
    // Implement GitHub OAuth flow
    console.log('GitHub OAuth');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Language Selector */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleLocaleChange('en')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              selectedLocale === 'en'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
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
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Globe className="h-4 w-4" />
            Polski
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
        <p className="text-gray-600">{t.subtitle}</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="h-5 w-5" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* API Error */}
      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <X className="h-5 w-5" />
            <p className="text-sm font-medium">{apiError}</p>
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
        >
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
          {t.googleButton}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGithubOAuth}
        >
          <Github className="w-5 h-5 mr-2" />
          {t.githubButton}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">{t.orContinueWith}</span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
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
              <p className="mt-1.5 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
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
              <p className="mt-1.5 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <p className="mt-1.5 text-sm text-red-600">{errors.companyName.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          )}

          {/* Password Requirements */}
          {password && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">
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
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div>
          <Checkbox
            id="agreeToTerms"
            label={t.agreeToTerms}
            error={!!errors.agreeToTerms}
            {...register('agreeToTerms')}
          />
          {errors.agreeToTerms && (
            <p className="mt-1.5 text-sm text-red-600">{errors.agreeToTerms.message}</p>
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

      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-gray-600">
        {t.alreadyHaveAccount}{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {t.signIn}
        </Link>
      </p>
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
          met ? 'bg-green-500' : 'bg-gray-300'
        )}
      >
        {met && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className={cn('text-xs', met ? 'text-green-700' : 'text-gray-600')}>
        {text}
      </span>
    </div>
  );
}
