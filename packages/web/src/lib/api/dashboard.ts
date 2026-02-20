/**
 * Dashboard API
 * Fetch functions for the KPI dashboard
 */

import { apiClient } from './api-client';
import { API_ENDPOINTS } from './endpoints';
import { DashboardSummaryResponse } from '@/types/dashboard.types';

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return apiClient.get<DashboardSummaryResponse>(API_ENDPOINTS.DASHBOARD.SUMMARY);
}
