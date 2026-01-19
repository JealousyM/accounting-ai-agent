/**
 * Financial Summary Tool
 * LangChain tool for fetching financial data
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { FinancialData } from '../../../types/wfirma.types';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { formatFinancialData } from '../formatters';

export function createGetFinancialSummaryTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ year }: { year: number }) => {
      try {
        const cacheKey = `financial_${year}`;
        const cached = await cacheService.getCachedData<FinancialData>(
          userId,
          'financial',
          cacheKey
        );

        if (cached) {
          return formatFinancialData(cached);
        }

        const financialData = await wfirmaService.getFinancialData(year);
        await cacheService.cacheData(userId, 'financial', cacheKey, financialData);
        return formatFinancialData(financialData);
      } catch (error) {
        logger.error('Failed to get financial summary', { error });
        return 'Error: Failed to fetch financial data from wFirma';
      }
    },
    {
      name: 'get_financial_summary',
      description: 'Get financial summary for a specific year (revenue, expenses, profit). Use when user asks about their income, expenses, or profit.',
      schema: z.object({
        year: z.number().describe('Fiscal year (e.g., 2024)'),
      }),
    }
  );
}
