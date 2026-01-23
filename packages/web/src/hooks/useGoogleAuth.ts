'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { googleOAuth } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface UseGoogleAuthResult {
  login: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: authLogin } = useAuth();
  const router = useRouter();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    return response.json();
  };

  const login = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError('Google OAuth is not configured');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if Google API is loaded (loaded by GoogleOAuthProvider)
      const googleApi = (window as Window & { google?: { accounts?: { oauth2?: { initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void } } } } }).google;

      if (!googleApi?.accounts?.oauth2) {
        setError('Google OAuth is not available. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      const tokenClient = googleApi.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            setError('Google sign in was cancelled');
            setIsLoading(false);
            return;
          }

          try {
            const userInfo = await fetchGoogleUserInfo(response.access_token);

            const authResponse = await googleOAuth({
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            });

            // apiClient unwraps the response, so authResponse is already the data object
            await authLogin(
              authResponse.token,
              authResponse.refreshToken,
              undefined,
              authResponse.needsProfileCompletion
            );

            // Check if profile completion is needed (new OAuth user)
            if (authResponse.needsProfileCompletion) {
              router.push('/auth/complete-profile');
            } else {
              const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
              sessionStorage.removeItem('redirectAfterLogin');
              router.push(redirectUrl || '/chat');
            }
          } catch (err: unknown) {
            const errorMessage = err instanceof Error
              ? err.message
              : 'Google authentication failed';
            setError(errorMessage);
          } finally {
            setIsLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      setError('Failed to initialize Google OAuth');
      setIsLoading(false);
    }
  }, [authLogin, router]);

  return { login, isLoading, error, clearError };
}
