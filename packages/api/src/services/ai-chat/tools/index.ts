/**
 * AI Chat Tools
 * Factory function for creating all LangChain tools
 */

import { StructuredToolInterface } from '@langchain/core/tools';
import { Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { CompanyEnrichmentService } from '../../company-enrichment.service';
import { FileStorageService } from '../../file-storage.service';
import { SubscriptionService } from '../../subscription.service';
import { HRService } from '../../hr';
import { KSeFService } from '../../ksef';
import { KSeFContractorService } from '../../ksef/contractor.service';
import { taxCalendarService } from '../../tax-calendar.instance';

// Import tool creators
import {
  createGetCompanyInfoTool,
  createGetCompanyAccountsTool,
  createGetCompanyAddressesTool,
  createLookupCompanyByNipTool,
} from './company.tool';
import { createGetFinancialSummaryTool } from './financial.tool';
import {
  createGetContractorsTool,
  createCreateContractorTool,
  createUpdateContractorTool,
  createDeleteContractorTool,
} from './contractor.tools';
import {
  createGetInvoicesTool,
  createGetInvoiceDetailsTool,
  createSendInvoiceTool,
  createAddInvoiceNoteTool,
  createGetInvoiceNotesTool,
  createDeleteInvoiceNoteTool,
  createDownloadInvoiceTool,
  createCreateInvoiceTool,
  createUpdateInvoiceTool,
  createDeleteInvoiceTool,
} from './invoice.tools';
import {
  createGetUsersTool,
  createGetUserCompaniesTool,
  createGetUserCompanyByIdTool,
} from './user.tools';
import {
  createGetPaymentsTool,
  createGetPaymentDetailsTool,
  createAddPaymentTool,
  createUpdatePaymentTool,
  createDeletePaymentTool,
} from './payment.tools';
import {
  createGetExpensesTool,
  createGetExpenseDetailsTool,
  createCreateExpenseFromReceiptTool,
} from './expense.tools';
import {
  createGetVehiclesTool,
  createGetVehicleDetailsTool,
  createAddVehicleTool,
  createUpdateVehicleTool,
  createDeleteVehicleTool,
} from './vehicle.tools';
import {
  createGetTermsTool,
  createGetTermDetailsTool,
  createAddTermTool,
  createUpdateTermTool,
  createDeleteTermTool,
  createGetTermGroupsTool,
  createGetTermGroupDetailsTool,
  createAddTermGroupTool,
  createUpdateTermGroupTool,
  createDeleteTermGroupTool,
} from './term.tools';
import {
  createGetJpkVatTool,
  createGetPitTool,
} from './declaration.tools';
import {
  createGetTaxRegistersTool,
} from './taxregister.tools';
import { createGetTaxDeadlinesTool } from './tax-calendar.tools';
import {
  createGetDocumentsTool,
  createGetDocumentDetailsTool,
  createDownloadDocumentTool,
  createDeleteDocumentTool,
} from './document.tools';
import {
  createGetFiscalYearsTool,
  createGetFiscalYearDetailsTool,
  createGetAccountingSchemasTool,
  createGetAccountingSchemaDetailsTool,
} from './ledger.tools';
import {
  createGetEmployeesTool,
  createGetEmployeeDetailsTool,
  createAddEmployeeTool,
  createUpdateEmployeeTool,
  createDeleteEmployeeTool,
  createGetHRContractsTool,
  createAddHRContractTool,
  createTerminateHRContractTool,
  createCalculatePayrollTool,
  createSavePayrollRecordTool,
  createDeletePayrollRecordTool,
  createGetPayrollRecordsTool,
  createAddAbsenceTool,
  createGetAbsencesTool,
  createGetHRSummaryTool,
} from './hr.tools';
import {
  createSendToKSeFTool,
  createCheckKSeFStatusTool,
  createDownloadKSeFUPOTool,
  createQueryKSeFInvoicesTool,
  createGetKSeFStatisticsTool,
  createBulkSendToKSeFTool,
  createGetIncomingKSeFInvoicesTool,
  createMatchIncomingInvoiceTool,
  createDirectSendToKSeFTool,
} from './ksef.tools';
import { createVerifyBankAccountTool } from './biala-lista.tools';

// Re-export individual tool creators
export {
  createGetCompanyInfoTool,
  createGetCompanyAccountsTool,
  createGetCompanyAddressesTool,
  createLookupCompanyByNipTool,
} from './company.tool';
export { createGetFinancialSummaryTool } from './financial.tool';
export {
  createGetContractorsTool,
  createCreateContractorTool,
  createUpdateContractorTool,
  createDeleteContractorTool,
} from './contractor.tools';
export {
  createGetInvoicesTool,
  createGetInvoiceDetailsTool,
  createSendInvoiceTool,
  createAddInvoiceNoteTool,
  createGetInvoiceNotesTool,
  createDeleteInvoiceNoteTool,
  createDownloadInvoiceTool,
  createCreateInvoiceTool,
  createUpdateInvoiceTool,
  createDeleteInvoiceTool,
} from './invoice.tools';
export {
  createGetUsersTool,
  createGetUserCompaniesTool,
  createGetUserCompanyByIdTool,
} from './user.tools';
export {
  createGetPaymentsTool,
  createGetPaymentDetailsTool,
  createAddPaymentTool,
  createUpdatePaymentTool,
  createDeletePaymentTool,
} from './payment.tools';
export {
  createGetExpensesTool,
  createGetExpenseDetailsTool,
  createCreateExpenseFromReceiptTool,
} from './expense.tools';
export {
  createGetVehiclesTool,
  createGetVehicleDetailsTool,
  createAddVehicleTool,
  createUpdateVehicleTool,
  createDeleteVehicleTool,
} from './vehicle.tools';
export {
  createGetTermsTool,
  createGetTermDetailsTool,
  createAddTermTool,
  createUpdateTermTool,
  createDeleteTermTool,
  createGetTermGroupsTool,
  createGetTermGroupDetailsTool,
  createAddTermGroupTool,
  createUpdateTermGroupTool,
  createDeleteTermGroupTool,
} from './term.tools';
export {
  createGetJpkVatTool,
  createGetPitTool,
} from './declaration.tools';
export {
  createGetTaxRegistersTool,
} from './taxregister.tools';
export { createGetTaxDeadlinesTool } from './tax-calendar.tools';
export {
  createGetDocumentsTool,
  createGetDocumentDetailsTool,
  createDownloadDocumentTool,
  createDeleteDocumentTool,
} from './document.tools';
export {
  createGetFiscalYearsTool,
  createGetFiscalYearDetailsTool,
  createGetAccountingSchemasTool,
  createGetAccountingSchemaDetailsTool,
} from './ledger.tools';
export {
  createGetEmployeesTool,
  createGetEmployeeDetailsTool,
  createAddEmployeeTool,
  createUpdateEmployeeTool,
  createDeleteEmployeeTool,
  createGetHRContractsTool,
  createAddHRContractTool,
  createTerminateHRContractTool,
  createCalculatePayrollTool,
  createSavePayrollRecordTool,
  createDeletePayrollRecordTool,
  createGetPayrollRecordsTool,
  createAddAbsenceTool,
  createGetAbsencesTool,
  createGetHRSummaryTool,
} from './hr.tools';
export {
  createSendToKSeFTool,
  createCheckKSeFStatusTool,
  createDownloadKSeFUPOTool,
  createQueryKSeFInvoicesTool,
  createGetKSeFStatisticsTool,
  createBulkSendToKSeFTool,
  createGetIncomingKSeFInvoicesTool,
  createMatchIncomingInvoiceTool,
  createDirectSendToKSeFTool,
} from './ksef.tools';
export { createVerifyBankAccountTool } from './biala-lista.tools';

/**
 * Create all AI chat tools for wFirma integration
 */
export function createAllTools(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  enrichmentService: CompanyEnrichmentService,
  fileStorageService: FileStorageService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService,
  hrService?: HRService,
  ksefService?: KSeFService,
  ksefContractorService?: KSeFContractorService,
): StructuredToolInterface[] {
  return [
    // Company tools
    createGetCompanyInfoTool(wfirmaService, cacheService, enrichmentService, userId, locale, subscriptionService),
    createGetCompanyAccountsTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createGetCompanyAddressesTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createLookupCompanyByNipTool(enrichmentService, userId, locale),

    // Financial tool
    createGetFinancialSummaryTool(wfirmaService, cacheService, userId, subscriptionService),

    // Contractor tools
    createGetContractorsTool(wfirmaService, locale, userId, subscriptionService),
    createCreateContractorTool(wfirmaService, cacheService, userId, locale, subscriptionService, enrichmentService),
    createUpdateContractorTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeleteContractorTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Invoice tools
    createGetInvoicesTool(wfirmaService, userId, locale, subscriptionService),
    createGetInvoiceDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createSendInvoiceTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createAddInvoiceNoteTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createGetInvoiceNotesTool(wfirmaService, userId, locale, subscriptionService),
    createDeleteInvoiceNoteTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDownloadInvoiceTool(wfirmaService, fileStorageService, userId, locale, subscriptionService),
    createCreateInvoiceTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createUpdateInvoiceTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeleteInvoiceTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // User tools
    createGetUsersTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createGetUserCompaniesTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createGetUserCompanyByIdTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Payment tools
    createGetPaymentsTool(wfirmaService, userId, locale, subscriptionService),
    createGetPaymentDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createAddPaymentTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createUpdatePaymentTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeletePaymentTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Expense tools
    createGetExpensesTool(wfirmaService, userId, locale, subscriptionService),
    createGetExpenseDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createCreateExpenseFromReceiptTool(wfirmaService, cacheService, userId, locale, subscriptionService, enrichmentService),

    // Vehicle tools
    createGetVehiclesTool(wfirmaService, userId, locale, subscriptionService),
    createGetVehicleDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createAddVehicleTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createUpdateVehicleTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeleteVehicleTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Term tools
    createGetTermsTool(wfirmaService, userId, locale, subscriptionService),
    createGetTermDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createAddTermTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createUpdateTermTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeleteTermTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Term Group tools
    createGetTermGroupsTool(wfirmaService, userId, locale, subscriptionService),
    createGetTermGroupDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createAddTermGroupTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createUpdateTermGroupTool(wfirmaService, cacheService, userId, locale, subscriptionService),
    createDeleteTermGroupTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Declaration tools
    createGetJpkVatTool(wfirmaService, userId, locale, subscriptionService),
    createGetPitTool(wfirmaService, userId, locale, subscriptionService),

    // Tax Register (KPiR) tools
    createGetTaxRegistersTool(wfirmaService, userId, locale, subscriptionService),

    // Tax Calendar tool (no wFirma dependency — always available)
    createGetTaxDeadlinesTool(taxCalendarService, locale),

    // Biała Lista MF tool (no wFirma dependency — always available)
    createVerifyBankAccountTool(enrichmentService, userId, locale),

    // Document tools
    createGetDocumentsTool(wfirmaService, userId, locale, subscriptionService),
    createGetDocumentDetailsTool(wfirmaService, userId, locale, subscriptionService),
    createDownloadDocumentTool(wfirmaService, userId, locale, subscriptionService),
    createDeleteDocumentTool(wfirmaService, cacheService, userId, locale, subscriptionService),

    // Ledger tools (Fiscal Years & Accounting Schemas)
    createGetFiscalYearsTool(wfirmaService, locale, userId, subscriptionService),
    createGetFiscalYearDetailsTool(wfirmaService, locale, userId, subscriptionService),
    createGetAccountingSchemasTool(wfirmaService, locale, userId, subscriptionService),
    createGetAccountingSchemaDetailsTool(wfirmaService, locale, userId, subscriptionService),

    // HR tools (if hrService is available)
    ...(hrService ? [
      createGetEmployeesTool(hrService, userId, locale),
      createGetEmployeeDetailsTool(hrService, userId, locale),
      createAddEmployeeTool(hrService, userId, locale),
      createUpdateEmployeeTool(hrService, userId, locale),
      createDeleteEmployeeTool(hrService, userId, locale),
      createGetHRContractsTool(hrService, userId, locale),
      createAddHRContractTool(hrService, userId, locale),
      createTerminateHRContractTool(hrService, userId, locale),
      createCalculatePayrollTool(hrService, userId, locale),
      createSavePayrollRecordTool(hrService, userId, locale),
      createDeletePayrollRecordTool(hrService, userId, locale),
      createGetPayrollRecordsTool(hrService, userId, locale),
      createAddAbsenceTool(hrService, userId, locale),
      createGetAbsencesTool(hrService, userId, locale),
      createGetHRSummaryTool(hrService, userId, locale),
    ] : []),

    // KSeF tools (if ksefService is available)
    ...(ksefService ? [
      createSendToKSeFTool(ksefService, locale, userId, subscriptionService),
      createDirectSendToKSeFTool(ksefService, locale, userId, subscriptionService, ksefContractorService),
      createCheckKSeFStatusTool(ksefService, locale, userId, subscriptionService),
      createDownloadKSeFUPOTool(ksefService, locale, userId, subscriptionService),
      createQueryKSeFInvoicesTool(ksefService, locale, userId, subscriptionService),
      createGetKSeFStatisticsTool(ksefService, locale, userId, subscriptionService),
      createBulkSendToKSeFTool(ksefService, locale, userId, subscriptionService),
      createGetIncomingKSeFInvoicesTool(ksefService, locale, userId, subscriptionService),
      createMatchIncomingInvoiceTool(ksefService, locale, userId, subscriptionService),
    ] : []),
  ];
}
