import { z } from 'zod';
import type { ToolCategory } from '../services/admin.helpers';
import type { AIMemoryCategory } from '@prisma/client';

export const subscriptionPlanSchema = z.object({
  plan: z.enum(['free', 'pro']),
});

export const limitsSchema = z
  .object({
    aiMessagesLimit: z.number().int().min(0).max(1_000_000).optional(),
    wfirmaRequestsLimit: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine(
    (d) => d.aiMessagesLimit !== undefined || d.wfirmaRequestsLimit !== undefined,
    { message: 'At least one limit field is required' }
  );

export const resetUsageSchema = z.object({
  type: z.enum(['ai', 'wfirma', 'both']),
});

export const statsRangeSchema = z.object({
  range: z.enum(['week', 'month', 'year']).default('month'),
});

export type StatsRange = 'week' | 'month' | 'year';

export interface UserDeepStats {
  range: StatsRange;
  cost: {
    totalUsd: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    runCount: number;
    langsmithConversationCount: number;
    avgCostPerLangsmithConversation: number;
  };
  activityByDay: Array<{ date: string; toolCalls: number; conversations: number }>;
  conversations: { totalInRange: number };
  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>;
    byCategory: Array<{ category: ToolCategory; count: number }>;
  };
  channels: {
    web: { active: true };
    telegram: { active: boolean; linkedAt: string | null };
  };
  tts: { charactersUsed: number; costUsd: number };
  memories: { total: number; byCategory: Array<{ category: AIMemoryCategory; count: number }> };
  lastActivity: { lastConversationAt: string | null; lastToolCallAt: string | null };
}
