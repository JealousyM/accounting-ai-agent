/**
 * Payment Tools
 * LangChain tools for payment operations
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getPaymentTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import {
  formatPaymentsList,
  formatPaymentDetails,
  formatPaymentCreated,
  formatPaymentUpdated,
  formatPaymentDeleted,
} from '../formatters';

/**
 * Tool: Get payments list with filtering
 */
export function createGetPaymentsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_payments',
    description:
      'Get list of payments from wFirma. Can filter by invoice number, object type (invoice/expense), date range, and payment method.',
    schema: z.object({
      invoiceNumber: z
        .string()
        .nullable().optional()
        .describe('Invoice number to get payments for'),
      objectType: z
        .enum(['invoice', 'expense'])
        .nullable().optional()
        .describe('Filter by object type'),
      dateFrom: z
        .string()
        .nullable().optional()
        .describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().nullable().optional().describe('End date (YYYY-MM-DD)'),
      paymentMethod: z
        .enum(['transfer', 'cash', 'card', 'compensation', 'other'])
        .nullable().optional()
        .describe('Payment method'),
    }),
    func: async ({
      invoiceNumber,
      objectType,
      dateFrom,
      dateTo,
      paymentMethod,
    }: {
      invoiceNumber?: string;
      objectType?: string;
      dateFrom?: string;
      dateTo?: string;
      paymentMethod?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getPaymentTranslations(locale);

        let objectId: string | undefined;

        // If invoice number provided, find invoice ID
        if (invoiceNumber) {
          const invoices = await wfirmaService.findInvoices({
            invoiceNumber,
            limit: 10,
          });
          if (invoices.length === 0) {
            return t.invoiceNotFound;
          }
          objectId = invoices[0].id;
        }

        const payments = await wfirmaService.findPayments({
          objectName:
            objectType === 'expense'
              ? 'expense'
              : objectType === 'invoice'
                ? 'invoice'
                : undefined,
          objectId,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          paymentMethod: paymentMethod as any,
          limit: 100,
        });

        if (payments.length === 0) {
          return t.notFound;
        }

        // Enrich payments with currency from invoices
        const enrichedPayments = await Promise.all(
          payments.map(async (payment) => {
            if (payment.objectName === 'invoice' && !payment.currency) {
              try {
                logger.info('Fetching invoice for payment currency enrichment', {
                  paymentId: payment.id,
                  invoiceId: payment.objectId,
                });
                const invoice = await wfirmaService.getInvoiceById(payment.objectId);
                if (invoice) {
                  logger.info('Successfully enriched payment with currency', {
                    paymentId: payment.id,
                    currency: invoice.currency,
                  });
                  return { ...payment, currency: invoice.currency };
                } else {
                  logger.warn('Invoice not found for payment currency enrichment', {
                    paymentId: payment.id,
                    invoiceId: payment.objectId,
                  });
                }
              } catch (error) {
                logger.error('Failed to fetch invoice for payment currency', {
                  paymentId: payment.id,
                  invoiceId: payment.objectId,
                  error,
                });
              }
            }
            return payment;
          })
        );

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatPaymentsList(enrichedPayments, locale);
      } catch (error) {
        logger.error('Failed to fetch payments', { error, userId });
        return `Error: ${getPaymentTranslations(locale).errorFetch}`;
      }
    },
  });

}

/**
 * Tool: Get payment details by ID
 */
export function createGetPaymentDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_payment_details',
    description:
      'Get detailed information about a specific payment by ID.',
    schema: z.object({
      paymentId: z.string().describe('Payment ID'),
    }),
    func: async ({ paymentId }: { paymentId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        let payment = await wfirmaService.getPayment(paymentId);

        if (!payment) {
          return getPaymentTranslations(locale).notFoundById;
        }

        // Enrich payment with currency from invoice if missing
        if (payment.objectName === 'invoice' && !payment.currency) {
          try {
            const invoice = await wfirmaService.getInvoiceById(payment.objectId);
            if (invoice) {
              payment = { ...payment, currency: invoice.currency };
            }
          } catch (error) {
            logger.warn('Failed to fetch invoice for payment currency', {
              paymentId: payment.id,
              invoiceId: payment.objectId,
              error,
            });
          }
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatPaymentDetails(payment, locale);
      } catch (error) {
        logger.error('Failed to fetch payment details', {
          error,
          userId,
          paymentId,
        });
        return `Error: ${getPaymentTranslations(locale).errorFetchDetails}`;
      }
    },
  });

}

/**
 * Tool: Add payment to invoice or expense
 */
export function createAddPaymentTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'add_payment',
    description:
      'Add/create/register a new payment to an invoice. Use this when user wants to ADD, CREATE, REGISTER, RECORD a payment (keywords: добавить, создать, зарегистрировать оплату/платеж). Records that a payment has been received for an invoice.',
    schema: z.object({
      invoiceNumber: z
        .string()
        .describe('Invoice number to add payment to (e.g., FV 1/2026)'),
      amount: z.number().describe('Payment amount in invoice currency (e.g., 100 for 100 EUR)'),
      date: z.string().describe('Payment date (YYYY-MM-DD format, e.g., 2026-01-20)'),
      paymentMethod: z
        .enum(['transfer', 'cash', 'card', 'compensation', 'other'])
        .nullable().optional()
        .describe('Payment method (default: transfer)'),
    }),
    func: async ({
      invoiceNumber,
      amount,
      date,
      paymentMethod,
    }: {
      invoiceNumber: string;
      amount: number;
      date: string;
      paymentMethod?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getPaymentTranslations(locale);

        // Find invoice
        const invoices = await wfirmaService.findInvoices({
          invoiceNumber,
          limit: 10,
        });

        if (invoices.length === 0) {
          return t.invoiceNotFound;
        }

        const invoice = invoices[0];

        // Create payment
        const payment = await wfirmaService.createPayment({
          objectName: 'invoice',
          objectId: invoice.id,
          value: amount,
          date: new Date(date),
          paymentMethod: paymentMethod as any,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        // Invalidate cache
        await cacheService.invalidateCache(userId, 'invoice');
        await cacheService.invalidateCache(userId, 'payment');

        return formatPaymentCreated(
          payment,
          invoice.invoiceNumber,
          invoice.currency || undefined,
          locale
        );
      } catch (error) {
        logger.error('Failed to add payment', {
          error,
          userId,
          invoiceNumber,
        });
        return `Error: ${getPaymentTranslations(locale).errorCreate}`;
      }
    },
  });

}

/**
 * Tool: Update payment
 */
export function createUpdatePaymentTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'update_payment',
    description:
      'Update an existing payment. Can update amount, date, or payment method.',
    schema: z.object({
      paymentId: z.string().describe('Payment ID to update'),
      amount: z.number().nullable().optional().describe('New payment amount'),
      date: z.string().nullable().optional().describe('New payment date (YYYY-MM-DD)'),
      paymentMethod: z
        .enum(['transfer', 'cash', 'card', 'compensation', 'other'])
        .nullable().optional()
        .describe('New payment method'),
    }),
    func: async ({
      paymentId,
      amount,
      date,
      paymentMethod,
    }: {
      paymentId: string;
      amount?: number;
      date?: string;
      paymentMethod?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getPaymentTranslations(locale);

        const updateData: any = {};
        if (amount !== undefined) updateData.value = amount;
        if (date !== undefined) updateData.date = new Date(date);
        if (paymentMethod !== undefined)
          updateData.paymentMethod = paymentMethod;

        if (Object.keys(updateData).length === 0) {
          return t.noFieldsToUpdate;
        }

        const payment = await wfirmaService.updatePayment(
          paymentId,
          updateData
        );

        await incrementWFirmaUsage(subscriptionService, userId);

        // Invalidate cache
        await cacheService.invalidateCache(userId, 'invoice');
        await cacheService.invalidateCache(userId, 'payment');

        return formatPaymentUpdated(payment, locale);
      } catch (error) {
        logger.error('Failed to update payment', { error, userId, paymentId });
        return `Error: ${getPaymentTranslations(locale).errorUpdate}`;
      }
    },
  });

}

/**
 * Tool: Delete payment
 */
export function createDeletePaymentTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'delete_payment',
    description:
      'Delete a payment by ID. WARNING: This action cannot be undone.',
    schema: z.object({
      paymentId: z.string().describe('Payment ID to delete'),
    }),
    func: async ({ paymentId }: { paymentId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getPaymentTranslations(locale);

        // Get payment details before deleting
        const payment = await wfirmaService.getPayment(paymentId);

        if (!payment) {
          return t.notFoundById;
        }

        await wfirmaService.deletePayment(paymentId);

        await incrementWFirmaUsage(subscriptionService, userId);

        // Invalidate cache
        await cacheService.invalidateCache(userId, 'invoice');
        await cacheService.invalidateCache(userId, 'payment');

        return formatPaymentDeleted(payment, locale);
      } catch (error) {
        logger.error('Failed to delete payment', { error, userId, paymentId });
        return `Error: ${getPaymentTranslations(locale).errorDelete}`;
      }
    },
  });

}
