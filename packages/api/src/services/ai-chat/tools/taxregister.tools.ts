/**
 * Tax Register Tools
 * LangChain tools for KPiR (tax register) entries
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getTaxRegisterTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { formatTaxRegisterResult } from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';

/**
 * Tool: Get KPiR tax register entries
 * Retrieves tax register entries from wFirma for a given year and optional month
 */
export function createGetTaxRegistersTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_tax_registers',
    description:
      'Get KPiR (Ksi\u0119ga Przychod\u00f3w i Rozchod\u00f3w) tax register entries for a specific year and optional month. Returns entries, monthly sums, and cumulative totals. Use when user asks about KPiR, tax register, book of revenues and expenses, income/expense book entries.',
    schema: z.object({
      year: z
        .number()
        .int()
        .min(1970)
        .max(2030)
        .describe('Year for the tax register query (e.g., 2024, 2025)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .nullable()
        .optional()
        .describe(
          'Optional month number (1-12) to filter entries (e.g., 1 for January, 12 for December)'
        ),
    }),
    func: async ({ year, month }: { year: number; month?: number | null }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const result = await wfirmaService.getTaxRegisters({ year, month: month ?? undefined });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Tax register entries fetched', {
          userId,
          year,
          month,
          entriesCount: Array.isArray(result) ? result.length : undefined,
        });

        return formatTaxRegisterResult(result, locale);
      } catch (error) {
        logger.error('Failed to fetch tax register entries', {
          error,
          userId,
          year,
          month,
        });
        return `Error: ${getTaxRegisterTranslations(locale).errorFetch}`;
      }
    },
  });

}
