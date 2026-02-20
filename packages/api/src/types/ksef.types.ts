/**
 * KSeF (Krajowy System e-Faktur) Type Definitions
 * Types for Polish National e-Invoice System integration
 */

export type KSeFEnvironment = 'test' | 'demo' | 'production';

export type KSeFInvoiceStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'failed';

export type KSeFAdapterType = 'wfirma' | 'direct';

export type KSeFInvoiceDirection = 'sent' | 'received';

// Session
export interface KSeFSessionInfo {
  sessionToken: string;
  expiresAt: Date;
  environment: KSeFEnvironment;
}

export interface KSeFSessionConfig {
  certificateData: Buffer;
  certificatePassword: string;
  environment: KSeFEnvironment;
}

// Send
export interface SendToKSeFOptions {
  /** wFirma invoice ID — required when using wFirma adapter or when invoice data is not provided directly */
  invoiceId?: string;
  adapter?: KSeFAdapterType;
  /** Provide invoice data directly to bypass wFirma lookup (required when wFirma is not connected) */
  invoiceData?: FA3InvoiceData;
}

export interface SendToKSeFResult {
  success: boolean;
  referenceNumber?: string;
  status: KSeFInvoiceStatus;
  adapter: KSeFAdapterType;
  message: string;
  timestamp: Date;
  isDuplicate?: boolean;
}

// Status
export interface KSeFInvoiceStatusInfo {
  referenceNumber: string;
  invoiceNumber: string;
  status: KSeFInvoiceStatus;
  adapter: KSeFAdapterType;
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  upoAvailable: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// UPO
export interface KSeFUPO {
  referenceNumber: string;
  upoContent: Buffer;
  timestamp: Date;
  fileName: string;
}

// Query
export interface QueryKSeFInvoicesOptions {
  dateFrom?: Date;
  dateTo?: Date;
  status?: KSeFInvoiceStatus;
  direction?: KSeFInvoiceDirection;
  limit?: number;
  offset?: number;
}

export interface KSeFInvoiceListItem {
  referenceNumber: string;
  invoiceNumber: string;
  issueDate: Date;
  contractorName: string;
  contractorNip?: string;
  totalGross: number;
  currency: string;
  status: KSeFInvoiceStatus;
  direction: KSeFInvoiceDirection;
  adapter: KSeFAdapterType;
  errorCode?: string;
  errorMessage?: string;
}

// Bulk
export interface BulkSendToKSeFOptions {
  invoiceIds: string[];
  adapter?: KSeFAdapterType;
  continueOnError?: boolean;
}

export interface BulkSendToKSeFResult {
  total: number;
  successful: number;
  failed: number;
  results: SendToKSeFResult[];
}

// Statistics
export interface KSeFStatistics {
  totalSent: number;
  totalReceived: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  completedCount: number;
  lastSentAt?: Date;
  lastReceivedAt?: Date;
  byMonth: KSeFMonthlyStats[];
}

export interface KSeFMonthlyStats {
  month: string; // YYYY-MM
  sent: number;
  received: number;
  accepted: number;
  rejected: number;
}

// FA(3) XML generation
export interface FA3InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  sellDate: Date;
  dueDate: Date;
  sellerName: string;
  sellerNip: string;
  sellerAddress: FA3Address;
  buyerName: string;
  buyerNip: string;
  buyerAddress: FA3Address;
  items: FA3InvoiceItem[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency: string;
  paymentMethod: string;
  paymentAccount?: string;
  /** Invoice type: 'VAT' (standard), 'KOR' (correction), 'ZAL' (advance), 'ROZ' (settlement) */
  invoiceType?: 'VAT' | 'KOR' | 'ZAL' | 'ROZ';
  /** Whether invoice has been paid: true = yes, false = no (default: false) */
  isPaid?: boolean;
  /** FA(3) Adnotacje (Annotations) - all default to false/not applicable (value 2) */
  annotations?: FA3Annotations;
}

/**
 * FA(3) Adnotacje (Annotations)
 * Controls flags P_16 through P_23 in the XML.
 * All values: true = applies (1), false = does not apply (2).
 * Default for all: false (2).
 */
export interface FA3Annotations {
  /** P_16: Cash method of accounting (metoda kasowa) */
  cashMethod?: boolean;
  /** P_17: Self-billing invoice (samofakturowanie) */
  selfBilling?: boolean;
  /** P_18: Reverse charge (odwrotne obciazenie) */
  reverseCharge?: boolean;
  /** P_18A: Split payment mechanism (mechanizm podzielonej platnosci) */
  splitPayment?: boolean;
  /** P_22: Intra-community supply of goods (WDT) */
  intraCommunitySupply?: boolean;
  /** P_23: Margin scheme for tourism services (uslugi turystyki) */
  marginSchemeTourism?: boolean;
}

export interface FA3Address {
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface FA3InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  priceNet: number;
  vatRate: string; // TStawkaPodatku: "23","8","5","4","3","22","7","0 KR","0 WDT","0 EX","zw","oo","np I","np II"
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

// Config
export interface KSeFUserConfig {
  preferredAdapter: KSeFAdapterType;
  autoSendEnabled: boolean;
  autoSendOnCreate: boolean;
  environment: KSeFEnvironment;
  defaultCertId?: string;
  notifyOnAccepted: boolean;
  notifyOnRejected: boolean;
  notificationEmail?: string;
  ksefToken?: string;   // Authorization token from KSeF portal
  ksefNip?: string;     // NIP for KSeF direct API session
}

// Incoming match
export interface KSeFIncomingMatchedInvoice {
  wfirmaInvoiceId: string;
  invoiceNumber: string;
  contractorName: string;
  totalGross: number;
  currency: string;
  issueDate: Date;
}

export interface KSeFIncomingMatch {
  referenceNumber: string;
  ksefInvoiceNumber: string;
  matched: boolean;
  matchCount: number;
  matchedInvoices: KSeFIncomingMatchedInvoice[];
}
