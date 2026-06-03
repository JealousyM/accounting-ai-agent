import { z } from 'zod';

export const createShortcutSchema = z.object({
  body: z.object({
    label: z.string().min(1).max(100),
    prompt: z.string().min(1).max(2000),
  }),
});

export const updateShortcutSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      label: z.string().min(1).max(100).optional(),
      prompt: z.string().min(1).max(2000).optional(),
      sortOrder: z.number().int().min(0).optional(),
    })
    .refine(
      (d) => d.label !== undefined || d.prompt !== undefined || d.sortOrder !== undefined,
      { message: 'At least one field must be provided' }
    ),
});

export const deleteShortcutSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const reorderShortcutsSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
  }),
});
