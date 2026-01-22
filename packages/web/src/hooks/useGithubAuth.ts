'use client';

import { useState, useCallback } from 'react';

interface UseGithubAuthResult {
  login: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGithubAuth(): UseGithubAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(() => {
    setError(null);
    setIsLoading(true);

    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

    if (!clientId) {
      setError('GitHub OAuth is not configured');
      setIsLoading(false);
      return;
    }

    // Build GitHub authorization URL
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'read:user user:email';
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });

    // Store state for CSRF verification
    sessionStorage.setItem('github_oauth_state', state);

    // Redirect to GitHub
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  return { login, isLoading, error, clearError };
}
