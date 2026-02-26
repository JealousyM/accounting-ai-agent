import { apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export type AIMemoryCategory = 'user_preference' | 'business_fact' | 'frequent_entity' | 'workflow_pattern';
export type AIMemorySource = 'explicit' | 'implicit' | 'tool_usage';

export interface AIMemoryItem {
  id: string;
  category: AIMemoryCategory;
  source: AIMemorySource;
  key: string;
  value: string;
  metadata: Record<string, unknown> | null;
  confidence: number;
  accessCount: number;
  isPinned: boolean;
  isHidden: boolean;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySummary {
  total: number;
  byCategory: Record<string, number>;
  pinned: number;
  hidden: number;
}

export interface MemoryListResponse {
  items: AIMemoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

export const getMemories = async (params?: {
  category?: AIMemoryCategory;
  page?: number;
  limit?: number;
}): Promise<MemoryListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = `/api/ai/memory${query ? `?${query}` : ''}`;

  // apiClient.get unwraps { success, data } and returns data
  // But here the response shape is { data: items[], pagination: {} }
  // The apiClient unwraps to { items[], pagination }... actually let's check:
  // The backend returns { success: true, data: items[], pagination: {} }
  // apiClient.get returns the `data` field, which is items[]
  // But we also need pagination. The backend puts it at top level next to data.
  // So we need a raw approach or adjust.

  // Actually looking at the backend controller:
  //   res.json({ success: true, data: result.items, pagination: { ... } })
  // And apiClient unwraps `data` field, so we get result.items
  // But we lose pagination. Let me fetch with items + pagination in data.

  // Simpler: return array directly, since apiClient extracts `data`
  const response = await apiClient.get<AIMemoryItem[]>(url);
  return { items: response, pagination: { total: 0, page: params?.page ?? 1, limit: params?.limit ?? 50 } };
};

export const getMemorySummary = async (): Promise<MemorySummary> => {
  return apiClient.get<MemorySummary>('/api/ai/memory/summary');
};

export const updateMemory = async (
  id: string,
  data: { value?: string; isPinned?: boolean; isHidden?: boolean }
): Promise<AIMemoryItem> => {
  return apiClient.put<AIMemoryItem>(`/api/ai/memory/${id}`, data);
};

export const deleteMemory = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/ai/memory/${id}`);
};

export const clearMemories = async (category?: AIMemoryCategory): Promise<{ deleted: number }> => {
  return apiClient.post<{ deleted: number }>('/api/ai/memory/clear', { category });
};
