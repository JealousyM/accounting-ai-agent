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
  // wFirma credentials (optional)
  useWfirma?: boolean;
  wfirmaAccessKey?: string;
  wfirmaSecretKey?: string;
  wfirmaCompanyId?: string;
  // LLM provider credentials (required)
  llmProvider: 'openai' | 'anthropic';
  llmApiKey: string;
}

export interface AuthData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
  isFirstLogin?: boolean;
  wfirmaEnabled?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: AuthData;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Register new user
 * Note: apiClient unwraps the response, returning data directly
 */
export const registerUser = async (data: RegisterData): Promise<AuthData> => {
  try {
    return await apiClient.post<AuthData>(API_ENDPOINTS.AUTH.REGISTER, data, {
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
 * Update profile data
 */
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  locale?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  locale: string;
  hasGoogleAuth: boolean;
  hasGithubAuth: boolean;
  company: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
  return apiClient.patch<UpdateProfileResponse>(API_ENDPOINTS.AUTH.PROFILE, data);
};

/**
 * Mark first login as complete (hide welcome modal)
 */
export const markFirstLoginComplete = async (): Promise<void> => {
  await apiClient.post('/api/auth/first-login-complete');
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
 * Note: apiClient unwraps the response, returning data directly
 */
export const googleOAuth = async (profile: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<AuthData> => {
  return apiClient.post<AuthData>(API_ENDPOINTS.AUTH.OAUTH_GOOGLE, profile, {
    skipAuth: true,
  });
};

/**
 * GitHub OAuth
 * Note: apiClient unwraps the response, returning data directly
 */
export const githubOAuth = async (profile: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<AuthData> => {
  return apiClient.post<AuthData>(API_ENDPOINTS.AUTH.OAUTH_GITHUB, profile, {
    skipAuth: true,
  });
};

/**
 * GitHub OAuth callback - exchange code for tokens
 * Note: apiClient unwraps the response, returning data directly
 */
export const githubOAuthCallback = async (code: string): Promise<AuthData> => {
  return apiClient.post<AuthData>(API_ENDPOINTS.AUTH.OAUTH_GITHUB_CALLBACK, { code }, {
    skipAuth: true,
  });
};

/**
 * Forgot password - request password reset email
 */
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  try {
    return await apiClient.post<ForgotPasswordResponse>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
      { skipAuth: true }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Failed to request password reset');
  }
};

/**
 * Reset password - set new password with token
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export const resetPassword = async (token: string, password: string, confirmPassword: string): Promise<ResetPasswordResponse> => {
  try {
    return await apiClient.post<ResetPasswordResponse>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, password, confirmPassword },
      { skipAuth: true }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Failed to reset password');
  }
};
