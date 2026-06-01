'use client';

import type { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import type { RegistrationFormData } from '@/lib/validations/auth';

export function usePlanSelection(
  watch: UseFormWatch<RegistrationFormData>,
  setValue: UseFormSetValue<RegistrationFormData>
) {
  const subscribeToPro = watch('subscribeToPro');
  const billingPeriod = watch('billingPeriod');

  return {
    subscribeToPro,
    billingPeriod,
    selectFreePlan: () => setValue('subscribeToPro', false),
    selectProPlan: () => setValue('subscribeToPro', true),
    selectMonthly: () => setValue('billingPeriod', 'monthly'),
    selectYearly: () => setValue('billingPeriod', 'yearly'),
  };
}
