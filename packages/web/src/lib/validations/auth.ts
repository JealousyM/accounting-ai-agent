import { z } from 'zod';

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Registration form schema
 */
export const registrationSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
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
    companyName: z.string().max(100, 'Company name is too long').trim().optional(),
    locale: z.enum(['en', 'pl']).default('en'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
    // wFirma integration (optional)
    useWfirma: z.boolean().default(false),
    wfirmaAccessKey: z.string().max(200).trim().optional(),
    wfirmaSecretKey: z.string().max(200).trim().optional(),
    wfirmaCompanyId: z.string().max(50).trim().optional(),
    // Subscription option
    subscribeToPro: z.boolean().default(false),
    billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
    // LLM provider (required for Free plan, optional for Pro)
    llmProvider: z
      .union([z.literal('openai'), z.literal('anthropic'), z.literal('')])
      .optional(),
    llmApiKey: z.string().max(500).trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => !data.useWfirma || (data.wfirmaAccessKey && data.wfirmaSecretKey && data.wfirmaCompanyId),
    {
      message: 'All wFirma credentials are required when wFirma is enabled',
      path: ['wfirmaAccessKey'],
    }
  )
  .refine(
    (data) => {
      // LLM provider and API key are required ONLY if NOT subscribing to Pro
      if (!data.subscribeToPro) {
        return data.llmProvider && (data.llmProvider === 'openai' || data.llmProvider === 'anthropic') && data.llmApiKey;
      }
      return true;
    },
    {
      message: 'AI provider and API key are required for Free plan',
      path: ['llmProvider'],
    }
  );

export type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * Check password strength
 */
export const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const strength = passed === 5 ? 'strong' : passed >= 3 ? 'medium' : 'weak';

  return { checks, strength, passed };
};

/**
 * Forgot password form schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password form schema
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
