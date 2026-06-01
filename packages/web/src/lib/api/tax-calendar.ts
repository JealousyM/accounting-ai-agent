import { apiClient } from './api-client';
import { API_ENDPOINTS } from './endpoints';
import { UpcomingTaxDeadlinesResponse } from '@/types/tax-calendar.types';

export async function fetchUpcomingTaxDeadlines(
  locale: string = 'pl',
  days: number = 14,
): Promise<UpcomingTaxDeadlinesResponse> {
  return apiClient.get<UpcomingTaxDeadlinesResponse>(
    `${API_ENDPOINTS.TAX_CALENDAR.UPCOMING}?days=${days}&locale=${locale}`,
  );
}
