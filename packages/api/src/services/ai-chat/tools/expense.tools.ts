/**
 * Expense Tools
 * LangChain tools for expense operations (read-only)
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getExpenseTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { formatExpensesList, formatExpenseDetails } from '../formatters';

/**
 * Tool: Get expenses list with filtering
 */
export function createGetExpensesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale
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

        return formatExpensesList(expenses, locale);
      } catch (error) {
        logger.error('Failed to fetch expenses', { error, userId });
        return `Error: ${getExpenseTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_expenses',
      description:
        'Get list of expenses from wFirma. Can filter by contractor name, date range, payment status, and expense type. Use this to find business expenses, bills, and purchases.',
      schema: z.object({
        contractorName: z
          .string()
          .optional()
          .describe('Contractor/vendor name to filter expenses by'),
        dateFrom: z
          .string()
          .optional()
          .describe('Start date (YYYY-MM-DD)'),
        dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
        paid: z
          .boolean()
          .optional()
          .describe('Filter by payment status (true = paid, false = unpaid)'),
        expenseType: z
          .enum(['invoice', 'bill', 'vat_exempt'])
          .optional()
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
  locale: Locale
): StructuredToolInterface {
  return (tool as any)(
    async ({ expenseId }: { expenseId: string }) => {
      try {
        const expense = await wfirmaService.getExpense(expenseId);

        if (!expense) {
          return getExpenseTranslations(locale).notFoundById;
        }

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
