'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchUpcomingTaxDeadlines } from '@/lib/api/tax-calendar';
import { UpcomingTaxDeadline } from '@/types/tax-calendar.types';

const STALE_TIME_MS = 60 * 60 * 1000; // 1 hour

export function useTaxDeadlines(locale: string = 'pl'): {
  deadlines: UpcomingTaxDeadline[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['tax-deadlines-upcoming', locale],
    queryFn: () => fetchUpcomingTaxDeadlines(locale, 14),
    staleTime: STALE_TIME_MS,
    retry: 1,
  });

  return {
    deadlines: data?.data ?? [],
    isLoading,
  };
}
