/**
 * User Tools
 * LangChain tools for fetching user and user-company information from wFirma
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { WFirmaUser, WFirmaUserCompany } from '../../../types/wfirma.types';
import { Locale, getUserTranslations } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import {
  formatUsers,
  formatUserCompanies,
  formatUserCompany,
} from '../formatters/user.formatter';

/**
 * Tool for getting users list
 */
export function createGetUsersTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl'
): StructuredToolInterface {
  const t = getUserTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const cacheKey = 'all';
        const cached = await cacheService.getCachedData<WFirmaUser[]>(
          userId,
          'user',
          cacheKey
        );

        if (cached) {
          return formatUsers(cached, locale);
        }

        const users = await wfirmaService.getUsers();
        await cacheService.cacheData(userId, 'user', cacheKey, users);
        return formatUsers(users, locale);
      } catch (error) {
        logger.error('Failed to get users', { error });
        return `Error: ${t.errorFetchUsers}`;
      }
    },
    {
      name: 'get_users',
      description: 'Get list of users with access to the wFirma company. Shows names, emails, logins, roles, active status. Use when user asks about company users or who has access.',
      schema: z.object({}),
    }
  );
}

/**
 * Tool for getting user-company relationships
 */
export function createGetUserCompaniesTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl'
): StructuredToolInterface {
  const t = getUserTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ limit, page }: { limit?: number; page?: number }) => {
      try {
        const cacheKey = `list-${limit || 100}-${page || 1}`;
        const cached = await cacheService.getCachedData<WFirmaUserCompany[]>(
          userId,
          'user_company',
          cacheKey
        );

        if (cached) {
          return formatUserCompanies(cached, locale);
        }

        const userCompanies = await wfirmaService.findUserCompanies({ limit, page });
        await cacheService.cacheData(userId, 'user_company', cacheKey, userCompanies);
        return formatUserCompanies(userCompanies, locale);
      } catch (error) {
        logger.error('Failed to get user companies', { error });
        return `Error: ${t.errorFetchUserCompanies}`;
      }
    },
    {
      name: 'get_user_companies',
      description: 'Get user-company relationships showing which users have access to which companies with their roles and permissions. Use when user asks about user access or permissions.',
      schema: z.object({
        limit: z.number().optional().describe('Max results to return (default: 100)'),
        page: z.number().optional().describe('Page number for pagination (default: 1)'),
      }),
    }
  );
}

/**
 * Tool for getting specific user-company relationship by ID
 */
export function createGetUserCompanyByIdTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale = 'pl'
): StructuredToolInterface {
  const t = getUserTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ id }: { id: string }) => {
      try {
        const cacheKey = id;
        const cached = await cacheService.getCachedData<WFirmaUserCompany>(
          userId,
          'user_company',
          cacheKey
        );

        if (cached) {
          return formatUserCompany(cached, locale);
        }

        const userCompany = await wfirmaService.getUserCompanyById(id);
        if (!userCompany) {
          return t.userCompanyNotFound;
        }

        await cacheService.cacheData(userId, 'user_company', cacheKey, userCompany);
        return formatUserCompany(userCompany, locale);
      } catch (error) {
        logger.error('Failed to get user company by ID', { error, id });
        return `Error: ${t.errorFetchUserCompany}`;
      }
    },
    {
      name: 'get_user_company_by_id',
      description: 'Get specific user-company relationship by ID with full details (role, permissions). Use when user asks about specific user-company relationship details.',
      schema: z.object({
        id: z.string().describe('User-company relationship ID'),
      }),
    }
  );
}
