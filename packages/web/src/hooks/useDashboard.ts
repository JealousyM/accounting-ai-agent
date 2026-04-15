'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '@/lib/api/dashboard';
import type {
  DashboardSummaryResponse,
  DashboardFinancialSummary,
  DashboardInvoiceSummary,
  DashboardDeadline,
  DashboardKSeFSummary,
} from '@/types/dashboard.types';

interface UseDashboardReturn {
  summary: DashboardSummaryResponse | undefined;
  financial: DashboardFinancialSummary | null;
  invoices: DashboardInvoiceSummary | null;
  deadlines: DashboardDeadline[] | null;
  ksef: DashboardKSeFSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });

  return {
    summary,
    financial: summary?.financial ?? null,
    invoices: summary?.invoices ?? null,
    deadlines: summary?.deadlines ?? null,
    ksef: summary?.ksef ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
