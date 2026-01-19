/**
 * AI Chat Tools
 * Factory function for creating all LangChain tools
 */

import { StructuredToolInterface } from '@langchain/core/tools';
import { Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';

// Import tool creators
import { createGetCompanyInfoTool } from './company.tool';
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
} from './invoice.tools';

// Re-export individual tool creators
export { createGetCompanyInfoTool } from './company.tool';
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
} from './invoice.tools';

/**
 * Create all AI chat tools for wFirma integration
 */
export function createAllTools(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale
): StructuredToolInterface[] {
  return [
    // Company tool
    createGetCompanyInfoTool(wfirmaService, cacheService, userId),

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
  ];
}
