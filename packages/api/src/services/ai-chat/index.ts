/**
 * AI Chat Service Module
 * Re-exports for easy importing
 */

// Main service
export { AIChatService } from './ai-chat.service';

// Constants
export { SYSTEM_PROMPT } from './constants';

// Utils
export { detectLocale, generateConversationTitle, generateTitleFromMessage } from './utils';

// Tools
export { createAllTools } from './tools';
export {
  createGetCompanyInfoTool,
  createGetFinancialSummaryTool,
  createGetContractorsTool,
  createCreateContractorTool,
  createUpdateContractorTool,
  createDeleteContractorTool,
  createGetInvoicesTool,
  createGetInvoiceDetailsTool,
  createSendInvoiceTool,
  createAddInvoiceNoteTool,
  createGetInvoiceNotesTool,
  createDeleteInvoiceNoteTool,
} from './tools';

// Formatters
export {
  formatCompanyInfo,
  formatFinancialData,
  formatContractorsList,
  formatContractorDetails,
  formatContractorCreated,
  formatContractorUpdated,
  formatContractorDeleted,
  formatInvoicesList,
  formatInvoiceDetails,
  formatNotesList,
} from './formatters';
