'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { UseFormSetValue } from 'react-hook-form';
import type { RegistrationFormData } from '@/lib/validations/auth';
import { validateReferralCode } from '@/lib/api/referral';

export function useReferralCode(setValue: UseFormSetValue<RegistrationFormData>) {
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (refCode && refCode.length === 8) {
      validateReferralCode(refCode)
        .then((result) => {
          if (result.valid) {
            setReferrerName(result.referrerFirstName || null);
            setValue('referredByCode', refCode);
          }
        })
        .catch(() => {/* ignore invalid codes */});
    }
  }, [refCode, setValue]);

  return { referrerName };
}
