import { apiClient, ApiError } from './api-client';
import { API_ENDPOINTS } from './endpoints';

//const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  locale?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Register new user
 */
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    return await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data, {
      skipAuth: true,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Registration failed');
  }
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    return await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password },
      { skipAuth: true }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Login failed');
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  return apiClient.get(API_ENDPOINTS.AUTH.ME);
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
};

/**
 * Refresh token
 */
export const refreshToken = async (refreshToken: string) => {
  return apiClient.post(
    API_ENDPOINTS.AUTH.REFRESH,
    { refreshToken },
    { skipAuth: true }
  );
};

/**
 * Get user locale by email
 */
export const getUserLocale = async (email: string): Promise<{ locale: string }> => {
  return apiClient.get(`${API_ENDPOINTS.USERS.LOCALE}?email=${encodeURIComponent(email)}`, {
    skipAuth: true,
  });
};

/**
 * Google OAuth
 */
export const googleOAuth = async (profile: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.OAUTH_GOOGLE, profile, {
    skipAuth: true,
  });
};

/**
 * GitHub OAuth
 */
export const githubOAuth = async (profile: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.OAUTH_GITHUB, profile, {
    skipAuth: true,
  });
};
