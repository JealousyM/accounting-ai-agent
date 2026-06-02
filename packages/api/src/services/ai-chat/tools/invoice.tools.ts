/**
 * Invoice Tools
 * LangChain tools for invoice operations
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getInvoiceTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService, WFirmaError } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { FileStorageService } from '../../file-storage.service';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import { ksefAutoSendService } from '../../ksef/auto-send.instance';
import {
  formatInvoicesList,
  formatInvoiceDetails,
  formatNotesList,
  formatInvoiceCreated,
  formatInvoiceUpdated,
  formatInvoiceDeleted,
  formatInvoiceDownloadLink,
} from '../formatters';
import {
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceContentItem,
  WFirmaInvoiceDocumentType,
  PaymentMethod,
} from '../../../types/wfirma.types';
import { sanitizeForPrompt } from '../utils';

export function createGetInvoicesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_invoices',
    description: 'Get list of OUTGOING invoices (faktury sprzedaży — issued by the user to their clients) from wFirma. For INCOMING bills/purchases (wydatki), use get_expenses instead. CRITICAL: whenever the user mentions any period (month, year, quarter, "last month", "April 2026", etc.) you MUST pass dateFrom and dateTo. Never call this tool without date filters if a period was mentioned — returning unfiltered results is a bug.',
    schema: z.object({
      dateFrom: z.string().nullable().optional().describe('Start date YYYY-MM-DD inclusive. REQUIRED when user specifies any period. For "April 2026" pass "2026-04-01".'),
      dateTo: z.string().nullable().optional().describe('End date YYYY-MM-DD inclusive. REQUIRED when user specifies any period. For "April 2026" pass "2026-04-30".'),
      status: z.enum(['all', 'paid', 'unpaid', 'overdue', 'draft', 'issued', 'sent']).nullable().optional().describe('Filter by payment status'),
    }),
    func: async ({ dateFrom, dateTo, status }: { dateFrom?: string; dateTo?: string; status?: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await wfirmaService.findInvoices({
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          status: status && status !== 'all' ? status as any : undefined,
          limit: 100,
        });

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFoundPeriod;
        }

        return formatInvoicesList(invoices, locale);
      } catch (error) {
        logger.error('Failed to fetch invoices', { error, userId });
        return `Error: ${getInvoiceTranslations(locale).errorFetch}`;
      }
    },
  });

}

export function createGetInvoiceDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_invoice_details',
    description: 'Get full details of a specific invoice by invoice number, including all line items.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number (e.g., FV 1/2024, FV/01/2024)'),
    }),
    func: async ({ invoiceNumber }: { invoiceNumber: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = await wfirmaService.getInvoiceById(invoices[0].id);
        if (!invoice) {
          return getInvoiceTranslations(locale).notFound;
        }

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        return formatInvoiceDetails(invoice, locale);
      } catch (error) {
        logger.error('Failed to fetch invoice details', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorFetchDetails}`;
      }
    },
  });

}

export function createSendInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'send_invoice',
    description: 'Send an invoice via email to the contractor. Uses contractor email if not provided.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number to send'),
      email: z.string().nullable().optional().describe('Email address (uses contractor email if not provided)'),
      subject: z.string().nullable().optional().describe('Email subject'),
      body: z.string().nullable().optional().describe('Email body message'),
    }),
    func: async ({ invoiceNumber, email, subject, body }: {
      invoiceNumber: string;
      email?: string;
      subject?: string;
      body?: string;
    }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = invoices[0];
        const result = await wfirmaService.sendInvoice(invoice.id, {
          email,
          subject,
          body,
        });

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.invoiceSent}**\n\n- Invoice: ${invoice.invoiceNumber}\n- Contractor: ${invoice.contractorName}\n- Email: ${result.email || 'contractor email'}`;
      } catch (error) {
        logger.error('Failed to send invoice', { error, userId, invoiceNumber });
        const reason = error instanceof Error ? sanitizeForPrompt(error.message) : sanitizeForPrompt(String(error));
        return `Error: ${getInvoiceTranslations(locale).errorSend}\n\n${reason}`;
      }
    },
  });

}

export function createAddInvoiceNoteTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'add_invoice_note',
    description: 'Add a note/comment to an invoice.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number'),
      text: z.string().describe('Note text'),
    }),
    func: async ({ invoiceNumber, text }: { invoiceNumber: string; text: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = invoices[0];
        const note = await wfirmaService.addNote('invoice', invoice.id, text);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.noteAdded}**\n\n- Invoice: ${invoice.invoiceNumber}\n- Note: ${note.text}\n- Note ID: ${note.id}`;
      } catch (error) {
        logger.error('Failed to add invoice note', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorAddNote}`;
      }
    },
  });

}

export function createGetInvoiceNotesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_invoice_notes',
    description: 'Get all notes attached to an invoice.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number'),
    }),
    func: async ({ invoiceNumber }: { invoiceNumber: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = invoices[0];
        const notes = await wfirmaService.findNotes('invoice', invoice.id);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        if (notes.length === 0) {
          return getInvoiceTranslations(locale).noNotes;
        }

        return formatNotesList(notes, invoice.invoiceNumber, locale);
      } catch (error) {
        logger.error('Failed to fetch invoice notes', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorFetchNotes}`;
      }
    },
  });

}

export function createDeleteInvoiceNoteTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'delete_invoice_note',
    description: 'Delete a note from an invoice by note ID.',
    schema: z.object({
      noteId: z.string().describe('Note ID to delete'),
    }),
    func: async ({ noteId }: { noteId: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        await wfirmaService.deleteNote(noteId);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.noteDeleted}**\n\n- Note ID: ${noteId}`;
      } catch (error) {
        logger.error('Failed to delete invoice note', { error, userId, noteId });
        return `Error: ${getInvoiceTranslations(locale).errorDeleteNote}`;
      }
    },
  });

}

export function createDownloadInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  fileStorageService: FileStorageService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'download_invoice',
    description: 'Download invoice as PDF file. Returns a download link valid for 15 minutes.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number to download (e.g., FV 1/2024)'),
      page: z.enum(['all', 'invoice', 'invoicecopy']).nullable().optional()
        .describe('PDF content: all (original+copy), invoice (original only), invoicecopy (copy only). Default: invoice'),
    }),
    func: async ({ invoiceNumber, page }: { invoiceNumber: string; page?: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getInvoiceTranslations(locale);

        // Find invoice by number
        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return t.notFound;
        }

        const invoice = invoices[0];

        // Download PDF
        const { content, filename } = await wfirmaService.downloadInvoice(invoice.id, {
          page: (page as 'all' | 'invoice' | 'invoicecopy') || 'invoice',
        });

        // Store file temporarily
        const fileId = await fileStorageService.storeFile(
          filename,
          content.toString('base64'),
          userId,
          'application/pdf'
        );

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const downloadUrl = `${backendUrl}/api/files/download/${fileId}`;

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Invoice PDF stored for download', { fileId, invoiceNumber, userId });

        return formatInvoiceDownloadLink(invoice, downloadUrl, locale);
      } catch (error) {
        logger.error('Failed to download invoice', { error, userId, invoiceNumber });
        const t = getInvoiceTranslations(locale);
        if (error instanceof WFirmaError || error instanceof Error) {
          return `❌ **${t.errorDownload}**\n\n${t.errorReason}: ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDownload}`;
      }
    },
  });

}

export function createCreateInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'create_invoice',
    description: 'Create a new invoice in wFirma. Requires contractor and at least one item. IMPORTANT: Use type="bill" for invoices without VAT (bez VAT, без НДС). Use type="normal" only if company is VAT payer.',
    schema: z.object({
      contractorName: z.string().nullable().optional().describe('Contractor name (use if no ID)'),
      contractorId: z.string().nullable().optional().describe('Contractor ID from wFirma'),
      contractorNip: z.string().nullable().optional().describe('Contractor NIP (tax ID)'),
      type: z.enum(['normal', 'proforma', 'bill', 'receipt_normal', 'margin']).nullable().optional()
        .describe('Invoice type: "bill" for non-VAT invoices (bez VAT/без НДС), "normal" for VAT invoices (requires VAT payer status), "proforma" for pro-forma. Default: bill'),
      items: z.array(z.object({
        name: z.string().describe('Item/service name'),
        quantity: z.number().describe('Quantity'),
        unit: z.string().describe('Unit (e.g., szt., godz., usługa)'),
        priceNet: z.number().describe('Net price per unit'),
        vatRate: z.string().nullable().optional().describe('VAT rate: 23, 8, 5, 0, zw (default: 23)'),
      })).describe('Invoice line items'),
      paymentMethod: z.enum(['transfer', 'cash', 'card', 'compensation']).nullable().optional()
        .describe('Payment method'),
      issueDate: z.string().nullable().optional().describe('Invoice issue date (YYYY-MM-DD)'),
      dueDate: z.string().nullable().optional().describe('Payment due date (YYYY-MM-DD)'),
      currency: z.string().nullable().optional().describe('Currency code (default: PLN)'),
      description: z.string().nullable().optional().describe('Invoice notes/description'),
    }),
    func: async ({
      contractorName,
      contractorId,
      contractorNip,
      type,
      items,
      paymentMethod,
      dueDate,
      issueDate,
      currency,
      description,
    }: {
      contractorName?: string;
      contractorId?: string;
      contractorNip?: string;
      type?: string;
      items: Array<{ name: string; quantity: number; unit: string; priceNet: number; vatRate?: string }>;
      paymentMethod?: string;
      dueDate?: string;
      issueDate?: string;
      currency?: string;
      description?: string;
    }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getInvoiceTranslations(locale);

        if (!contractorName && !contractorId) {
          return `Error: ${t.contractorRequired}`;
        }
        if (!items || items.length === 0) {
          return `Error: ${t.itemsRequired}`;
        }

        // If only contractor name is provided, try to find the contractor in wFirma
        let resolvedContractorId = contractorId;
        if (!resolvedContractorId && contractorName) {
          logger.info('Looking up contractor by name for invoice creation', { contractorName });
          const contractors = await wfirmaService.getContractors({ search: contractorName });

          if (contractors.length > 0) {
            // Find the best matching contractor (case-insensitive)
            const searchLower = contractorName.toLowerCase().trim();

            // First try exact match
            let matchedContractor = contractors.find(
              c => c.name.toLowerCase().trim() === searchLower
            );

            // If no exact match, try contains match (search term in contractor name)
            if (!matchedContractor) {
              matchedContractor = contractors.find(
                c => c.name.toLowerCase().includes(searchLower)
              );
            }

            // If still no match, try reverse contains (contractor name in search term)
            if (!matchedContractor) {
              matchedContractor = contractors.find(
                c => searchLower.includes(c.name.toLowerCase())
              );
            }

            // If still no match, just use the first one
            if (!matchedContractor) {
              matchedContractor = contractors[0];
            }

            resolvedContractorId = matchedContractor.id;
            logger.info('Found existing contractor', {
              contractorId: resolvedContractorId,
              contractorName: matchedContractor.name,
              searchedFor: contractorName,
              totalFound: contractors.length
            });
          } else if (!contractorNip) {
            // No contractor found and no NIP provided - cannot create inline
            return `Error: Kontrahent "${contractorName}" nie znaleziony. Podaj NIP aby utworzyć nowego kontrahenta lub najpierw dodaj go do CRM.`;
          }
        }

        const data: CreateInvoiceData = {
          contractor: resolvedContractorId
            ? { contractor_id: resolvedContractorId }
            : { name: contractorName, nip: contractorNip },
          type: (type as WFirmaInvoiceDocumentType) || 'bill',  // Default to 'bill' (non-VAT) instead of 'normal'
          invoicecontents: items.map(item => ({
            name: item.name,
            count: item.quantity,
            unit_count: '1',        // Unit multiplier, default 1
            price: item.priceNet,
            unit: item.unit,        // Unit name (szt., godz., usługa, etc.)
            vat: item.vatRate || '23',
          } as InvoiceContentItem)),
          paymentmethod: paymentMethod as PaymentMethod,
          paymentdate: dueDate,
          date: issueDate,
          disposaldate: issueDate,  // Sale/service date - same as issue date by default
          currency: currency || 'PLN',
          description,
        };

        const invoice = await wfirmaService.createInvoice(data);

        // Fire-and-forget: auto-send to KSeF if enabled (never throws)
        ksefAutoSendService.onInvoiceCreated(userId, invoice.id);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        logger.info('Invoice created via AI chat', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          userId,
        });

        return formatInvoiceCreated(invoice, locale);
      } catch (error) {
        logger.error('Failed to create invoice', { error, userId });
        const t = getInvoiceTranslations(locale);
        // Show actual wFirma error message to user
        if (error instanceof WFirmaError) {
          return `❌ **${t.errorCreateTitle || t.errorCreate}**\n\n${t.errorReason || 'Причина'}: ${sanitizeForPrompt(error.message)}`;
        }
        if (error instanceof Error) {
          return `❌ **${t.errorCreateTitle || t.errorCreate}**\n\n${t.errorReason || 'Причина'}: ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
  });

}

export function createUpdateInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'update_invoice',
    description: 'Update an existing invoice. Can modify due date, payment method, description, or mark payments.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number to update (e.g., FV 1/2024)'),
      dueDate: z.string().nullable().optional().describe('New due date (YYYY-MM-DD)'),
      paymentMethod: z.enum(['transfer', 'cash', 'card', 'compensation']).nullable().optional()
        .describe('Payment method'),
      description: z.string().nullable().optional().describe('Invoice notes/description'),
      alreadypaid: z.number().nullable().optional().describe('Amount already paid'),
    }),
    func: async ({
      invoiceNumber,
      dueDate,
      paymentMethod,
      description,
      alreadypaid,
    }: {
      invoiceNumber: string;
      dueDate?: string;
      paymentMethod?: string;
      description?: string;
      alreadypaid?: number;
    }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getInvoiceTranslations(locale);

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return t.notFound;
        }

        const invoice = invoices[0];

        const data: UpdateInvoiceData = {};
        if (dueDate) data.paymentdate = dueDate;
        if (paymentMethod) data.paymentmethod = paymentMethod as PaymentMethod;
        if (description !== undefined) data.description = description;
        if (alreadypaid !== undefined) data.alreadypaid = alreadypaid;

        const updated = await wfirmaService.updateInvoice(invoice.id, data);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        logger.info('Invoice updated via AI chat', {
          invoiceId: updated.id,
          invoiceNumber: updated.invoiceNumber,
          userId,
        });

        return formatInvoiceUpdated(updated, locale);
      } catch (error) {
        logger.error('Failed to update invoice', { error, userId, invoiceNumber });
        const t = getInvoiceTranslations(locale);
        if (error instanceof WFirmaError || error instanceof Error) {
          return `❌ **${t.errorUpdate}**\n\n${t.errorReason}: ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
  });

}

export function createDeleteInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'delete_invoice',
    description: 'Delete an invoice from wFirma. WARNING: This action cannot be undone.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number to delete (e.g., FV 1/2024)'),
    }),
    func: async ({ invoiceNumber }: { invoiceNumber: string }) => {
      try {
        // Check wFirma usage limit
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getInvoiceTranslations(locale);

        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return t.notFound;
        }

        const invoice = invoices[0];

        await wfirmaService.deleteInvoice(invoice.id);

        // Increment usage after successful request
        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'invoice');

        logger.info('Invoice deleted via AI chat', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          userId,
        });

        return formatInvoiceDeleted(invoiceNumber, locale);
      } catch (error) {
        logger.error('Failed to delete invoice', { error, userId, invoiceNumber });
        const t = getInvoiceTranslations(locale);
        if (error instanceof WFirmaError || error instanceof Error) {
          return `❌ **${t.errorDelete}**\n\n${t.errorReason}: ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
  });

}
