import { apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalCost: number;
  totalTokens: number;
  totalConversations: number;
  ttsCost: number;
  ttsCharacters: number;
  ttsCalls: number;
}

export interface UserCosts {
  totalCost: number;
  totalTokens: number;
  conversationCount: number;
  runCount: number;
  ttsCost: number;
  ttsCharacters: number;
  ttsCalls: number;
}

export interface UserWithCosts {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  costs: UserCosts;
}

export interface UsersResponse {
  users: UserWithCosts[];
  total: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
}

export interface UserDetailResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: 'user' | 'admin';
    locale: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionEndDate: string | null;
    aiMessagesLimit: number;
    aiMessagesUsed: number;
    wfirmaRequestsLimit: number;
    wfirmaRequestsUsed: number;
    ttsCharactersUsed: number;
    ttsCostUsd: number;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  return apiClient.get<AdminDashboardStats>('/api/admin/dashboard');
}

export async function fetchUsers(params: GetUsersParams = {}): Promise<UsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);

  const queryString = query.toString();
  const url = queryString ? `/api/admin/users?${queryString}` : '/api/admin/users';
  return apiClient.get<UsersResponse>(url);
}

export async function fetchUserDetail(userId: string): Promise<UserDetailResponse> {
  return apiClient.get<UserDetailResponse>(`/api/admin/users/${userId}`);
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  await apiClient.patch(`/api/admin/users/${userId}/role`, { role });
}

// ============================================
// USER STATS TYPES
// ============================================

export type StatsRange = 'week' | 'month' | 'year';

export type ToolCategory = 'wfirma' | 'ksef' | 'memory' | 'hr' | 'org' | 'other';

export interface UserDeepStats {
  range: StatsRange;
  cost: {
    totalUsd: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    runCount: number;
    langsmithConversationCount: number;
    avgCostPerLangsmithConversation: number;
  };
  activityByDay: Array<{ date: string; toolCalls: number; conversations: number }>;
  conversations: { totalInRange: number };
  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>;
    byCategory: Array<{ category: ToolCategory; count: number }>;
  };
  channels: {
    web: { active: true };
    telegram: { active: boolean; linkedAt: string | null };
  };
  tts: { charactersUsed: number; costUsd: number };
  memories: { total: number; byCategory: Array<{ category: string; count: number }> };
  lastActivity: { lastConversationAt: string | null; lastToolCallAt: string | null };
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLogUser {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
}

export interface GetAuditLogParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// AUDIT LOG API FUNCTION
// ============================================

export async function fetchAuditLog(params: GetAuditLogParams = {}): Promise<AuditLogResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.userId) query.set('userId', params.userId);
  if (params.action) query.set('action', params.action);
  if (params.entity) query.set('entity', params.entity);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const queryString = query.toString();
  const url = queryString ? `/api/admin/audit-log?${queryString}` : '/api/admin/audit-log';
  return apiClient.get<AuditLogResponse>(url);
}

export async function fetchUserStats(userId: string, range: StatsRange): Promise<UserDeepStats> {
  return apiClient.get<UserDeepStats>(`/api/admin/users/${userId}/stats?range=${range}`);
}

export async function softDeleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/api/admin/users/${userId}`);
}

export async function hardDeleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/api/admin/users/${userId}/hard`);
}

export async function updateUserSubscription(
  userId: string,
  plan: 'free' | 'pro'
): Promise<{ id: string; subscriptionPlan: 'free' | 'pro' }> {
  return apiClient.patch<{ id: string; subscriptionPlan: 'free' | 'pro' }>(
    `/api/admin/users/${userId}/subscription`,
    { plan }
  );
}

export async function updateUserLimits(
  userId: string,
  body: { aiMessagesLimit?: number; wfirmaRequestsLimit?: number }
): Promise<{ id: string; aiMessagesLimit: number; wfirmaRequestsLimit: number }> {
  return apiClient.patch<{ id: string; aiMessagesLimit: number; wfirmaRequestsLimit: number }>(
    `/api/admin/users/${userId}/limits`,
    body
  );
}

export async function resetUserUsage(
  userId: string,
  type: 'ai' | 'wfirma' | 'both'
): Promise<{ id: string; aiMessagesUsed: number; wfirmaRequestsUsed: number }> {
  return apiClient.post<{ id: string; aiMessagesUsed: number; wfirmaRequestsUsed: number }>(
    `/api/admin/users/${userId}/reset-usage`,
    { type }
  );
}

export const adminApi = {
  fetchDashboard: fetchAdminDashboard,
  fetchUsers,
  fetchUserDetail,
  updateUserRole,
  fetchAuditLog,
  fetchUserStats,
  softDeleteUser,
  hardDeleteUser,
  updateUserSubscription,
  updateUserLimits,
  resetUserUsage,
};
