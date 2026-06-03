import axios from 'axios';
import { API_ENDPOINTS } from './endpoints';
import { UserAnalytics, AnalyticsRange, ApiResponse } from '@/types/user-analytics.types';
import { API_URL } from '@/lib/config';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return { Authorization: `Bearer ${token}` };
};

export const fetchUserAnalytics = async (range: AnalyticsRange = 'month'): Promise<UserAnalytics> => {
  const response = await axios.get<ApiResponse<UserAnalytics>>(
    `${API_URL}${API_ENDPOINTS.USERS.ANALYTICS}?range=${range}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};
