/**
 * IKSeFAdapter
 * Common interface for KSeF adapters (wFirma proxy, Direct API)
 */

import {
  SendToKSeFOptions,
  SendToKSeFResult,
  KSeFInvoiceStatusInfo,
  KSeFUPO,
  QueryKSeFInvoicesOptions,
  KSeFInvoiceListItem,
  BulkSendToKSeFOptions,
  BulkSendToKSeFResult,
} from '../../../types/ksef.types';

export interface IKSeFAdapter {
  /** Send invoice to KSeF */
  sendInvoice(userId: string, options: SendToKSeFOptions): Promise<SendToKSeFResult>;

  /** Check invoice status in KSeF */
  getInvoiceStatus(userId: string, referenceNumber: string): Promise<KSeFInvoiceStatusInfo>;

  /** Download UPO (official confirmation) */
  downloadUPO(userId: string, referenceNumber: string): Promise<KSeFUPO>;

  /** Query invoices (sent/received) from local DB */
  queryInvoices(userId: string, options: QueryKSeFInvoicesOptions): Promise<KSeFInvoiceListItem[]>;

  /** Bulk send invoices */
  bulkSendInvoices(userId: string, options: BulkSendToKSeFOptions): Promise<BulkSendToKSeFResult>;

  /**
   * Fetch incoming (received) invoices from KSeF API and save to local DB.
   * Opens a session, queries subject2 invoices, saves new ones, returns all received.
   * Not all adapters may support this — returns empty array if not supported.
   */
  fetchIncomingInvoices?(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<KSeFInvoiceListItem[]>;

  /**
   * Download invoice from KSeF (PDF or XML).
   * Not all adapters may support this.
   */
  downloadInvoice?(
    userId: string,
    referenceNumber: string,
    format?: 'pdf' | 'xml'
  ): Promise<{ content: Buffer; fileName: string; contentType: string }>;
}
