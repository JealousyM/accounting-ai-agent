/**
 * Contractor Tools
 * LangChain tools for contractor CRUD operations
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getContractorTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import {
  formatContractorsList,
  formatContractorCreated,
  formatContractorUpdated,
  formatContractorDeleted,
} from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';

export function createGetContractorsTool(
  wfirmaService: WFirmaIntegrationService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ search, nip, limit }: { search?: string; nip?: string; limit?: number }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const contractors = await wfirmaService.getContractors({
          search,
          nip,
          limit: limit || 100,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched contractors for AI tool', { count: contractors.length });
        return formatContractorsList(contractors, locale);
      } catch (error) {
        logger.error('Failed to get contractors', { error });
        const t = getContractorTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_contractors',
      description: 'Get list of contractors/customers from wFirma. Can filter by name or NIP. Use when user asks about their clients or contractors.',
      schema: z.object({
        search: z.string().nullable().optional().describe('Search by contractor name'),
        nip: z.string().nullable().optional().describe('Filter by NIP number'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
      }),
    }
  );
}

export function createCreateContractorTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      name,
      nip,
      regon,
      email,
      phone,
      street,
      city,
      zip,
      country,
      bankAccount,
      notes,
    }: {
      name: string;
      nip?: string;
      regon?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      zip?: string;
      country?: string;
      bankAccount?: string;
      notes?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const address = (street || city || zip || country)
          ? {
              street: street || '',
              city: city || '',
              zip: zip || '',
              country: country || 'PL',
            }
          : undefined;

        const contractorData = {
          name,
          nip,
          regon,
          email,
          phone,
          address,
          bankAccount,
          notes,
        };

        const contractor = await wfirmaService.createContractor(contractorData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'contractor');

        return formatContractorCreated(contractor, locale);
      } catch (error) {
        logger.error('Failed to create contractor', { error });
        const t = getContractorTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- name

**${t.recommendedFields}:**
- nip (NIP)
- email
- city, zip, street

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'create_contractor',
      description: 'Create a new contractor/customer in wFirma. Required: name. Recommended: city (city name). Optional: nip, regon, email, phone, street, zip, country (2-letter code like PL, LT), bankAccount, notes.',
      schema: z.object({
        name: z.string().describe('Full name or company name of the contractor (required)'),
        nip: z.string().nullable().optional().describe('NIP (Polish tax ID) - 10 digits'),
        regon: z.string().nullable().optional().describe('REGON number'),
        email: z.string().nullable().optional().describe('Email address'),
        phone: z.string().nullable().optional().describe('Phone number'),
        street: z.string().nullable().optional().describe('Street address'),
        city: z.string().nullable().optional().describe('City'),
        zip: z.string().nullable().optional().describe('Postal code (e.g., 00-001)'),
        country: z.string().nullable().optional().describe('Country code (default: PL)'),
        bankAccount: z.string().nullable().optional().describe('Bank account number'),
        notes: z.string().nullable().optional().describe('Additional notes'),
      }),
    }
  );
}

export function createUpdateContractorTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      contractorName,
      newName,
      nip,
      regon,
      email,
      phone,
      street,
      city,
      zip,
      country,
      bankAccount,
      notes,
    }: {
      contractorName: string;
      newName?: string;
      nip?: string;
      regon?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      zip?: string;
      country?: string;
      bankAccount?: string;
      notes?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const contractors = await wfirmaService.getContractors({ search: contractorName, limit: 10 });

        const exactMatch = contractors.find(
          c => c.name.toLowerCase() === contractorName.toLowerCase()
        );

        if (!exactMatch) {
          const t = getContractorTranslations(locale);
          if (contractors.length > 0) {
            const suggestions = contractors.map(c => `- ${c.name}`).join('\n');
            return `${t.exactNotFound} "${contractorName}".\n\n${t.similarContractors}:\n${suggestions}\n\n${t.specifyNameUpdate}`;
          }
          return `${t.notFoundByName} "${contractorName}" в wFirma.`;
        }

        const address =
          street !== undefined || city !== undefined || zip !== undefined || country !== undefined
            ? { street, city, zip, country }
            : undefined;

        const updateData: Record<string, unknown> = {};
        if (newName !== undefined) updateData.name = newName;
        if (nip !== undefined) updateData.nip = nip;
        if (regon !== undefined) updateData.regon = regon;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
        if (notes !== undefined) updateData.notes = notes;

        if (Object.keys(updateData).length === 0) {
          return 'Не указаны поля для обновления. Укажите хотя бы одно поле для изменения.';
        }

        const contractor = await wfirmaService.updateContractor(exactMatch.id, updateData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'contractor');

        return formatContractorUpdated(contractor, locale);
      } catch (error) {
        logger.error('Failed to update contractor', { error, contractorName });
        const t = getContractorTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorUpdate} - ${error.message}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
    {
      name: 'update_contractor',
      description: 'Update an existing contractor/customer in wFirma by name. Searches for contractor by exact name match, then updates specified fields.',
      schema: z.object({
        contractorName: z.string().describe('Current name of contractor to update (exact match)'),
        newName: z.string().nullable().optional().describe('New company/contractor name'),
        nip: z.string().nullable().optional().describe('New NIP (Polish tax ID)'),
        regon: z.string().nullable().optional().describe('New REGON number'),
        email: z.string().nullable().optional().describe('New email address'),
        phone: z.string().nullable().optional().describe('New phone number'),
        street: z.string().nullable().optional().describe('New street address'),
        city: z.string().nullable().optional().describe('New city'),
        zip: z.string().nullable().optional().describe('New postal code'),
        country: z.string().nullable().optional().describe('New country code'),
        bankAccount: z.string().nullable().optional().describe('New bank account number'),
        notes: z.string().nullable().optional().describe('New notes'),
      }),
    }
  );
}

export function createDeleteContractorTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ name }: { name: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const contractors = await wfirmaService.getContractors({ search: name, limit: 10 });

        const exactMatch = contractors.find(
          c => c.name.toLowerCase() === name.toLowerCase()
        );

        if (!exactMatch) {
          const t = getContractorTranslations(locale);
          if (contractors.length > 0) {
            const suggestions = contractors.map(c => `- ${c.name}`).join('\n');
            return `${t.exactNotFound} "${name}".\n\n${t.similarContractors}:\n${suggestions}\n\n${t.specifyNameDelete}`;
          }
          return `${t.notFoundByName} "${name}".`;
        }

        await wfirmaService.deleteContractor(exactMatch.id);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'contractor');

        return formatContractorDeleted(exactMatch, locale);
      } catch (error) {
        logger.error('Failed to delete contractor', { error, contractorName: name });
        const t = getContractorTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorDelete} - ${error.message}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_contractor',
      description: 'Delete a contractor/customer from wFirma by name. Use when user wants to remove a contractor. Searches by exact name match. WARNING: This action cannot be undone.',
      schema: z.object({
        name: z.string().describe('Contractor name to delete (exact match required)'),
      }),
    }
  );
}
