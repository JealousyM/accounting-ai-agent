/**
 * KSeF Tools
 * LangChain tools for KSeF (Krajowy System e-Faktur) operations
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getKSeFTranslations, Locale } from '../../../i18n';
import { KSeFService } from '../../ksef/ksef.service';
import { KSeFContractorService } from '../../ksef/contractor.service';
import { FA3InvoiceData } from '../../../types/ksef.types';
import {
  formatKSeFSendResult,
  formatKSeFStatus,
  formatKSeFUPO,
  formatKSeFInvoicesList,
  formatKSeFStatistics,
  formatKSeFBulkResult,
  formatIncomingInvoicesList,
  formatIncomingInvoiceMatch,
} from '../formatters/ksef.formatter';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import { sanitizeForPrompt } from '../utils';

export function createSendToKSeFTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'send_invoice_to_ksef',
    description: 'Send invoice to KSeF (Polish National e-Invoice System). Use when user wants to submit invoice to KSeF.',
    schema: z.object({
      invoiceId: z.string().describe('Invoice ID to send to KSeF'),
    }),
    func: async ({ invoiceId }: { invoiceId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const result = await ksefService.sendInvoiceToKSeF(userId, { invoiceId });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Sent invoice to KSeF via AI tool', { invoiceId, success: result.success });
        return formatKSeFSendResult(result, locale);
      } catch (error) {
        logger.error('Failed to send invoice to KSeF', { error, invoiceId });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.sendFailed}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorSend}`;
      }
    },
  });

}

export function createCheckKSeFStatusTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'check_ksef_status',
    description: 'Check status of invoice in KSeF by reference number.',
    schema: z.object({
      referenceNumber: z.string().describe('KSeF reference number to check status for'),
    }),
    func: async ({ referenceNumber }: { referenceNumber: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const status = await ksefService.getInvoiceStatus(userId, referenceNumber);

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Checked KSeF status via AI tool', { referenceNumber, status: status.status });
        return formatKSeFStatus(status, locale);
      } catch (error) {
        logger.error('Failed to check KSeF status', { error, referenceNumber });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.statusTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorStatus}`;
      }
    },
  });

}

export function createDownloadKSeFUPOTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'download_ksef_upo',
    description: 'Download UPO (official confirmation) from KSeF for accepted invoice.',
    schema: z.object({
      referenceNumber: z.string().describe('KSeF reference number to download UPO for'),
    }),
    func: async ({ referenceNumber }: { referenceNumber: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const upo = await ksefService.downloadUPO(userId, referenceNumber);

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Downloaded KSeF UPO via AI tool', { referenceNumber, fileName: upo.fileName });
        return formatKSeFUPO(upo, locale);
      } catch (error) {
        logger.error('Failed to download KSeF UPO', { error, referenceNumber });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.upoDownloaded}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorUPO}`;
      }
    },
  });

}

export function createQueryKSeFInvoicesTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'query_ksef_invoices',
    description: 'Query KSeF invoices. Can filter by date range, status, direction (sent/received).',
    schema: z.object({
      dateFrom: z.string().nullable().optional().describe('Start date filter (ISO format, e.g. 2024-01-01)'),
      dateTo: z.string().nullable().optional().describe('End date filter (ISO format, e.g. 2024-12-31)'),
      status: z.string().nullable().optional().describe('Status filter (pending, sent, accepted, rejected, completed, failed)'),
      direction: z.enum(['sent', 'received']).nullable().optional().describe('Direction filter: sent or received'),
    }),
    func: async ({
      dateFrom,
      dateTo,
      status,
      direction,
    }: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      direction?: 'sent' | 'received';
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await ksefService.queryInvoices(userId, {
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          status: status as any,
          direction,
          limit: 50,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Queried KSeF invoices via AI tool', { count: invoices.length });
        return formatKSeFInvoicesList(invoices, locale);
      } catch (error) {
        logger.error('Failed to query KSeF invoices', { error });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.invoicesTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorQuery}`;
      }
    },
  });

}

export function createGetKSeFStatisticsTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_ksef_statistics',
    description: 'Get KSeF statistics and summary. Shows total sent, received, accepted, rejected invoices.',
    schema: z.object({}),
    func: async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const stats = await ksefService.getStatistics(userId);

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched KSeF statistics via AI tool', {
          totalSent: stats.totalSent,
          totalReceived: stats.totalReceived,
        });
        return formatKSeFStatistics(stats, locale);
      } catch (error) {
        logger.error('Failed to get KSeF statistics', { error });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.statisticsTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorStatistics}`;
      }
    },
  });

}

export function createBulkSendToKSeFTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'bulk_send_to_ksef',
    description: 'Send multiple invoices to KSeF at once. Use for batch submissions.',
    schema: z.object({
      invoiceIds: z.array(z.string()).describe('Array of invoice IDs to send to KSeF'),
      continueOnError: z.boolean().nullable().optional().describe('Continue sending remaining invoices if one fails (default: true)'),
    }),
    func: async ({
      invoiceIds,
      continueOnError,
    }: {
      invoiceIds: string[];
      continueOnError?: boolean;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const result = await ksefService.bulkSendInvoices(userId, {
          invoiceIds,
          continueOnError: continueOnError ?? true,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Bulk sent invoices to KSeF via AI tool', {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
        });
        return formatKSeFBulkResult(result, locale);
      } catch (error) {
        logger.error('Failed to bulk send to KSeF', { error, invoiceIds });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.bulkSendTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorBulkSend}`;
      }
    },
  });

}

export function createGetIncomingKSeFInvoicesTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_incoming_ksef_invoices',
    description: 'Get incoming (received) invoices from KSeF. Shows invoices received from other companies. Can filter by date range and status.',
    schema: z.object({
      dateFrom: z.string().nullable().optional().describe('Start date filter (ISO format, e.g. 2024-01-01)'),
      dateTo: z.string().nullable().optional().describe('End date filter (ISO format, e.g. 2024-12-31)'),
      status: z.string().nullable().optional().describe('Status filter (pending, accepted, rejected, completed)'),
    }),
    func: async ({
      dateFrom,
      dateTo,
      status,
    }: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const invoices = await ksefService.getIncomingInvoices(userId, {
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          status: status as any,
          limit: 50,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Queried incoming KSeF invoices via AI tool', { count: invoices.length });
        return formatIncomingInvoicesList(invoices, locale);
      } catch (error) {
        logger.error('Failed to query incoming KSeF invoices', { error });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.invoicesTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorQueryIncoming}`;
      }
    },
  });

}

export function createMatchIncomingInvoiceTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'match_incoming_ksef_invoice',
    description: 'Match an incoming KSeF invoice with existing records in wFirma. Helps verify if a received invoice has a corresponding record.',
    schema: z.object({
      referenceNumber: z.string().describe('KSeF reference number of the incoming invoice to match'),
    }),
    func: async ({ referenceNumber }: { referenceNumber: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const match = await ksefService.matchIncomingInvoice(userId, referenceNumber);

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Matched incoming KSeF invoice via AI tool', {
          referenceNumber,
          matched: match.matched,
          matchCount: match.matchCount,
        });
        return formatIncomingInvoiceMatch(match, locale);
      } catch (error) {
        logger.error('Failed to match incoming KSeF invoice', { error, referenceNumber });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.incomingMatchTitle}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorMatchIncoming}`;
      }
    },
  });

}

const FA3ItemSchema = z.object({
  name: z.string().describe('Item/service name'),
  quantity: z.number().positive().describe('Quantity'),
  unit: z.string().nullable().optional().describe('Unit (e.g. szt., godz., kg); defaults to szt.'),
  priceNet: z.number().describe('Net unit price'),
  vatRate: z.union([z.string(), z.number()]).describe('VAT rate: use string like "23", "8", "5", "0 KR", "zw", "np I" or number like 23, 8, 5, 0'),
  totalNet: z.number().describe('Total net amount for this line'),
  totalVat: z.number().describe('Total VAT amount for this line'),
  totalGross: z.number().describe('Total gross amount for this line'),
});

export function createDirectSendToKSeFTool(
  ksefService: KSeFService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService,
  contractorService?: KSeFContractorService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'create_and_send_to_ksef',
    description:
      'Create a new invoice from scratch and send it directly to KSeF (Polish National e-Invoice System). ' +
      'Use this when the user wants to submit an invoice to KSeF. ' +
      'If seller or buyer NIP / address details are missing, they will be looked up automatically from the contractor database by company name. ' +
      'Always provide at least the seller and buyer names. Provide NIP and address only if explicitly given by the user.',
    schema: z.object({
      invoiceNumber: z.string().describe('Invoice number (e.g. FV/2024/001)'),
      issueDate: z.string().describe('Issue date in ISO format (e.g. 2024-01-15)'),
      sellDate: z.string().describe('Sale/service date in ISO format'),
      dueDate: z.string().describe('Payment due date in ISO format'),
      sellerName: z.string().describe('Seller company name'),
      sellerNip: z.string().nullable().optional().describe('Seller NIP (10 digits, no dashes or spaces). Will be looked up from contractor DB if not provided.'),
      sellerStreet: z.string().nullable().optional().describe('Seller street address (e.g. ul. Marszałkowska 1). Will be looked up from contractor DB if not provided.'),
      sellerCity: z.string().nullable().optional().describe('Seller city. Will be looked up from contractor DB if not provided.'),
      sellerZip: z.string().nullable().optional().describe('Seller postal code (e.g. 00-001). Will be looked up from contractor DB if not provided.'),
      sellerCountry: z.string().nullable().optional().describe('Seller country code (default: PL)'),
      buyerName: z.string().describe('Buyer company or person name'),
      buyerNip: z.string().nullable().optional().describe('Buyer NIP number. Will be looked up from contractor DB if not provided.'),
      buyerStreet: z.string().nullable().optional().describe('Buyer street address. Will be looked up from contractor DB if not provided.'),
      buyerCity: z.string().nullable().optional().describe('Buyer city. Will be looked up from contractor DB if not provided.'),
      buyerZip: z.string().nullable().optional().describe('Buyer postal code. Will be looked up from contractor DB if not provided.'),
      buyerCountry: z.string().nullable().optional().describe('Buyer country code (default: PL)'),
      items: z.array(FA3ItemSchema).min(1).describe('Invoice line items (at least one required)'),
      totalNet: z.number().describe('Invoice total net amount'),
      totalVat: z.number().describe('Invoice total VAT amount'),
      totalGross: z.number().describe('Invoice total gross amount'),
      currency: z.string().nullable().optional().describe('Currency code (default: PLN)'),
      paymentMethod: z.string().nullable().optional().describe('Payment method (default: transfer)'),
      paymentAccount: z.string().nullable().optional().describe('Bank account number (IBAN, optional)'),
    }),
    func: async ({
      invoiceNumber,
      issueDate,
      sellDate,
      dueDate,
      sellerName,
      sellerNip,
      sellerStreet,
      sellerCity,
      sellerZip,
      sellerCountry,
      buyerName,
      buyerNip,
      buyerStreet,
      buyerCity,
      buyerZip,
      buyerCountry,
      items,
      totalNet,
      totalVat,
      totalGross,
      currency,
      paymentMethod,
      paymentAccount,
    }: {
      invoiceNumber: string;
      issueDate: string;
      sellDate: string;
      dueDate: string;
      sellerName: string;
      sellerNip?: string;
      sellerStreet?: string;
      sellerCity?: string;
      sellerZip?: string;
      sellerCountry?: string;
      buyerName: string;
      buyerNip?: string;
      buyerStreet?: string;
      buyerCity?: string;
      buyerZip?: string;
      buyerCountry?: string;
      items: Array<{
        name: string;
        quantity: number;
        unit?: string;
        priceNet: number;
        vatRate: number;
        totalNet: number;
        totalVat: number;
        totalGross: number;
      }>;
      totalNet: number;
      totalVat: number;
      totalGross: number;
      currency?: string;
      paymentMethod?: string;
      paymentAccount?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        // Look up missing seller data from contractor DB
        let resolvedSellerNip = sellerNip;
        let resolvedSellerStreet = sellerStreet;
        let resolvedSellerCity = sellerCity;
        let resolvedSellerZip = sellerZip;
        let resolvedSellerCountry = sellerCountry;

        if (contractorService && (!sellerNip || !sellerStreet || !sellerCity || !sellerZip)) {
          const sellers = await contractorService.listContractors(userId, sellerName);
          const match = sellers.find(c =>
            c.name.toLowerCase().includes(sellerName.toLowerCase()) ||
            sellerName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) {
            resolvedSellerNip = resolvedSellerNip || match.nip || undefined;
            resolvedSellerStreet = resolvedSellerStreet || match.street || undefined;
            resolvedSellerCity = resolvedSellerCity || match.city || undefined;
            resolvedSellerZip = resolvedSellerZip || match.zip || undefined;
            resolvedSellerCountry = resolvedSellerCountry || match.country || undefined;
            logger.info('Resolved seller data from contractor DB', { sellerName, matchName: match.name });
          }
        }

        // Look up missing buyer data from contractor DB
        let resolvedBuyerNip = buyerNip;
        let resolvedBuyerStreet = buyerStreet;
        let resolvedBuyerCity = buyerCity;
        let resolvedBuyerZip = buyerZip;
        let resolvedBuyerCountry = buyerCountry;

        if (contractorService && (!buyerNip || !buyerStreet || !buyerCity || !buyerZip)) {
          const buyers = await contractorService.listContractors(userId, buyerName);
          const match = buyers.find(c =>
            c.name.toLowerCase().includes(buyerName.toLowerCase()) ||
            buyerName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) {
            resolvedBuyerNip = resolvedBuyerNip || match.nip || undefined;
            resolvedBuyerStreet = resolvedBuyerStreet || match.street || undefined;
            resolvedBuyerCity = resolvedBuyerCity || match.city || undefined;
            resolvedBuyerZip = resolvedBuyerZip || match.zip || undefined;
            resolvedBuyerCountry = resolvedBuyerCountry || match.country || undefined;
            logger.info('Resolved buyer data from contractor DB', { buyerName, matchName: match.name });
          }
        }

        if (!resolvedSellerNip) {
          return `Error: Seller NIP is required but not provided and not found in the contractor database for "${sellerName}". Please provide the seller NIP number.`;
        }
        if (!resolvedBuyerNip) {
          return `Error: Buyer NIP is required but not provided and not found in the contractor database for "${buyerName}". Please provide the buyer NIP number.`;
        }

        const invoiceData: FA3InvoiceData = {
          invoiceNumber,
          issueDate: new Date(issueDate),
          sellDate: new Date(sellDate),
          dueDate: new Date(dueDate),
          sellerName,
          sellerNip: resolvedSellerNip,
          sellerAddress: {
            street: resolvedSellerStreet || '-',
            city: resolvedSellerCity || '-',
            zip: resolvedSellerZip || '00-000',
            country: resolvedSellerCountry ?? 'PL',
          },
          buyerName,
          buyerNip: resolvedBuyerNip,
          buyerAddress: {
            street: resolvedBuyerStreet || '-',
            city: resolvedBuyerCity || '-',
            zip: resolvedBuyerZip || '00-000',
            country: resolvedBuyerCountry ?? 'PL',
          },
          items: items.map(item => ({ ...item, unit: item.unit ?? 'szt.', vatRate: String(item.vatRate) })),
          totalNet,
          totalVat,
          totalGross,
          currency: currency ?? 'PLN',
          paymentMethod: paymentMethod ?? 'transfer',
          paymentAccount,
        };

        const result = await ksefService.sendInvoiceToKSeF(userId, { invoiceData });
        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Sent direct invoice to KSeF via AI tool', { invoiceNumber, success: result.success });
        return formatKSeFSendResult(result, locale);
      } catch (error) {
        logger.error('Failed to send direct invoice to KSeF', { error, invoiceNumber });
        const t = getKSeFTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.sendFailed}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDirectSend}`;
      }
    },
  });

}
