import { apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export type KSeFInvoiceStatus = 'pending' | 'sending' | 'sent' | 'accepted' | 'rejected' | 'completed' | 'failed';
export type KSeFAdapterType = 'wfirma' | 'direct';
export type KSeFEnvironment = 'test' | 'demo' | 'production';

export interface KSeFSendResult {
  success: boolean;
  referenceNumber?: string;
  status: KSeFInvoiceStatus;
  adapter: KSeFAdapterType;
  message: string;
  timestamp: string;
}

export interface KSeFStatusInfo {
  referenceNumber: string;
  invoiceNumber: string;
  status: KSeFInvoiceStatus;
  adapter: KSeFAdapterType;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  upoAvailable: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface KSeFUPOInfo {
  referenceNumber: string;
  fileName: string;
  timestamp: string;
}

export interface KSeFInvoiceListItem {
  referenceNumber: string;
  invoiceNumber: string;
  issueDate: string;
  contractorName: string;
  contractorNip?: string;
  totalGross: number;
  currency: string;
  status: KSeFInvoiceStatus;
  direction: 'sent' | 'received';
  adapter: KSeFAdapterType;
  errorCode?: string;
  errorMessage?: string;
}

export interface KSeFBulkSendResult {
  total: number;
  successful: number;
  failed: number;
  results: KSeFSendResult[];
}

export interface KSeFStatistics {
  totalSent: number;
  totalReceived: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  completedCount: number;
  lastSentAt?: string;
  lastReceivedAt?: string;
  byMonth: Array<{
    month: string;
    sent: number;
    received: number;
    accepted: number;
    rejected: number;
  }>;
}

export interface KSeFConfig {
  preferredAdapter: KSeFAdapterType;
  autoSendEnabled: boolean;
  autoSendOnCreate: boolean;
  environment: KSeFEnvironment;
  notifyOnAccepted: boolean;
  notifyOnRejected: boolean;
  notificationEmail?: string;
  ksefToken?: string;
  ksefNip?: string;
}

export interface KSeFInvoicesQuery {
  dateFrom?: string;
  dateTo?: string;
  status?: KSeFInvoiceStatus;
  direction?: 'sent' | 'received';
}

// ============================================
// API FUNCTIONS
// ============================================

export interface FA3Address {
  street: string;
  city: string;
  zip: string;
  country?: string;
}

export interface FA3Item {
  name: string;
  quantity: number;
  unit?: string;
  priceNet: number;
  vatRate: string; // TStawkaPodatku: "23","8","5","4","3","22","7","0 KR","0 WDT","0 EX","zw","oo","np I","np II"
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface SendRawInvoicePayload {
  invoiceNumber: string;
  issueDate: string;
  sellDate: string;
  dueDate: string;
  sellerName: string;
  sellerNip: string;
  sellerAddress: FA3Address;
  buyerName: string;
  buyerNip: string;
  buyerAddress: FA3Address;
  items: FA3Item[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency?: string;
  paymentMethod?: string;
  paymentAccount?: string;
}

export interface KSeFInvoiceDetails {
  adapter: KSeFAdapterType;
  invoicePayload: {
    invoiceNumber: string;
    issueDate: string;
    sellDate: string;
    dueDate: string;
    sellerName: string;
    sellerNip: string;
    sellerAddress: FA3Address;
    buyerName: string;
    buyerNip: string;
    buyerAddress: FA3Address;
    items: FA3Item[];
    totalNet: number;
    totalVat: number;
    totalGross: number;
    currency: string;
    paymentMethod: string;
    paymentAccount?: string;
  } | null;
}

/**
 * Send invoice to KSeF
 */
export const sendInvoiceToKSeF = async (invoiceId: string, adapter?: KSeFAdapterType): Promise<KSeFSendResult> => {
  return apiClient.post<KSeFSendResult>('/api/ksef/send', { invoiceId, adapter });
};

/**
 * Send raw invoice data directly to KSeF (no wFirma required)
 */
export const sendRawInvoiceToKSeF = async (payload: SendRawInvoicePayload): Promise<KSeFSendResult> => {
  return apiClient.post<KSeFSendResult>('/api/ksef/send-raw', payload);
};

/**
 * Get KSeF invoice status
 */
export const getKSeFStatus = async (referenceNumber: string): Promise<KSeFStatusInfo> => {
  return apiClient.get<KSeFStatusInfo>(`/api/ksef/status/${referenceNumber}`);
};

/**
 * Download KSeF UPO
 */
export const downloadKSeFUPO = async (referenceNumber: string): Promise<Blob> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/ksef/upo/${referenceNumber}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to download UPO');
  }
  return response.blob();
};

/**
 * Get KSeF invoices
 */
export const getKSeFInvoices = async (query?: KSeFInvoicesQuery): Promise<KSeFInvoiceListItem[]> => {
  const params = new URLSearchParams();
  if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query?.dateTo) params.set('dateTo', query.dateTo);
  if (query?.status) params.set('status', query.status);
  if (query?.direction) params.set('direction', query.direction);

  const qs = params.toString();
  return apiClient.get<KSeFInvoiceListItem[]>(`/api/ksef/invoices${qs ? `?${qs}` : ''}`);
};

/**
 * Get full invoice details (payload) for a specific KSeF invoice by reference number.
 * Used for the copy/duplicate invoice feature.
 */
export const getKSeFInvoiceDetails = async (referenceNumber: string): Promise<KSeFInvoiceDetails> => {
  return apiClient.get<KSeFInvoiceDetails>(`/api/ksef/invoices/${encodeURIComponent(referenceNumber)}`);
};

/**
 * Bulk send invoices to KSeF
 */
export const bulkSendToKSeF = async (
  invoiceIds: string[],
  continueOnError: boolean = true
): Promise<KSeFBulkSendResult> => {
  return apiClient.post<KSeFBulkSendResult>('/api/ksef/bulk/send', { invoiceIds, continueOnError });
};

/**
 * Get KSeF statistics
 */
export const getKSeFStatistics = async (): Promise<KSeFStatistics> => {
  return apiClient.get<KSeFStatistics>('/api/ksef/statistics');
};

/**
 * Get KSeF config
 */
export const getKSeFConfig = async (): Promise<KSeFConfig> => {
  return apiClient.get<KSeFConfig>('/api/ksef/config');
};

/**
 * Update KSeF config
 */
export const updateKSeFConfig = async (updates: Partial<KSeFConfig>): Promise<KSeFConfig> => {
  return apiClient.patch<KSeFConfig>('/api/ksef/config', updates);
};

/**
 * Download invoice from KSeF (PDF by default, or XML)
 */
export const downloadKSeFInvoice = async (
  referenceNumber: string,
  format: 'pdf' | 'xml' = 'pdf'
): Promise<Blob> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/ksef/invoices/${referenceNumber}/download?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  if (!response.ok) throw new Error('Failed to download invoice');
  return response.blob();
};

// ============================================
// KSEF CONTRACTOR TYPES & API
// ============================================

export interface KSeFContractor {
  id: string;
  name: string;
  nip?: string | null;
  email?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country: string;
  source: 'local' | 'wfirma' | 'company';
  wfirmaId?: string | null;
}

export interface CreateKSeFContractorPayload {
  name: string;
  nip?: string;
  email?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

export const getKSeFContractors = async (search?: string): Promise<KSeFContractor[]> => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiClient.get<KSeFContractor[]>(`/api/ksef/contractors${qs}`);
};

export const createKSeFContractor = async (data: CreateKSeFContractorPayload): Promise<KSeFContractor> => {
  return apiClient.post<KSeFContractor>('/api/ksef/contractors', data);
};

export const updateKSeFContractor = async (id: string, data: CreateKSeFContractorPayload): Promise<KSeFContractor> => {
  return apiClient.put<KSeFContractor>(`/api/ksef/contractors/${id}`, data);
};

export const deleteKSeFContractor = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/ksef/contractors/${id}`);
};

export const syncKSeFContractors = async (): Promise<void> => {
  await apiClient.post('/api/ksef/contractors/sync', {});
};

export const getKSeFCompany = async (): Promise<KSeFContractor | null> => {
  try {
    return await apiClient.get<KSeFContractor>('/api/ksef/company');
  } catch {
    return null;
  }
};
