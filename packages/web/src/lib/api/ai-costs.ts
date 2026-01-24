/**
 * AI Costs API Client
 * Functions for interacting with AI cost tracking endpoints
 */

import axios from 'axios';
import { API_ENDPOINTS } from './endpoints';
import {
  CostDashboardData,
  UserCostSummary,
  DailyCostData,
  CostByModel,
  ConversationCost,
  ConversationCostDetail,
  RunCostDetail,
  TimeRange,
  ApiResponse,
} from '@/types/ai-costs.types';
import { API_URL } from '@/lib/config';

// ============================================
// HELPERS
// ============================================

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    Authorization: `Bearer ${token}`,
  };
};

interface CostQueryParams {
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

const buildQueryString = (params?: CostQueryParams): string => {
  if (!params) return '';

  const query = new URLSearchParams();
  if (params.timeRange) query.append('timeRange', params.timeRange);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());

  const queryStr = query.toString();
  return queryStr ? `?${queryStr}` : '';
};

// ============================================
// USER-LEVEL API FUNCTIONS
// ============================================

/**
 * Get full dashboard data: user summary, daily costs, model breakdown, conversations
 */
export const fetchCostDashboard = async (
  params?: CostQueryParams
): Promise<CostDashboardData> => {
  const response = await axios.get<ApiResponse<CostDashboardData>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.DASHBOARD}${buildQueryString(params)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

/**
 * Get user cost summary only
 */
export const fetchCostSummary = async (
  params?: CostQueryParams
): Promise<UserCostSummary> => {
  const response = await axios.get<ApiResponse<UserCostSummary>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.SUMMARY}${buildQueryString(params)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

/**
 * Get daily cost breakdown
 */
export const fetchDailyCosts = async (
  params?: CostQueryParams
): Promise<DailyCostData[]> => {
  const response = await axios.get<ApiResponse<DailyCostData[]>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.DAILY}${buildQueryString(params)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

/**
 * Get cost breakdown by model
 */
export const fetchCostsByModel = async (
  params?: CostQueryParams
): Promise<CostByModel[]> => {
  const response = await axios.get<ApiResponse<CostByModel[]>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.BY_MODEL}${buildQueryString(params)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

// ============================================
// CONVERSATION-LEVEL API FUNCTIONS
// ============================================

/**
 * Get all conversations with costs
 */
export const fetchConversationCosts = async (
  params?: CostQueryParams
): Promise<ConversationCost[]> => {
  const response = await axios.get<ApiResponse<ConversationCost[]>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.CONVERSATIONS}${buildQueryString(params)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

/**
 * Get detailed cost data for a single conversation
 */
export const fetchConversationDetail = async (
  conversationId: string
): Promise<ConversationCostDetail> => {
  const response = await axios.get<ApiResponse<ConversationCostDetail>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.CONVERSATION_DETAIL(conversationId)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

/**
 * Get individual runs for a conversation
 */
export const fetchConversationRuns = async (
  conversationId: string
): Promise<RunCostDetail[]> => {
  const response = await axios.get<ApiResponse<RunCostDetail[]>>(
    `${API_URL}${API_ENDPOINTS.AI_COSTS.CONVERSATION_RUNS(conversationId)}`,
    { headers: getAuthHeaders() }
  );
  return response.data.data!;
};

// ============================================
// EXPORT ALL
// ============================================

export const aiCostsApi = {
  fetchDashboard: fetchCostDashboard,
  fetchSummary: fetchCostSummary,
  fetchDailyCosts,
  fetchCostsByModel,
  fetchConversationCosts,
  fetchConversationDetail,
  fetchConversationRuns,
};
