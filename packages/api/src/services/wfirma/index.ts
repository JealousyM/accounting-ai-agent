/**
 * wFirma Integration Service
 * Main facade that combines all wFirma domain services
 */

import { logger } from '../../utils/logger';
import {
  WFirmaConfig,
  WFirmaCompany,
  WFirmaContractor,
  ContractorFilters,
  ContractorData,
  ContractorUpdateData,
  DeleteResult,
  FinancialData,
  SyncResult,
  WFirmaInvoice,
  WFirmaInvoiceFilters,
  SendInvoiceOptions,
  SendInvoiceResult,
  WFirmaNote,
} from '../../types/wfirma.types';

// Import domain services
import { WFirmaClient } from './client';
import { WFirmaCompanyService } from './company.service';
import { WFirmaContractorService } from './contractor.service';
import { WFirmaInvoiceService } from './invoice.service';
import { WFirmaNoteService } from './note.service';
import { WFirmaFinancialService } from './financial.service';
import { WFirmaSyncService } from './sync.service';

// Re-export errors
export {
  WFirmaError,
  WFirmaAuthenticationError,
  WFirmaConnectionError,
  WFirmaValidationError,
} from './errors';

// Re-export client
export { WFirmaClient, RetryConfig, DEFAULT_RETRY_CONFIG } from './client';

// Re-export domain services for direct use if needed
export { WFirmaCompanyService } from './company.service';
export { WFirmaContractorService } from './contractor.service';
export { WFirmaInvoiceService } from './invoice.service';
export { WFirmaNoteService } from './note.service';
export { WFirmaFinancialService } from './financial.service';
export { WFirmaSyncService } from './sync.service';

/**
 * Main WFirma Integration Service
 * Provides a unified API for all wFirma operations
 */
export class WFirmaIntegrationService {
  private readonly client: WFirmaClient;
  private readonly companyService: WFirmaCompanyService;
  private readonly contractorService: WFirmaContractorService;
  private readonly invoiceService: WFirmaInvoiceService;
  private readonly noteService: WFirmaNoteService;
  private readonly financialService: WFirmaFinancialService;
  private readonly syncService: WFirmaSyncService;

  constructor(config?: Partial<WFirmaConfig>) {
    // Initialize client
    this.client = new WFirmaClient(config);

    // Initialize domain services
    this.companyService = new WFirmaCompanyService(this.client);
    this.contractorService = new WFirmaContractorService(this.client);
    this.invoiceService = new WFirmaInvoiceService(this.client);
    this.noteService = new WFirmaNoteService(this.client);
    this.financialService = new WFirmaFinancialService(this.client);
    this.syncService = new WFirmaSyncService(
      this.companyService,
      this.contractorService,
      this.financialService
    );

    logger.info('WFirmaIntegrationService initialized');
  }

  // ============================================
  // COMPANY METHODS
  // ============================================

  async getCompanyData(): Promise<WFirmaCompany> {
    return this.companyService.getCompanyData();
  }

  // ============================================
  // CONTRACTOR METHODS
  // ============================================

  async getContractors(filters?: ContractorFilters): Promise<WFirmaContractor[]> {
    return this.contractorService.getContractors(filters);
  }

  async getContractorById(id: string): Promise<WFirmaContractor | null> {
    return this.contractorService.getContractorById(id);
  }

  async createContractor(data: ContractorData): Promise<WFirmaContractor> {
    return this.contractorService.createContractor(data);
  }

  async updateContractor(id: string, data: ContractorUpdateData): Promise<WFirmaContractor> {
    return this.contractorService.updateContractor(id, data);
  }

  async deleteContractor(id: string): Promise<DeleteResult> {
    return this.contractorService.deleteContractor(id);
  }

  // ============================================
  // INVOICE METHODS
  // ============================================

  async findInvoices(filters?: WFirmaInvoiceFilters): Promise<WFirmaInvoice[]> {
    return this.invoiceService.findInvoices(filters);
  }

  async getInvoiceById(id: string): Promise<WFirmaInvoice | null> {
    return this.invoiceService.getInvoiceById(id);
  }

  async sendInvoice(invoiceId: string, options?: SendInvoiceOptions): Promise<SendInvoiceResult> {
    return this.invoiceService.sendInvoice(invoiceId, options);
  }

  async deleteInvoiceDelivery(deliveryId: string): Promise<DeleteResult> {
    return this.invoiceService.deleteInvoiceDelivery(deliveryId);
  }

  // ============================================
  // NOTE METHODS
  // ============================================

  async addNote(objectName: string, objectId: string, text: string): Promise<WFirmaNote> {
    return this.noteService.addNote(objectName, objectId, text);
  }

  async getNote(noteId: string): Promise<WFirmaNote | null> {
    return this.noteService.getNote(noteId);
  }

  async findNotes(objectName: string, objectId: string): Promise<WFirmaNote[]> {
    return this.noteService.findNotes(objectName, objectId);
  }

  async editNote(noteId: string, text: string): Promise<WFirmaNote> {
    return this.noteService.editNote(noteId, text);
  }

  async deleteNote(noteId: string): Promise<DeleteResult> {
    return this.noteService.deleteNote(noteId);
  }

  // ============================================
  // FINANCIAL METHODS
  // ============================================

  async getFinancialData(year: number): Promise<FinancialData> {
    return this.financialService.getFinancialData(year);
  }

  // ============================================
  // SYNC METHODS
  // ============================================

  async syncDataFromWFirma(): Promise<SyncResult> {
    return this.syncService.syncDataFromWFirma();
  }

  async checkConnection(): Promise<boolean> {
    return this.syncService.checkConnection();
  }
}
