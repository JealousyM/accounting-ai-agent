/**
 * AI Chat Validators
 * Zod schemas for AI chat API request validation
 */

import { z } from 'zod';

// ============================================
// PARAMETER SCHEMAS
// ============================================

/**
 * UUID parameter validation
 */
const uuidParam = z.string().uuid('Invalid conversation ID format');

/**
 * LLM Provider validation
 */
const llmProvider = z.enum(['openai', 'google']).optional();

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Create conversation validation schema
 * POST /api/ai/conversations
 */
export const createConversationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .max(255, 'Title is too long')
      .trim()
      .optional(),
  }),
});

/**
 * Get conversations validation schema
 * GET /api/ai/conversations
 */
export const getConversationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }).optional(),
});

/**
 * Get single conversation validation schema
 * GET /api/ai/conversations/:id
 */
export const getConversationSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
});

/**
 * Delete conversation validation schema
 * DELETE /api/ai/conversations/:id
 */
export const deleteConversationSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
});

/**
 * Send message validation schema
 * POST /api/ai/conversations/:id/messages
 */
export const sendMessageSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(10000, 'Message is too long (max 10000 characters)')
      .trim(),
    provider: llmProvider,
    generateTts: z.boolean().optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateConversationInput = z.infer<typeof createConversationSchema>['body'];
export type GetConversationsInput = z.infer<typeof getConversationsSchema>['query'];
export type GetConversationParams = z.infer<typeof getConversationSchema>['params'];
export type DeleteConversationParams = z.infer<typeof deleteConversationSchema>['params'];
export type SendMessageParams = z.infer<typeof sendMessageSchema>['params'];
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
