/**
 * wFirma Integration Service
 * Main facade that combines all wFirma domain services
 */

import { logger } from '../../utils/logger';
import {
  WFirmaConfig,
  WFirmaCompany,
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
  WFirmaCompanyPack,
  WFirmaCompanyDetails,
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
  InvoiceDownloadOptions,
  InvoiceDownloadResult,
  CreateInvoiceData,
  UpdateInvoiceData,
  FiscalizeResult,
  WFirmaNote,
  WFirmaUser,
  WFirmaUserCompany,
  UserCompanyFilters,
  WFirmaPayment,
  PaymentFilters,
  PaymentData,
  PaymentUpdateData,
  WFirmaExpense,
  ExpenseFilters,
  CreateExpenseData,
  WFirmaVehicle,
  VehicleFilters,
  VehicleData,
  VehicleUpdateData,
  WFirmaTerm,
  TermFilters,
  TermData,
  TermUpdateData,
  WFirmaTermGroup,
  TermGroupFilters,
  TermGroupData,
  TermGroupUpdateData,
  JpkVatParams,
  PitParams,
  DeclarationResult,
  WFirmaDocument,
  DocumentFilters,
  DocumentData,
  WFirmaLedgerAccountantYear,
  LedgerAccountantYearFilters,
  WFirmaLedgerOperationSchema,
  LedgerOperationSchemaFilters,
  TaxRegisterParams,
  TaxRegisterResult,
} from '../../types/wfirma.types';

// Import domain services
import { WFirmaClient } from './client';
import { WFirmaCompanyService } from './company.service';
import { WFirmaContractorService } from './contractor.service';
import { WFirmaInvoiceService } from './invoice.service';
import { WFirmaNoteService } from './note.service';
import { WFirmaFinancialService } from './financial.service';
import { WFirmaSyncService } from './sync.service';
import { WFirmaUserService } from './user.service';
import { WFirmaPaymentService } from './payment.service';
import { WFirmaExpenseService } from './expense.service';
import { WFirmaVehicleService } from './vehicle.service';
import { WFirmaTermService } from './term.service';
import { WFirmaTermGroupService } from './term-group.service';
import { WFirmaDeclarationService } from './declaration.service';
import { WFirmaDocumentService } from './document.service';
import { WFirmaLedgerService } from './ledger.service';
import { WFirmaTaxRegisterService } from './taxregister.service';

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
export { mapInvoiceData, extractInvoiceFromResponse } from './invoice.mapper';
export { WFirmaNoteService } from './note.service';
export { WFirmaFinancialService } from './financial.service';
export { WFirmaSyncService } from './sync.service';
export { WFirmaUserService } from './user.service';
export { WFirmaPaymentService } from './payment.service';
export { WFirmaExpenseService } from './expense.service';
export { WFirmaVehicleService } from './vehicle.service';
export { WFirmaTermService } from './term.service';
export { WFirmaTermGroupService } from './term-group.service';
export { WFirmaDeclarationService } from './declaration.service';
export { WFirmaDocumentService } from './document.service';
export { WFirmaLedgerService } from './ledger.service';
export { WFirmaTaxRegisterService } from './taxregister.service';

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
  private readonly userService: WFirmaUserService;
  private readonly paymentService: WFirmaPaymentService;
  private readonly expenseService: WFirmaExpenseService;
  private readonly vehicleService: WFirmaVehicleService;
  private readonly termService: WFirmaTermService;
  private readonly termGroupService: WFirmaTermGroupService;
  private readonly declarationService: WFirmaDeclarationService;
  private readonly documentService: WFirmaDocumentService;
  private readonly ledgerService: WFirmaLedgerService;
  private readonly taxRegisterService: WFirmaTaxRegisterService;

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
    this.userService = new WFirmaUserService(this.client);
    this.paymentService = new WFirmaPaymentService(this.client);
    this.expenseService = new WFirmaExpenseService(this.client);
    this.vehicleService = new WFirmaVehicleService(this.client);
    this.termService = new WFirmaTermService(this.client);
    this.termGroupService = new WFirmaTermGroupService(this.client);
    this.declarationService = new WFirmaDeclarationService(this.client);
    this.documentService = new WFirmaDocumentService(this.client);
    this.ledgerService = new WFirmaLedgerService(this.client);
    this.taxRegisterService = new WFirmaTaxRegisterService(this.client);

    logger.info('WFirmaIntegrationService initialized');
  }

  // ============================================
  // COMPANY METHODS
  // ============================================

  async getCompanyData(): Promise<WFirmaCompany> {
    return this.companyService.getCompanyData();
  }

  async getCompanyAccounts(): Promise<WFirmaCompanyAccount[]> {
    return this.companyService.getCompanyAccounts();
  }

  async getCompanyAddresses(): Promise<WFirmaCompanyAddress[]> {
    return this.companyService.getCompanyAddresses();
  }

  async getCompanyPack(): Promise<WFirmaCompanyPack | null> {
    return this.companyService.getCompanyPack();
  }

  async getCompanyDetails(): Promise<WFirmaCompanyDetails> {
    return this.companyService.getCompanyDetails();
  }

  // ============================================
  // USER METHODS
  // ============================================

  async getUsers(): Promise<WFirmaUser[]> {
    return this.userService.getUsers();
  }

  async findUserCompanies(filters?: UserCompanyFilters): Promise<WFirmaUserCompany[]> {
    return this.userService.findUserCompanies(filters);
  }

  async getUserCompanyById(id: string): Promise<WFirmaUserCompany | null> {
    return this.userService.getUserCompanyById(id);
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

  async downloadInvoice(
    invoiceId: string,
    options?: InvoiceDownloadOptions
  ): Promise<InvoiceDownloadResult> {
    return this.invoiceService.downloadInvoice(invoiceId, options);
  }

  async createInvoice(data: CreateInvoiceData): Promise<WFirmaInvoice> {
    return this.invoiceService.createInvoice(data);
  }

  async updateInvoice(id: string, data: UpdateInvoiceData): Promise<WFirmaInvoice> {
    return this.invoiceService.updateInvoice(id, data);
  }

  async deleteInvoice(id: string): Promise<DeleteResult> {
    return this.invoiceService.deleteInvoice(id);
  }

  async fiscalizeInvoice(id: string): Promise<FiscalizeResult> {
    return this.invoiceService.fiscalizeInvoice(id);
  }

  async unfiscalizeInvoice(id: string): Promise<FiscalizeResult> {
    return this.invoiceService.unfiscalizeInvoice(id);
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

  // ============================================
  // PAYMENT METHODS
  // ============================================

  async findPayments(filters?: PaymentFilters): Promise<WFirmaPayment[]> {
    return this.paymentService.findPayments(filters);
  }

  async getPayment(id: string): Promise<WFirmaPayment | null> {
    return this.paymentService.getPayment(id);
  }

  async createPayment(data: PaymentData): Promise<WFirmaPayment> {
    return this.paymentService.createPayment(data);
  }

  async updatePayment(
    id: string,
    data: PaymentUpdateData
  ): Promise<WFirmaPayment> {
    return this.paymentService.updatePayment(id, data);
  }

  async deletePayment(id: string): Promise<DeleteResult> {
    return this.paymentService.deletePayment(id);
  }

  // ============================================
  // EXPENSE METHODS
  // ============================================

  async findExpenses(filters?: ExpenseFilters): Promise<WFirmaExpense[]> {
    return this.expenseService.findExpenses(filters);
  }

  async getExpense(id: string): Promise<WFirmaExpense | null> {
    return this.expenseService.getExpense(id);
  }

  async createExpense(data: CreateExpenseData): Promise<WFirmaExpense> {
    return this.expenseService.createExpense(data);
  }

  // ============================================
  // VEHICLE METHODS
  // ============================================

  async findVehicles(filters?: VehicleFilters): Promise<WFirmaVehicle[]> {
    return this.vehicleService.findVehicles(filters);
  }

  async getVehicle(id: string): Promise<WFirmaVehicle | null> {
    return this.vehicleService.getVehicle(id);
  }

  async createVehicle(data: VehicleData): Promise<WFirmaVehicle> {
    return this.vehicleService.createVehicle(data);
  }

  async updateVehicle(id: string, data: VehicleUpdateData): Promise<WFirmaVehicle> {
    return this.vehicleService.updateVehicle(id, data);
  }

  async deleteVehicle(id: string): Promise<DeleteResult> {
    return this.vehicleService.deleteVehicle(id);
  }

  // ============================================
  // TERM METHODS
  // ============================================

  async findTerms(filters?: TermFilters): Promise<WFirmaTerm[]> {
    return this.termService.findTerms(filters);
  }

  async getTerm(id: string): Promise<WFirmaTerm | null> {
    return this.termService.getTerm(id);
  }

  async createTerm(data: TermData): Promise<WFirmaTerm> {
    return this.termService.createTerm(data);
  }

  async updateTerm(id: string, data: TermUpdateData): Promise<WFirmaTerm> {
    return this.termService.updateTerm(id, data);
  }

  async deleteTerm(id: string): Promise<DeleteResult> {
    return this.termService.deleteTerm(id);
  }

  // ============================================
  // TERM GROUP METHODS
  // ============================================

  async findTermGroups(filters?: TermGroupFilters): Promise<WFirmaTermGroup[]> {
    return this.termGroupService.findTermGroups(filters);
  }

  async getTermGroup(id: string): Promise<WFirmaTermGroup | null> {
    return this.termGroupService.getTermGroup(id);
  }

  async createTermGroup(data: TermGroupData): Promise<WFirmaTermGroup> {
    return this.termGroupService.createTermGroup(data);
  }

  async updateTermGroup(id: string, data: TermGroupUpdateData): Promise<WFirmaTermGroup> {
    return this.termGroupService.updateTermGroup(id, data);
  }

  async deleteTermGroup(id: string): Promise<DeleteResult> {
    return this.termGroupService.deleteTermGroup(id);
  }

  // ============================================
  // DECLARATION METHODS
  // ============================================

  async getJpkVat(params: JpkVatParams): Promise<DeclarationResult> {
    return this.declarationService.getJpkVat(params);
  }

  async getPit(params: PitParams): Promise<DeclarationResult> {
    return this.declarationService.getPit(params);
  }

  // ============================================
  // DOCUMENT METHODS
  // ============================================

  async findDocuments(filters?: DocumentFilters): Promise<WFirmaDocument[]> {
    return this.documentService.findDocuments(filters);
  }

  async getDocument(id: string): Promise<WFirmaDocument | null> {
    return this.documentService.getDocument(id);
  }

  async downloadDocument(
    id: string
  ): Promise<{ content: Buffer; filename: string; mime: string }> {
    return this.documentService.downloadDocument(id);
  }

  async createDocument(data: DocumentData): Promise<WFirmaDocument> {
    return this.documentService.createDocument(data);
  }

  async deleteDocument(id: string): Promise<DeleteResult> {
    return this.documentService.deleteDocument(id);
  }

  // ============================================
  // LEDGER ACCOUNTANT YEAR METHODS (Fiscal Years)
  // ============================================

  async findLedgerAccountantYears(
    filters?: LedgerAccountantYearFilters
  ): Promise<WFirmaLedgerAccountantYear[]> {
    return this.ledgerService.findLedgerAccountantYears(filters);
  }

  async getLedgerAccountantYear(
    idOrSymbol: string
  ): Promise<WFirmaLedgerAccountantYear | null> {
    return this.ledgerService.getLedgerAccountantYear(idOrSymbol);
  }

  // ============================================
  // LEDGER OPERATION SCHEMA METHODS (Accounting Schemas)
  // ============================================

  async findLedgerOperationSchemas(
    filters?: LedgerOperationSchemaFilters
  ): Promise<WFirmaLedgerOperationSchema[]> {
    return this.ledgerService.findLedgerOperationSchemas(filters);
  }

  async getLedgerOperationSchema(
    id: string
  ): Promise<WFirmaLedgerOperationSchema | null> {
    return this.ledgerService.getLedgerOperationSchema(id);
  }

  // ============================================
  // TAX REGISTER METHODS (KPiR)
  // ============================================

  async getTaxRegisters(params: TaxRegisterParams): Promise<TaxRegisterResult> {
    return this.taxRegisterService.getTaxRegisters(params);
  }
}
