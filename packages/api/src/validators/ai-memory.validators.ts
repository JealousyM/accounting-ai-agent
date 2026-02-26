import { z } from 'zod';

const memoryCategories = ['user_preference', 'business_fact', 'frequent_entity', 'workflow_pattern'] as const;

export const getMemoriesSchema = z.object({
  query: z.object({
    category: z.enum(memoryCategories).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const updateMemorySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    value: z.string().min(1).max(2000).optional(),
    isPinned: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  }).refine(data => data.value !== undefined || data.isPinned !== undefined || data.isHidden !== undefined, {
    message: 'At least one field (value, isPinned, isHidden) must be provided',
  }),
});

export const deleteMemorySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const clearMemoriesSchema = z.object({
  body: z.object({
    category: z.enum(memoryCategories).optional(),
  }),
});
