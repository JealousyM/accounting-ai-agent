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
  };
  conversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
  costData: any;
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

export const adminApi = {
  fetchDashboard: fetchAdminDashboard,
  fetchUsers,
  fetchUserDetail,
  updateUserRole,
};
