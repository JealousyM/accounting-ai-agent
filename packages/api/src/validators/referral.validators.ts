import { z } from 'zod';

export const validateCodeSchema = z.object({
  body: z.object({
    code: z.string().length(8, 'Referral code must be 8 characters').regex(/^[a-f0-9]+$/, 'Invalid referral code format'),
  }),
});

export type ValidateCodeInput = z.infer<typeof validateCodeSchema>['body'];
