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

// ============================================
// EXPENSE TYPES
// ============================================

export type ExpenseType = 'invoice' | 'bill' | 'vat_exempt';
export type AccountingEffect = 'kpir_and_vat' | 'kpir' | 'vat' | 'nothing';
export type WarehouseType = 'simple' | 'extended';
export type TaxEvaluationMethod = 'netto' | 'brutto';
export type ExpensePartType = 'rates' | 'positions';
export type ExpenseSchema = 'cost' | 'purchase_trade_goods' | 'vehicle_fuel' | 'vehicle_expense';

export interface WFirmaExpense {
  id: string;
  type: ExpenseType;
  date: Date;
  taxregisterDate?: Date;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  paid: boolean;
  alreadypaidInitial: number;
  currency: string;
  accountingEffect: AccountingEffect;
  warehouseType?: WarehouseType;
  schemaVatCashbox: boolean;
  wnt: boolean;
  serviceImport: boolean;
  serviceImport2: boolean;
  cargoImport: boolean;
  splitPayment: boolean;
  draft: boolean;
  taxEvaluationMethod: TaxEvaluationMethod;

  // Related objects
  contractorId?: string;
  contractorName?: string;
  contractorNip?: string;

  // Totals
  total: number;
  totalNet: number;
  totalVat: number;

  // Parts/items
  parts: WFirmaExpensePart[];

  createdAt: Date;
  updatedAt: Date;
}

export interface WFirmaExpensePart {
  id: string;
  expensePartType: ExpensePartType;
  schema: ExpenseSchema;
  goodAction?: string;
  goodId?: string;
  name?: string;
  unit?: string;
  unitId?: string;
  count: number;
  price: number;
  vatCode: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface ExpenseFilters {
  dateFrom?: Date;
  dateTo?: Date;
  contractorId?: string;
  contractorName?: string;
  paid?: boolean;
  type?: ExpenseType;
  accountingEffect?: AccountingEffect;
  limit?: number;
  offset?: number;
}

// ============================================
// VEHICLE TYPES
// ============================================

export type VehicleType = 'truck' | 'car' | 'motor' | 'motor-bike';
export type VehicleOwnership = 'leasing' | 'private' | 'other';
export type TruckType = 'normal' | 'quasi';
export type TaxPurpose = 'mixed' | 'company';

export interface WFirmaVehicle {
  id: string;
  name: string;
  register: string;
  type: VehicleType;
  ownership: VehicleOwnership;
  truckType?: TruckType;
  taxPurpose?: TaxPurpose;
  vatLeasingBelowLimit?: boolean;
  vatLeasingDate?: Date;
  vatLeasingValue?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleFilters {
  search?: string;
  type?: VehicleType;
  ownership?: VehicleOwnership;
  limit?: number;
  offset?: number;
}

export interface VehicleData {
  name: string;
  register: string;
  type: VehicleType;
  ownership: VehicleOwnership;
  truckType?: TruckType;
  taxPurpose?: TaxPurpose;
  vatLeasingBelowLimit?: boolean;
  vatLeasingDate?: Date;
  vatLeasingValue?: number;
}

export interface VehicleUpdateData extends Partial<VehicleData> {}

// ============================================
// TERM TYPES (Appointments/Deadlines)
// ============================================

export type TermType = 'normal' | 'cycle_day_of_week' | 'cycle_day_of_month';

export interface WFirmaTerm {
  id: string;
  date: Date;
  hour?: string;
  description?: string;
  groupId?: string;
  type: TermType;
  contractorId?: string;
  contactId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TermFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: TermType;
  groupId?: string;
  contractorId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TermData {
  date: Date;
  hour?: string;
  description?: string;
  termGroupId?: string;
  type?: TermType;
  contractorId?: string;
  contactId?: string;
}

export interface TermUpdateData extends Partial<TermData> {}

// ============================================
// TERM GROUP TYPES
// ============================================

export interface WFirmaTermGroup {
  id: string;
  name: string;
  isReadonly: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TermGroupFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TermGroupData {
  name: string;
  isReadonly?: boolean;
}

export interface TermGroupUpdateData extends Partial<TermGroupData> {}
