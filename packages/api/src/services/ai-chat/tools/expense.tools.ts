/**
 * Expense Tools
 * LangChain tools for expense operations (read + receipt-driven create)
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getExpenseTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { CreateExpenseItem, WFirmaExpense } from '../../../types/wfirma.types';
import { ParsedReceipt } from '../../ocr/types';
import { formatExpensesList, formatExpenseDetails, formatExpenseCreated } from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { CompanyEnrichmentService, validateNip } from '../../company-enrichment.service';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import { sanitizeForPrompt } from '../utils';

/**
 * Core "parsed receipt → wFirma expense" pipeline shared by the AI tool
 * and the Telegram inline-button handler. Resolves contractor by NIP
 * (with GUS BIR1.1 enrichment when missing), then creates the expense
 * as a single line item from the document totals.
 *
 * Throws on contractor-resolution failure or wFirma errors — callers
 * are expected to catch and present a localized error.
 */
export async function createExpenseFromParsedReceipt(
  parsed: ParsedReceipt,
  wfirmaService: WFirmaIntegrationService,
  opts: {
    userId: string;
    locale: Locale;
    enrichmentService?: CompanyEnrichmentService;
    cacheService?: WFirmaCacheService;
  },
): Promise<WFirmaExpense> {
  const { userId, locale, enrichmentService, cacheService } = opts;
  const normalizedNip = parsed.sellerNip?.replace(/\D/g, '');

  let contractorId: string | undefined;
  let contractorName = parsed.sellerName;

  if (normalizedNip && validateNip(normalizedNip)) {
    const found = await wfirmaService.getContractors({ nip: normalizedNip, limit: 1 });
    if (found.length) {
      contractorId = found[0].id;
      contractorName = found[0].name || parsed.sellerName;
    } else {
      const enriched = enrichmentService
        ? await enrichmentService.enrichByNip(normalizedNip, userId)
        : null;
      const finalName = parsed.sellerName
        || enriched?.name
        || (locale === 'ru'
          ? `Контрагент (NIP ${normalizedNip})`
          : locale === 'en'
            ? `Contractor (NIP ${normalizedNip})`
            : `Kontrahent (NIP ${normalizedNip})`);
      const created = await wfirmaService.createContractor({
        name: finalName,
        nip: normalizedNip,
        address: enriched
          ? {
            street: enriched.street || '',
            city: enriched.city || '',
            zip: enriched.zip || '',
            country: 'PL',
          }
          : undefined,
      });
      contractorId = created.id;
      contractorName = created.name;
      if (cacheService) await cacheService.invalidateCache(userId, 'contractor');
    }
  } else if (parsed.sellerName) {
    const found = await wfirmaService.getContractors({ search: parsed.sellerName, limit: 1 });
    if (found.length) {
      contractorId = found[0].id;
      contractorName = found[0].name;
    } else {
      const created = await wfirmaService.createContractor({ name: parsed.sellerName });
      contractorId = created.id;
      contractorName = created.name;
      if (cacheService) await cacheService.invalidateCache(userId, 'contractor');
    }
  } else {
    throw new Error('cannotResolveSeller');
  }

  if (!contractorId) {
    throw new Error('cannotResolveSeller');
  }

  // Single-line expense from document totals. Per-item splits can come later.
  const gross = parsed.totalGross;
  let net = parsed.totalNet;
  let vat = parsed.totalVat;
  // Use the most-common item VAT rate as the document rate when present.
  const docVatRate = parsed.items?.find((i) => i.vatRate !== undefined)?.vatRate;
  if (net === undefined || vat === undefined) {
    const rate = docVatRate ?? 23;
    net = +(gross / (1 + rate / 100)).toFixed(2);
    vat = +(gross - net).toFixed(2);
  }

  const itemName = parsed.documentNumber
    || parsed.items?.[0]?.name
    || (locale === 'ru' ? 'Чек' : locale === 'en' ? 'Receipt' : 'Paragon');

  const items: CreateExpenseItem[] = [{
    name: itemName,
    totalNet: net,
    totalVat: vat,
    totalGross: gross,
    vat: docVatRate !== undefined ? String(docVatRate) : '23',
  }];

  const expense = await wfirmaService.createExpense({
    type: 'invoice',
    date: parsed.issueDate,
    currency: parsed.currency || 'PLN',
    description: parsed.documentNumber
      || sanitizeForPrompt(contractorName || '', 200),
    contractorId,
    items,
  });

  if (cacheService) await cacheService.invalidateCache(userId, 'expense');

  return expense;
}

/**
 * Tool: Get expenses list with filtering
 */
export function createGetExpensesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({
      contractorName,
      dateFrom,
      dateTo,
      paid,
      expenseType,
    }: {
      contractorName?: string;
      dateFrom?: string;
      dateTo?: string;
      paid?: boolean;
      expenseType?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getExpenseTranslations(locale);

        let contractorId: string | undefined;

        // If contractor name provided, find contractor ID
        if (contractorName) {
          const contractors = await wfirmaService.getContractors({
            search: contractorName,
            limit: 10,
          });

          if (contractors.length === 0) {
            return t.contractorNotFound;
          }

          // Use first matching contractor
          contractorId = contractors[0].id;
        }

        const expenses = await wfirmaService.findExpenses({
          contractorId,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          paid,
          type: expenseType as any,
          limit: 100,
        });

        if (expenses.length === 0) {
          return t.notFound;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatExpensesList(expenses, locale);
      } catch (error) {
        logger.error('Failed to fetch expenses', { error, userId });
        return `Error: ${getExpenseTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_expenses',
      description:
        'Get list of INCOMING expenses/bills (wydatki — purchases and bills received from vendors) from wFirma. For OUTGOING invoices issued to clients, use get_invoices instead. CRITICAL: whenever the user mentions any period (month, year, quarter, "last month", "April 2026", etc.) you MUST pass dateFrom and dateTo. Never call this tool without date filters if a period was mentioned — returning unfiltered results is a bug.',
      schema: z.object({
        contractorName: z
          .string()
          .nullable().optional()
          .describe('Contractor/vendor name to filter expenses by'),
        dateFrom: z
          .string()
          .nullable().optional()
          .describe('Start date YYYY-MM-DD inclusive. REQUIRED when user specifies any period. For "April 2026" pass "2026-04-01".'),
        dateTo: z.string().nullable().optional().describe('End date YYYY-MM-DD inclusive. REQUIRED when user specifies any period. For "April 2026" pass "2026-04-30".'),
        paid: z
          .boolean()
          .nullable().optional()
          .describe('Filter by payment status (true = paid, false = unpaid)'),
        expenseType: z
          .enum(['invoice', 'bill', 'vat_exempt'])
          .nullable().optional()
          .describe('Filter by expense type'),
      }),
    }
  );
}

/**
 * Tool: Get expense details by ID
 */
export function createGetExpenseDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({ expenseId }: { expenseId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const expense = await wfirmaService.getExpense(expenseId);

        if (!expense) {
          return getExpenseTranslations(locale).notFoundById;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatExpenseDetails(expense, locale);
      } catch (error) {
        logger.error('Failed to fetch expense details', {
          error,
          userId,
          expenseId,
        });
        return `Error: ${getExpenseTranslations(locale).errorFetchDetails}`;
      }
    },
    {
      name: 'get_expense_details',
      description:
        'Get detailed information about a specific expense by ID, including all expense items/parts, contractor information, and payment details.',
      schema: z.object({
        expenseId: z.string().describe('Expense ID'),
      }),
    }
  );
}

/**
 * Tool: Create an expense from a parsed receipt / faktura.
 *
 * Powers the Telegram OCR "Add as expense" inline button and lets the AI
 * chat log a receipt directly when the user asks. Reuses the same
 * contractor-by-NIP resolution path as `create_contractor` (wFirma first,
 * then GUS BIR1.1 enrichment, then create) so the seller is reused
 * cross-platform instead of duplicated per receipt.
 */
export function createCreateExpenseFromReceiptTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService,
  enrichmentService?: CompanyEnrichmentService,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      sellerName,
      sellerNip,
      sellerAddress,
      issueDate,
      documentNumber,
      totalNet,
      totalVat,
      totalGross,
      currency,
      vatRate,
      itemName,
    }: {
      sellerName?: string;
      sellerNip?: string;
      sellerAddress?: string;
      issueDate?: string;
      documentNumber?: string;
      totalNet?: number;
      totalVat?: number;
      totalGross: number;
      currency?: string;
      vatRate?: number;
      itemName?: string;
    }) => {
      const t = getExpenseTranslations(locale);
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const parsed: ParsedReceipt = {
          sellerName,
          sellerNip,
          sellerAddress,
          issueDate,
          documentNumber,
          totalNet,
          totalVat,
          totalGross,
          currency: currency || 'PLN',
          documentType: 'unknown',
          items: itemName
            ? [{ name: itemName, vatRate, totalGross }]
            : (vatRate !== undefined
              ? [{ name: itemName || documentNumber || 'item', vatRate, totalGross }]
              : undefined),
        };

        const expense = await createExpenseFromParsedReceipt(parsed, wfirmaService, {
          userId,
          locale,
          enrichmentService,
          cacheService,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatExpenseCreated(expense, locale);
      } catch (error) {
        logger.error('Failed to create expense from receipt', { error, userId });
        if (error instanceof Error && error.message === 'cannotResolveSeller') {
          return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${t.cannotResolveSeller}`;
        }
        const msg = error instanceof Error ? error.message : t.errorCreate;
        return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${sanitizeForPrompt(msg)}`;
      }
    },
    {
      name: 'create_expense_from_receipt',
      description:
        'Create a new EXPENSE in wFirma from a parsed receipt or invoice (faktura/paragon). Resolves the seller by NIP — uses an existing wFirma contractor when found, otherwise creates one (auto-filling name/address from the Polish public registry). Pass at minimum `totalGross`; pass `sellerNip` whenever the document has one.',
      schema: z.object({
        sellerName: z.string().nullable().optional().describe('Seller / merchant name as printed on the document'),
        sellerNip: z.string().nullable().optional().describe('Polish NIP (10 digits, dashes are stripped). Strongly recommended — without it the contractor cannot be matched in the public registry.'),
        sellerAddress: z.string().nullable().optional().describe('Seller address as a single line (used as a fallback when GUS lookup is empty)'),
        issueDate: z.string().nullable().optional().describe('Issue date YYYY-MM-DD; defaults to today on the wFirma side if omitted'),
        documentNumber: z.string().nullable().optional().describe('Faktura / paragon number — used as the expense description'),
        totalNet: z.number().nullable().optional().describe('NET amount; computed from gross+vatRate if missing'),
        totalVat: z.number().nullable().optional().describe('VAT amount; computed from gross-net if missing'),
        totalGross: z.number().describe('Gross amount paid (REQUIRED)'),
        currency: z.string().nullable().optional().describe('ISO currency code, default "PLN"'),
        vatRate: z.number().nullable().optional().describe('Effective VAT rate as a percent (e.g. 23, 8, 5, 0); defaults to 23'),
        itemName: z.string().nullable().optional().describe('Optional line-item name; defaults to documentNumber or "Paragon"'),
      }),
    },
  );
}
