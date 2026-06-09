import { apiClient } from './api-client';

export interface OrgPromptShortcut {
  id: string;
  label: string;
  prompt: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const getOrgShortcuts = (): Promise<OrgPromptShortcut[]> =>
  apiClient.get<OrgPromptShortcut[]>('/api/organization/shortcuts');

export const createOrgShortcut = (data: { label: string; prompt: string }): Promise<OrgPromptShortcut> =>
  apiClient.post<OrgPromptShortcut>('/api/organization/shortcuts', data);

export const updateOrgShortcut = (
  id: string,
  data: { label?: string; prompt?: string; sortOrder?: number }
): Promise<OrgPromptShortcut> =>
  apiClient.put<OrgPromptShortcut>(`/api/organization/shortcuts/${id}`, data);

export const deleteOrgShortcut = (id: string): Promise<void> =>
  apiClient.delete(`/api/organization/shortcuts/${id}`);
