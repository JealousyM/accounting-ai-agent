/**
 * Company Info Tools
 * LangChain tools for fetching company information from wFirma
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import {
  WFirmaCompany,
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
} from '../../../types/wfirma.types';
import { Locale, getCompanyTranslations } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import {
  formatCompanyInfo,
  formatCompanyAccounts,
  formatCompanyAddresses,
} from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';

/**
 * Tool for getting company basic information
 */
export function createGetCompanyInfoTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl',
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const cached = await cacheService.getCachedData<WFirmaCompany>(
          userId,
          'company',
          'default'
        );

        if (cached) {
          return formatCompanyInfo(cached, locale);
        }

        const companyData = await wfirmaService.getCompanyData();
        await cacheService.cacheData(userId, 'company', 'default', companyData);
        await incrementWFirmaUsage(subscriptionService, userId);
        return formatCompanyInfo(companyData, locale);
      } catch (error) {
        logger.error('Failed to get company info', { error });
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_company_info',
      description: 'Get company basic information from wFirma (name, NIP, REGON, KRS, address, email, phone). Use when user asks about their company data.',
      schema: z.object({}),
    }
  );
}

/**
 * Tool for getting company bank accounts
 */
export function createGetCompanyAccountsTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl',
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const cacheKey = 'accounts';
        const cached = await cacheService.getCachedData<WFirmaCompanyAccount[]>(
          userId,
          'company',
          cacheKey
        );

        if (cached) {
          return formatCompanyAccounts(cached, locale);
        }

        const accounts = await wfirmaService.getCompanyAccounts();
        await cacheService.cacheData(userId, 'company', cacheKey, accounts);
        await incrementWFirmaUsage(subscriptionService, userId);
        return formatCompanyAccounts(accounts, locale);
      } catch (error) {
        logger.error('Failed to get company accounts', { error });
        return `Error: ${t.errorFetchAccounts}`;
      }
    },
    {
      name: 'get_company_accounts',
      description: 'Get company bank accounts from wFirma (account numbers, bank names, SWIFT codes). Use when user asks about their bank accounts.',
      schema: z.object({}),
    }
  );
}

/**
 * Tool for getting company addresses
 */
export function createGetCompanyAddressesTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl',
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const cacheKey = 'addresses';
        const cached = await cacheService.getCachedData<WFirmaCompanyAddress[]>(
          userId,
          'company',
          cacheKey
        );

        if (cached) {
          return formatCompanyAddresses(cached, locale);
        }

        const addresses = await wfirmaService.getCompanyAddresses();
        await cacheService.cacheData(userId, 'company', cacheKey, addresses);
        await incrementWFirmaUsage(subscriptionService, userId);
        return formatCompanyAddresses(addresses, locale);
      } catch (error) {
        logger.error('Failed to get company addresses', { error });
        return `Error: ${t.errorFetchAddresses}`;
      }
    },
    {
      name: 'get_company_addresses',
      description: 'Get company addresses from wFirma (main registration address, correspondence address). Use when user asks about company addresses.',
      schema: z.object({}),
    }
  );
}

