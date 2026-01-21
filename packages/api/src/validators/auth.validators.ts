import { z } from 'zod';

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character (!@#$%^&*)'
  );

/**
 * Email validation
 */
const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim();

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Register validation schema
 */
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .trim(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
      .trim(),
    companyName: z
      .string()
      .max(100, 'Company name is too long')
      .trim()
      .optional(),
    locale: z.enum(['en', 'pl', 'ru']).default('en').optional(),
  }),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(1, 'Refresh token is required')
      .trim(),
  }),
});

/**
 * OAuth validation schema
 */
export const oauthSchema = z.object({
  body: z.object({
    id: z.string().min(1, 'OAuth ID is required'),
    email: emailSchema,
    name: z.string().max(100, 'Name is too long').optional(),
    picture: z.string().url('Invalid picture URL').optional(),
  }),
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }),
}).refine((data) => data.body.newPassword === data.body.confirmPassword, {
  message: 'Passwords do not match',
  path: ['body', 'confirmPassword'],
});

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
      .trim()
      .optional(),
    locale: z.enum(['en', 'pl', 'ru']).optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type OAuthInput = z.infer<typeof oauthSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

// ============================================
// INTERFACES
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
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  hasGoogleAuth: boolean;
  hasGithubAuth: boolean;
  company: any;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get password validation errors
 */
export const getPasswordErrors = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};
