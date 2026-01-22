import { apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export interface CredentialsSummary {
  wfirma: {
    enabled: boolean;
    companyId?: string; // Masked
    lastValidated?: string;
  };
  llm: {
    provider: 'openai' | 'anthropic' | null;
    hasCustomKey: boolean;
    lastValidated?: string;
  };
}

export interface WFirmaCredentialsInput {
  accessKey: string;
  secretKey: string;
  companyId: string;
}

export interface LLMCredentialsInput {
  provider: 'openai' | 'anthropic';
  apiKey: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current user's credentials summary (masked values)
 * Note: apiClient unwraps the response, returning data directly
 */
export const getCredentials = async (): Promise<CredentialsSummary> => {
  return apiClient.get<CredentialsSummary>('/api/credentials');
};

/**
 * Set wFirma credentials
 */
export const setWFirmaCredentials = async (credentials: WFirmaCredentialsInput): Promise<void> => {
  await apiClient.put('/api/credentials/wfirma', credentials);
};

/**
 * Remove wFirma credentials
 */
export const deleteWFirmaCredentials = async (): Promise<void> => {
  await apiClient.delete('/api/credentials/wfirma');
};

/**
 * Set LLM credentials
 */
export const setLLMCredentials = async (credentials: LLMCredentialsInput): Promise<void> => {
  await apiClient.put('/api/credentials/llm', credentials);
};

/**
 * Remove LLM credentials
 */
export const deleteLLMCredentials = async (): Promise<void> => {
  await apiClient.delete('/api/credentials/llm');
};
