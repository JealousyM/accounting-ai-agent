/**
 * Company Info Tools
 * LangChain tools for fetching company information from wFirma
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import {
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
} from '../../../types/wfirma.types';
import { Locale, getCompanyTranslations } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { CompanyEnrichmentService, validateNip } from '../../company-enrichment.service';
import {
  formatCompanyAccounts,
  formatCompanyAddresses,
  formatCompanyDetails,
  formatPublicRegistryData,
} from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';

/**
 * Tool for getting company basic information
 */
export function createGetCompanyInfoTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  enrichmentService: CompanyEnrichmentService,
  userId: string,
  locale: Locale = 'pl',
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  return new DynamicStructuredTool({
    name: 'get_company_info',
    description: 'Get complete company information from wFirma and public registries (name, NIP, REGON, KRS, VAT status, addresses, bank accounts, subscription). Use when user asks about their company data.',
    schema: z.object({}),
    func: async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        // Check cache for full details
        const cached = await cacheService.getCachedData<any>(
          userId, 'company', 'details'
        );

        let companyDetails: any;
        if (cached) {
          companyDetails = cached;
        } else {
          companyDetails = await wfirmaService.getCompanyDetails();
          await cacheService.cacheData(userId, 'company', 'details', companyDetails);
          await incrementWFirmaUsage(subscriptionService, userId);
        }

        // Enrich with public registry (does not consume wfirma usage)
        const publicRegistry = await enrichmentService.enrichByNip(companyDetails.nip, userId);

        return formatCompanyDetails(companyDetails, locale, publicRegistry || undefined);
      } catch (error) {
        logger.error('Failed to get company info', { error });
        return `Error: ${t.errorFetch}`;
      }
    },
  });

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

  return new DynamicStructuredTool({
    name: 'get_company_accounts',
    description: 'Get company bank accounts from wFirma (account numbers, bank names, SWIFT codes). Use when user asks about their bank accounts.',
    schema: z.object({}),
    func: async () => {
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
  });

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

  return new DynamicStructuredTool({
    name: 'get_company_addresses',
    description: 'Get company addresses from wFirma (main registration address, correspondence address). Use when user asks about company addresses.',
    schema: z.object({}),
    func: async () => {
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
  });

}

/**
 * Tool for looking up any Polish company by NIP in public registries
 */
export function createLookupCompanyByNipTool(
  enrichmentService: CompanyEnrichmentService,
  userId: string,
  locale: Locale = 'pl',
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  return new DynamicStructuredTool({
    name: 'lookup_company_by_nip',
    description: 'Look up any Polish company by NIP in public registries (REGON, KRS, VAT status, verified bank accounts, board members). Use when user asks to check or verify a company by NIP.',
    schema: z.object({
      nip: z.string().regex(/^\d{10}$/).describe('Polish NIP number (10 digits)'),
    }),
    func: async (input: { nip: string }) => {
      try {
        if (!validateNip(input.nip)) {
          return t.invalidNip;
        }

        const data = await enrichmentService.enrichByNip(input.nip, userId);

        if (!data) {
          return t.nipNotFound;
        }

        return formatPublicRegistryData(data, locale);
      } catch (error) {
        logger.error('Failed to lookup company by NIP', { nip: input.nip, error });
        return `Error: ${t.errorFetchPublicRegistry}`;
      }
    },
  });

}

