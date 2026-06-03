import { apiClient } from './api-client';

export interface PromptShortcut {
  id: string;
  label: string;
  prompt: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const getShortcuts = (): Promise<PromptShortcut[]> =>
  apiClient.get<PromptShortcut[]>('/api/ai/shortcuts');

export const createShortcut = (data: { label: string; prompt: string }): Promise<PromptShortcut> =>
  apiClient.post<PromptShortcut>('/api/ai/shortcuts', data);

export const updateShortcut = (
  id: string,
  data: { label?: string; prompt?: string; sortOrder?: number }
): Promise<PromptShortcut> =>
  apiClient.put<PromptShortcut>(`/api/ai/shortcuts/${id}`, data);

export const deleteShortcut = (id: string): Promise<void> =>
  apiClient.delete(`/api/ai/shortcuts/${id}`);

export const reorderShortcuts = (ids: string[]): Promise<void> =>
  apiClient.put('/api/ai/shortcuts/reorder', { ids });
