/**
 * AI Chat Tools
 * Factory function for creating all LangChain tools
 */

import { StructuredToolInterface } from '@langchain/core/tools';
import { Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { FileStorageService } from '../../file-storage.service';

// Import tool creators
import {
  createGetCompanyInfoTool,
  createGetCompanyAccountsTool,
  createGetCompanyAddressesTool,
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

// Re-export individual tool creators
export {
  createGetCompanyInfoTool,
  createGetCompanyAccountsTool,
  createGetCompanyAddressesTool,
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

/**
 * Create all AI chat tools for wFirma integration
 */
export function createAllTools(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  fileStorageService: FileStorageService,
  userId: string,
  locale: Locale
): StructuredToolInterface[] {
  return [
    // Company tools
    createGetCompanyInfoTool(wfirmaService, cacheService, userId, locale),
    createGetCompanyAccountsTool(wfirmaService, cacheService, userId, locale),
    createGetCompanyAddressesTool(wfirmaService, cacheService, userId, locale),

    // Financial tool
    createGetFinancialSummaryTool(wfirmaService, cacheService, userId),

    // Contractor tools
    createGetContractorsTool(wfirmaService, locale),
    createCreateContractorTool(wfirmaService, cacheService, userId, locale),
    createUpdateContractorTool(wfirmaService, cacheService, userId, locale),
    createDeleteContractorTool(wfirmaService, cacheService, userId, locale),

    // Invoice tools
    createGetInvoicesTool(wfirmaService, userId, locale),
    createGetInvoiceDetailsTool(wfirmaService, userId, locale),
    createSendInvoiceTool(wfirmaService, cacheService, userId, locale),
    createAddInvoiceNoteTool(wfirmaService, cacheService, userId, locale),
    createGetInvoiceNotesTool(wfirmaService, userId, locale),
    createDeleteInvoiceNoteTool(wfirmaService, cacheService, userId, locale),
    createDownloadInvoiceTool(wfirmaService, fileStorageService, userId, locale),
    createCreateInvoiceTool(wfirmaService, cacheService, userId, locale),
    createUpdateInvoiceTool(wfirmaService, cacheService, userId, locale),
    createDeleteInvoiceTool(wfirmaService, cacheService, userId, locale),

    // User tools
    createGetUsersTool(wfirmaService, cacheService, userId, locale),
    createGetUserCompaniesTool(wfirmaService, cacheService, userId, locale),
    createGetUserCompanyByIdTool(wfirmaService, cacheService, userId, locale),

    // Payment tools
    createGetPaymentsTool(wfirmaService, userId, locale),
    createGetPaymentDetailsTool(wfirmaService, userId, locale),
    createAddPaymentTool(wfirmaService, cacheService, userId, locale),
    createUpdatePaymentTool(wfirmaService, cacheService, userId, locale),
    createDeletePaymentTool(wfirmaService, cacheService, userId, locale),

    // Expense tools
    createGetExpensesTool(wfirmaService, userId, locale),
    createGetExpenseDetailsTool(wfirmaService, userId, locale),

    // Vehicle tools
    createGetVehiclesTool(wfirmaService, locale),
    createGetVehicleDetailsTool(wfirmaService, locale),
    createAddVehicleTool(wfirmaService, cacheService, userId, locale),
    createUpdateVehicleTool(wfirmaService, cacheService, userId, locale),
    createDeleteVehicleTool(wfirmaService, cacheService, userId, locale),

    // Term tools
    createGetTermsTool(wfirmaService, locale),
    createGetTermDetailsTool(wfirmaService, locale),
    createAddTermTool(wfirmaService, cacheService, userId, locale),
    createUpdateTermTool(wfirmaService, cacheService, userId, locale),
    createDeleteTermTool(wfirmaService, cacheService, userId, locale),

    // Term Group tools
    createGetTermGroupsTool(wfirmaService, locale),
    createGetTermGroupDetailsTool(wfirmaService, locale),
    createAddTermGroupTool(wfirmaService, cacheService, userId, locale),
    createUpdateTermGroupTool(wfirmaService, cacheService, userId, locale),
    createDeleteTermGroupTool(wfirmaService, cacheService, userId, locale),

    // Declaration tools
    createGetJpkVatTool(wfirmaService, userId, locale),
    createGetPitTool(wfirmaService, userId, locale),

    // Document tools
    createGetDocumentsTool(wfirmaService, locale),
    createGetDocumentDetailsTool(wfirmaService, userId, locale),
    createDownloadDocumentTool(wfirmaService, userId, locale),
    createDeleteDocumentTool(wfirmaService, cacheService, userId, locale),

    // Ledger tools (Fiscal Years & Accounting Schemas)
    createGetFiscalYearsTool(wfirmaService, locale),
    createGetFiscalYearDetailsTool(wfirmaService, locale),
    createGetAccountingSchemasTool(wfirmaService, locale),
    createGetAccountingSchemaDetailsTool(wfirmaService, locale),
  ];
}
