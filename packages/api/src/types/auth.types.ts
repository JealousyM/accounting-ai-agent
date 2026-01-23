import { Request } from 'express';

// ============================================
// JWT & TOKEN TYPES
// ============================================

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * OAuth token pair with profile completion flag
 */
export interface OAuthTokenPair extends TokenPair {
  needsProfileCompletion: boolean;
}

// ============================================
// USER TYPES
// ============================================

/**
 * User object attached to request
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Full user profile
 */
export interface UserProfile extends AuthUser {
  hasGoogleAuth: boolean;
  hasGithubAuth: boolean;
  company: any;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Extended Request interface with auth data
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
  authUser?: AuthUser;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Auth response interface
 */
export interface AuthResponse {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data: T;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any[];
}

// ============================================
// OAUTH TYPES
// ============================================

/**
 * OAuth provider
 */
export type OAuthProvider = 'google' | 'github';

/**
 * OAuth profile
 */
export interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: OAuthProvider;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Register input
 */
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

/**
 * Login input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Refresh token input
 */
export interface RefreshTokenInput {
  refreshToken: string;
}

/**
 * Change password input
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Update profile input
 */
export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  companyName?: string;
}
