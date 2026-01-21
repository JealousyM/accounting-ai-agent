'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCostDashboard } from '@/lib/api/ai-costs';
import { TimeRange, CostDashboardData } from '@/types/ai-costs.types';

interface UseAICostsParams {
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
}

interface UseAICostsReturn {
  // Data
  dashboard: CostDashboardData | undefined;
  summary: CostDashboardData['userSummary'] | undefined;
  dailyData: CostDashboardData['dailyData'];
  byModel: CostDashboardData['byModel'];
  conversations: CostDashboardData['conversations'];
  period: CostDashboardData['period'] | undefined;

  // State
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;

  // Loading/Error states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Actions
  refetch: () => void;
}

export function useAICosts(initialParams: UseAICostsParams = {}): UseAICostsReturn {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialParams.timeRange || 'month');

  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-costs-dashboard', timeRange, initialParams.startDate, initialParams.endDate],
    queryFn: () =>
      fetchCostDashboard({
        timeRange,
        startDate: initialParams.startDate,
        endDate: initialParams.endDate,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    retry: 2,
  });

  return {
    // Data
    dashboard,
    summary: dashboard?.userSummary,
    dailyData: dashboard?.dailyData || [],
    byModel: dashboard?.byModel || [],
    conversations: dashboard?.conversations || [],
    period: dashboard?.period,

    // State
    timeRange,
    setTimeRange,

    // Loading/Error states
    isLoading,
    isError,
    error: error as Error | null,

    // Actions
    refetch,
  };
}
