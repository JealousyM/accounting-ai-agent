'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserAnalytics } from '@/lib/api/user-analytics';
import { AnalyticsRange, UserAnalytics } from '@/types/user-analytics.types';

interface UseUserAnalyticsReturn {
  data: UserAnalytics | undefined;
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUserAnalytics(): UseUserAnalyticsReturn {
  const [range, setRange] = useState<AnalyticsRange>('month');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-analytics', range],
    queryFn: () => fetchUserAnalytics(range),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return { data, range, setRange, isLoading, isError, refetch };
}
