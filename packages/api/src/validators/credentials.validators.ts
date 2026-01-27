import { z } from 'zod';

// ============================================
// WFIRMA CREDENTIALS
// ============================================

/**
 * wFirma credentials validation schema
 */
export const wfirmaCredentialsSchema = z.object({
  body: z.object({
    accessKey: z
      .string()
      .min(1, 'Access key is required')
      .max(200, 'Access key is too long')
      .trim(),
    secretKey: z
      .string()
      .min(1, 'Secret key is required')
      .max(200, 'Secret key is too long')
      .trim(),
    companyId: z
      .string()
      .min(1, 'Company ID is required')
      .max(50, 'Company ID is too long')
      .trim(),
  }),
});

// ============================================
// LLM CREDENTIALS
// ============================================

/**
 * LLM credentials validation schema
 */
export const llmCredentialsSchema = z.object({
  body: z.object({
    provider: z.enum(['openai', 'google'], {
      errorMap: () => ({ message: 'Provider must be openai or google' }),
    }),
    apiKey: z
      .string()
      .min(1, 'API key is required')
      .max(500, 'API key is too long')
      .trim(),
    model: z
      .string()
      .max(100, 'Model name is too long')
      .trim()
      .optional(),
  }),
});

// ============================================
// TYPES
// ============================================

export type WFirmaCredentialsInput = z.infer<typeof wfirmaCredentialsSchema>['body'];
export type LLMCredentialsInput = z.infer<typeof llmCredentialsSchema>['body'];
