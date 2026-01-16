/**
 * wFirma API Types
 * Based on wFirma API documentation: https://doc.wfirma.pl
 */

// ============================================
// COMMON TYPES
// ============================================

export interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface BankAccount {
  accountNumber: string;
  bankName: string;
  swift?: string;
}

// ============================================
// COMPANY TYPES
// ============================================

export interface WFirmaCompany {
  id: string;
  name: string;
  nip: string;
  regon?: string;
  krs?: string;
  address: Address;
  bankAccounts: BankAccount[];
  email?: string;
  phone?: string;
  website?: string;
}

// ============================================
// CONTRACTOR TYPES
// ============================================

export interface WFirmaContractor {
  id: string;
  name: string;
  nip?: string;
  regon?: string;
  email?: string;
  phone?: string;
  address?: Address;
  bankAccount?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractorFilters {
  search?: string;
  nip?: string;
  limit?: number;
  offset?: number;
}

export interface ContractorData {
  name: string;
  nip?: string;
  regon?: string;
  email?: string;
  phone?: string;
  address?: Address;
  bankAccount?: string;
  notes?: string;
}

// ============================================
// FINANCIAL DATA TYPES
// ============================================

export interface FinancialData {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  taxPaid: number;
  vatPaid?: number;
  pitPaid?: number;
  zusPaid?: number;
}

// ============================================
// INVOICE TYPES
// ============================================

export interface WFirmaInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  sellDate?: Date;
  contractorId: string;
  contractorName: string;
  contractorNip?: string;
  items: WFirmaInvoiceItem[];
  total: number;
  totalNet: number;
  totalVat: number;
  currency: string;
  status: WFirmaInvoiceStatus;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WFirmaInvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  priceNet: number;
  vatRate: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export type WFirmaInvoiceStatus = 
  | 'draft' 
  | 'issued' 
  | 'sent' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled';

export interface WFirmaInvoiceFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: WFirmaInvoiceStatus;
  contractorId?: string;
  limit?: number;
  offset?: number;
}

export interface WFirmaInvoiceResponse {
  wfirmaId: string;
  invoiceNumber: string;
  status: string;
  downloadUrl: string;
}

// ============================================
// SYNC TYPES
// ============================================

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  itemsSynced: number;
  errors?: string[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface WFirmaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WFirmaApiError {
  code: string;
  message: string;
  details?: any;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface WFirmaConfig {
  accessKey: string;
  secretKey: string;
  appKey: string;
  apiUrl: string;
  companyId?: string;
  timeout?: number;
  retryAttempts?: number;
}
