'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  locale: string;
  hasGoogleAuth: boolean;
  hasGithubAuth: boolean;
  company: any;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, locale?: string) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  /**
   * Get token from localStorage
   */
  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }, []);

  /**
   * Get refresh token from localStorage
   */
  const getRefreshToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }, []);

  /**
   * Save tokens to localStorage
   */
  const saveTokens = useCallback((token: string, refreshToken: string, locale?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    if (locale) {
      localStorage.setItem('locale', locale);
    }
  }, []);

  /**
   * Clear tokens from localStorage
   */
  const clearTokens = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('locale');
  }, []);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = getRefreshToken();
      
      if (!refreshTokenValue) {
        return false;
      }

      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken: refreshTokenValue,
      });

      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data.data;
        saveTokens(token, newRefreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [getRefreshToken, saveTokens]);

  /**
   * Fetch user data from backend
   */
  const fetchUser = useCallback(async (token: string): Promise<User | null> => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      // Token expired - try to refresh
      if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        
        if (refreshed) {
          const newToken = getToken();
          if (newToken) {
            return fetchUser(newToken);
          }
        }
      }

      return null;
    }
  }, [refreshToken, getToken]);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const userData = await fetchUser(token);

    if (userData) {
      setUser(userData);
    } else {
      clearTokens();
      setUser(null);
    }

    setIsLoading(false);
  }, [getToken, fetchUser, clearTokens]);

  /**
   * Login - save tokens and fetch user
   */
  const login = useCallback(async (token: string, refreshToken: string, locale?: string) => {
    saveTokens(token, refreshToken, locale);
    
    const userData = await fetchUser(token);
    
    if (userData) {
      setUser(userData);
    }
  }, [saveTokens, fetchUser]);

  /**
   * Logout - clear tokens and redirect
   */
  const logout = useCallback(async () => {
    const token = getToken();

    // Call logout endpoint to invalidate refresh token
    if (token) {
      try {
        await axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    clearTokens();
    setUser(null);
    router.push('/login');
  }, [getToken, clearTokens, router]);

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
      setIsInitialized(true);
    }
  }, [isInitialized, checkAuth]);

  /**
   * Setup axios interceptor for automatic token refresh
   */
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await refreshToken();

          if (refreshed) {
            const newToken = getToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          }

          // Refresh failed - logout
          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken, getToken, logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * useAuth hook
 * Access authentication state and methods
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
