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
// COMPANY ACCOUNTS TYPES
// ============================================

export interface WFirmaCompanyAccount {
  id: string;
  accountNumber: string;
  bankName?: string;
  swift?: string;
  isDefault: boolean;
  currency?: string;
}

// ============================================
// COMPANY ADDRESSES TYPES
// ============================================

export type CompanyAddressType = 'main' | 'correspondence' | 'other';

export interface WFirmaCompanyAddress {
  id: string;
  type: CompanyAddressType;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  isMain: boolean;
}

// ============================================
// COMPANY PACKS (SUBSCRIPTION) TYPES
// ============================================

export type CompanyPackType = 'pack_trade' | 'pack_tradew' | 'pack_book' | 'pack_bookw';

export interface WFirmaCompanyPack {
  id: string;
  pack: CompanyPackType;
  months: number;
  expirationDate: Date;
  status: string;
  created: Date;
  modified: Date;
}

// ============================================
// COMPANY DETAILS (AGGREGATED)
// ============================================

export interface WFirmaCompanyDetails extends WFirmaCompany {
  accounts: WFirmaCompanyAccount[];
  addresses: WFirmaCompanyAddress[];
  pack?: WFirmaCompanyPack;
}

// ============================================
// USER TYPES
// ============================================

export interface WFirmaUser {
  id: string;
  name: string;
  email?: string;
  login?: string;
  role?: string;
  isActive: boolean;
}

// ============================================
// USER COMPANY TYPES
// ============================================

export interface WFirmaUserCompany {
  id: string;
  userId: string;
  companyId: string;
  role?: string;
  permissions?: string;
  created?: Date;
  modified?: Date;
}

export interface UserCompanyFilters {
  limit?: number;
  page?: number;
  conditions?: Record<string, unknown>;
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

/**
 * Data for updating an existing contractor
 * All fields are optional since partial updates are supported
 */
export interface ContractorUpdateData {
  name?: string;
  nip?: string;
  regon?: string;
  email?: string;
  phone?: string;
  address?: Partial<Address>;
  bankAccount?: string;
  notes?: string;
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
  success: boolean;
  id: string;
  message?: string;
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
  | 'unpaid'
  | 'overdue'
  | 'cancelled';

export type InvoiceType = 'normal' | 'proforma' | 'correction' | 'vat' | 'purchase';

export interface WFirmaInvoiceFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: WFirmaInvoiceStatus;
  type?: InvoiceType;
  contractorId?: string;
  invoiceNumber?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'dueDate' | 'total' | 'invoiceNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface SendInvoiceOptions {
  email?: string;
  subject?: string;
  body?: string;
  page?: 'invoice' | 'original' | 'copy';
  leaflet?: boolean;
  duplicate?: boolean;
}

export interface SendInvoiceResult {
  success: boolean;
  invoiceId: string;
  deliveryId?: string;
  email: string;
  sentAt: Date;
  message?: string;
}

export interface WFirmaNote {
  id: string;
  objectName: string;
  objectId: string;
  text: string;
  created: Date;
  modified: Date;
}

export interface NoteData {
  objectName: string;
  objectId: string;
  text: string;
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

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentMethod =
  | 'transfer'
  | 'cash'
  | 'card'
  | 'compensation'
  | 'other';

export type PaymentAccount = 'currency' | 'pln';

export interface WFirmaPayment {
  id: string;
  objectName: 'invoice' | 'expense';
  objectId: string;
  value: number;
  currency?: string;
  valuePln?: number;
  account?: PaymentAccount;
  date: Date;
  paymentMethod?: PaymentMethod;
  paymentType?: string;
  initial: boolean;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentFilters {
  objectName?: 'invoice' | 'expense';
  objectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentData {
  objectName: 'invoice' | 'expense';
  objectId: string;
  value: number;
  account?: PaymentAccount;
  valuePln?: number;
  date: Date;
  paymentMethod?: PaymentMethod;
}

export interface PaymentUpdateData {
  value?: number;
  account?: PaymentAccount;
  valuePln?: number;
  date?: Date;
  paymentMethod?: PaymentMethod;
}
