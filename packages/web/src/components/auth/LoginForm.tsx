'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, X, Github } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppVersion } from '@/components/ui/app-version';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userLocale, setUserLocale] = useState<'en' | 'pl'>('en');

  // Get translations based on user's saved locale
  const t = userLocale === 'pl' 
    ? plTranslations.auth.login 
    : enTranslations.auth.login;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  // Fetch user's locale when email is entered (on blur)
  const fetchUserLocale = async (email: string) => {
    if (!email || !email.includes('@')) return;

    try {
      const response = await axios.get(`${API_URL}/api/users/locale`, {
        params: { email },
      });
      
      if (response.data.locale) {
        setUserLocale(response.data.locale);
      }
    } catch (error) {
      console.log('Could not fetch user locale');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      const response = await axios.post(`${API_URL}/api/auth/login`, data);

      await login(
        response.data.data.token,
        response.data.data.refreshToken,
        userLocale
      );

      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');

      router.push(redirectUrl || '/chat');
    } catch (error: any) {
      if (error.response?.data) {
        setApiError(error.response.data.message || 'Login failed');
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleOAuth = () => {
    console.log('Google OAuth');
  };

  const handleGithubOAuth = () => {
    console.log('GitHub OAuth');
  };

  return (
    <div className="w-full max-w-md mx-auto">
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
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            {t.orContinueWith}
          </span>
        </div>
      </div>

      {/* Login Form */}
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
            {...register('email', {
              onBlur: (e) => fetchUserLocale(e.target.value),
            })}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

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
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            {t.forgotPassword}
          </Link>
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

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t.noAccount}{' '}
        <Link
          href="/register"
          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          {t.signUp}
        </Link>
      </p>

      {/* App Version */}
      <div className="mt-8 text-center">
        <AppVersion />
      </div>
    </div>
  );
}
