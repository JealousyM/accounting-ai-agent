/**
 * Invoice Tools
 * LangChain tools for invoice operations
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getInvoiceTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { formatInvoicesList, formatInvoiceDetails, formatNotesList } from '../formatters';

export function createGetInvoicesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ year, month, status }: { year?: number; month?: number; status?: string }) => {
      try {
        let dateFrom: Date | undefined;
        let dateTo: Date | undefined;

        if (year) {
          dateFrom = new Date(year, month ? month - 1 : 0, 1);
          dateTo = month
            ? new Date(year, month, 0)
            : new Date(year, 11, 31);
        }

        const invoices = await wfirmaService.findInvoices({
          dateFrom,
          dateTo,
          status: status && status !== 'all' ? status as any : undefined,
          limit: 100,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFoundPeriod;
        }

        return formatInvoicesList(invoices, locale);
      } catch (error) {
        logger.error('Failed to fetch invoices', { error, userId });
        return `Error: ${getInvoiceTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_invoices',
      description: 'Get list of invoices from wFirma. Can filter by year, month, and payment status (paid, unpaid, overdue, draft, issued, sent).',
      schema: z.object({
        year: z.number().optional().describe('Filter by year (e.g., 2024, 2025, 2026)'),
        month: z.number().min(1).max(12).optional().describe('Filter by month (1-12)'),
        status: z.enum(['all', 'paid', 'unpaid', 'overdue', 'draft', 'issued', 'sent']).optional().describe('Filter by payment status'),
      }),
    }
  );
}

export function createGetInvoiceDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ invoiceNumber }: { invoiceNumber: string }) => {
      try {
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

        return formatInvoiceDetails(invoice, locale);
      } catch (error) {
        logger.error('Failed to fetch invoice details', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorFetchDetails}`;
      }
    },
    {
      name: 'get_invoice_details',
      description: 'Get full details of a specific invoice by invoice number, including all line items.',
      schema: z.object({
        invoiceNumber: z.string().describe('Invoice number (e.g., FV 1/2024, FV/01/2024)'),
      }),
    }
  );
}

export function createSendInvoiceTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ invoiceNumber, email, subject, body }: {
      invoiceNumber: string;
      email?: string;
      subject?: string;
      body?: string;
    }) => {
      try {
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

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.invoiceSent}**\n\n- Invoice: ${invoice.invoiceNumber}\n- Contractor: ${invoice.contractorName}\n- Email: ${result.email || 'contractor email'}`;
      } catch (error) {
        logger.error('Failed to send invoice', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorSend}`;
      }
    },
    {
      name: 'send_invoice',
      description: 'Send an invoice via email to the contractor. Uses contractor email if not provided.',
      schema: z.object({
        invoiceNumber: z.string().describe('Invoice number to send'),
        email: z.string().optional().describe('Email address (uses contractor email if not provided)'),
        subject: z.string().optional().describe('Email subject'),
        body: z.string().optional().describe('Email body message'),
      }),
    }
  );
}

export function createAddInvoiceNoteTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ invoiceNumber, text }: { invoiceNumber: string; text: string }) => {
      try {
        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = invoices[0];
        const note = await wfirmaService.addNote('invoice', invoice.id, text);

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.noteAdded}**\n\n- Invoice: ${invoice.invoiceNumber}\n- Note: ${note.text}\n- Note ID: ${note.id}`;
      } catch (error) {
        logger.error('Failed to add invoice note', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorAddNote}`;
      }
    },
    {
      name: 'add_invoice_note',
      description: 'Add a note/comment to an invoice.',
      schema: z.object({
        invoiceNumber: z.string().describe('Invoice number'),
        text: z.string().describe('Note text'),
      }),
    }
  );
}

export function createGetInvoiceNotesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ invoiceNumber }: { invoiceNumber: string }) => {
      try {
        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return getInvoiceTranslations(locale).notFound;
        }

        const invoice = invoices[0];
        const notes = await wfirmaService.findNotes('invoice', invoice.id);

        if (notes.length === 0) {
          return getInvoiceTranslations(locale).noNotes;
        }

        return formatNotesList(notes, invoice.invoiceNumber, locale);
      } catch (error) {
        logger.error('Failed to fetch invoice notes', { error, userId, invoiceNumber });
        return `Error: ${getInvoiceTranslations(locale).errorFetchNotes}`;
      }
    },
    {
      name: 'get_invoice_notes',
      description: 'Get all notes attached to an invoice.',
      schema: z.object({
        invoiceNumber: z.string().describe('Invoice number'),
      }),
    }
  );
}

export function createDeleteInvoiceNoteTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ noteId }: { noteId: string }) => {
      try {
        await wfirmaService.deleteNote(noteId);

        await cacheService.invalidateCache(userId, 'invoice');

        const t = getInvoiceTranslations(locale);
        return `✅ **${t.noteDeleted}**\n\n- Note ID: ${noteId}`;
      } catch (error) {
        logger.error('Failed to delete invoice note', { error, userId, noteId });
        return `Error: ${getInvoiceTranslations(locale).errorDeleteNote}`;
      }
    },
    {
      name: 'delete_invoice_note',
      description: 'Delete a note from an invoice by note ID.',
      schema: z.object({
        noteId: z.string().describe('Note ID to delete'),
      }),
    }
  );
}
