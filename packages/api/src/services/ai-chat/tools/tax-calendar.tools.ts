/**
 * Tax Calendar Tools
 * LangChain tool for Polish tax payment deadlines
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getTaxCalendarTranslations, Locale } from '../../../i18n';
import { TaxCalendarService } from '../../tax-calendar.service';
import { TaxCategory } from '../../../types/tax-calendar.types';
import { formatTaxDeadlinesList } from '../formatters';

export function createGetTaxDeadlinesTool(
  taxCalendarService: TaxCalendarService,
  locale: Locale,
): StructuredToolInterface {
  return (tool as any)(
    async ({
      year,
      month,
      category,
    }: {
      year: number;
      month?: number;
      category?: string;
    }) => {
      try {
        const deadlines = taxCalendarService.getDeadlines(
          {
            year,
            month: month || undefined,
            category: (category as TaxCategory) || undefined,
          },
          locale,
        );

        logger.info('Generated tax deadlines for AI tool', {
          year,
          month,
          category,
          count: deadlines.length,
        });

        return formatTaxDeadlinesList(deadlines, locale);
      } catch (error) {
        logger.error('Failed to get tax deadlines', { error });
        const t = getTaxCalendarTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_tax_deadlines',
      description:
        'Get Polish statutory tax payment deadlines (VAT-7, CIT, PIT-4R, ZUS, VAT-UE, PCC, dividends) for a given period. These are system-generated deadlines based on Polish tax law, NOT user-created terms. Use when user asks about tax deadlines, payment dates, tax calendar, or upcoming tax obligations. NOTE: When user asks about "сроки" or "deadlines" in general, also call get_terms to include user-created custom deadlines/appointments.',
      schema: z.object({
        year: z.number().int().min(2020).max(2030).describe('Year for the deadlines'),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .nullable()
          .optional()
          .describe('Month (1-12). Omit for full year overview.'),
        category: z
          .enum(['vat', 'cit', 'pit', 'zus', 'pcc', 'dividend'])
          .nullable()
          .optional()
          .describe('Filter by tax category'),
      }),
    },
  );
}
