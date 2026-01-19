/**
 * Company Info Tool
 * LangChain tool for fetching company information
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { WFirmaCompany } from '../../../types/wfirma.types';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { formatCompanyInfo } from '../formatters';

export function createGetCompanyInfoTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const cached = await cacheService.getCachedData<WFirmaCompany>(
          userId,
          'company',
          'default'
        );

        if (cached) {
          return formatCompanyInfo(cached);
        }

        const companyData = await wfirmaService.getCompanyData();
        await cacheService.cacheData(userId, 'company', 'default', companyData);
        return formatCompanyInfo(companyData);
      } catch (error) {
        logger.error('Failed to get company info', { error });
        return 'Error: Failed to fetch company data from wFirma';
      }
    },
    {
      name: 'get_company_info',
      description: 'Get company information from wFirma (name, NIP, address, bank accounts). Use when user asks about their company data.',
      schema: z.object({}),
    }
  );
}
