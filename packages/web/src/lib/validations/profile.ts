import { z } from 'zod';

export const profileSchema = z.object({
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
  locale: z.enum(['en', 'pl', 'ru']),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
