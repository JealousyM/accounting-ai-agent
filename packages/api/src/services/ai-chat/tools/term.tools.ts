/**
 * Term Tools
 * LangChain tools for term and term group CRUD operations
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getTermTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import {
  formatTermsList,
  formatTermDetails,
  formatTermCreated,
  formatTermUpdated,
  formatTermDeleted,
  formatTermGroupsList,
  formatTermGroupDetails,
  formatTermGroupCreated,
  formatTermGroupUpdated,
  formatTermGroupDeleted,
} from '../formatters';

// ============================================
// TERM TOOLS
// ============================================

/**
 * Tool to get list of terms from wFirma
 */
export function createGetTermsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      dateFrom,
      dateTo,
      type,
      groupId,
      search,
      limit,
    }: {
      dateFrom?: string;
      dateTo?: string;
      type?: string;
      groupId?: string;
      search?: string;
      limit?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const terms = await wfirmaService.findTerms({
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          type: type as any,
          groupId,
          search,
          limit: limit || 100,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched terms for AI tool', { count: terms.length });
        return formatTermsList(terms, locale);
      } catch (error) {
        logger.error('Failed to get terms', { error });
        const t = getTermTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_terms',
      description:
        'Get list of user-created terms (appointments/deadlines/reminders) from wFirma. These are custom entries the user added manually. Can filter by date range, type (normal/cycle_day_of_week/cycle_day_of_month), group ID, or search by description. NOTE: When user asks about "сроки" or "deadlines" in general, also call get_tax_deadlines to include statutory tax payment deadlines (VAT, CIT, ZUS, PIT).',
      schema: z.object({
        dateFrom: z.string().nullable().optional().describe('Start date for filtering (YYYY-MM-DD)'),
        dateTo: z.string().nullable().optional().describe('End date for filtering (YYYY-MM-DD)'),
        type: z
          .enum(['normal', 'cycle_day_of_week', 'cycle_day_of_month'])
          .nullable().optional()
          .describe('Filter by term type'),
        groupId: z.string().nullable().optional().describe('Filter by term group ID'),
        search: z.string().nullable().optional().describe('Search by description'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
      }),
    }
  );
}

/**
 * Tool to get term details by ID
 */
export function createGetTermDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ termId }: { termId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termId) {
          return t.notFoundById;
        }

        const term = await wfirmaService.getTerm(termId);

        if (!term) {
          return t.notFoundById;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatTermDetails(term, locale);
      } catch (error) {
        logger.error('Failed to get term details', { error });
        const t = getTermTranslations(locale);
        return `Error: ${t.errorFetchDetails}`;
      }
    },
    {
      name: 'get_term_details',
      description:
        'Get detailed information about a specific term (appointment/deadline) by ID.',
      schema: z.object({
        termId: z.string().describe('Term ID from wFirma'),
      }),
    }
  );
}

/**
 * Tool to create a new term in wFirma
 */
export function createAddTermTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      date,
      hour,
      description,
      termGroupId,
      type,
      contractorId,
      contactId,
    }: {
      date: string;
      hour?: string;
      description?: string;
      termGroupId?: string;
      type?: string;
      contractorId?: string;
      contactId?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const termData = {
          date: new Date(date),
          hour,
          description,
          termGroupId,
          type: (type || 'normal') as any,
          contractorId,
          contactId,
        };

        const term = await wfirmaService.createTerm(termData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term');

        return formatTermCreated(term, locale);
      } catch (error) {
        logger.error('Failed to create term', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- date (Term date in YYYY-MM-DD format)

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'add_term',
      description:
        'Create a new term (appointment/deadline) in wFirma. Required: date. Optional: hour, description, termGroupId, type, contractorId, contactId.',
      schema: z.object({
        date: z.string().describe('Term date in YYYY-MM-DD format (required)'),
        hour: z.string().nullable().optional().describe('Term hour in HH:MM:SS format'),
        description: z.string().nullable().optional().describe('Term description/note'),
        termGroupId: z.string().nullable().optional().describe('Term group ID'),
        type: z
          .enum(['normal', 'cycle_day_of_week', 'cycle_day_of_month'])
          .nullable().optional()
          .describe('Term type (default: normal)'),
        contractorId: z.string().nullable().optional().describe('Associated contractor ID'),
        contactId: z.string().nullable().optional().describe('Associated contact ID'),
      }),
    }
  );
}

/**
 * Tool to update an existing term in wFirma
 */
export function createUpdateTermTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      termId,
      date,
      hour,
      description,
      termGroupId,
      type,
      contractorId,
      contactId,
    }: {
      termId: string;
      date?: string;
      hour?: string;
      description?: string;
      termGroupId?: string;
      type?: string;
      contractorId?: string;
      contactId?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termId) {
          return t.notFoundById;
        }

        // Build update data
        const updateData: any = {};
        if (date !== undefined) updateData.date = new Date(date);
        if (hour !== undefined) updateData.hour = hour;
        if (description !== undefined) updateData.description = description;
        if (termGroupId !== undefined) updateData.termGroupId = termGroupId;
        if (type !== undefined) updateData.type = type;
        if (contractorId !== undefined) updateData.contractorId = contractorId;
        if (contactId !== undefined) updateData.contactId = contactId;

        const term = await wfirmaService.updateTerm(termId, updateData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term');

        return formatTermUpdated(term, locale);
      } catch (error) {
        logger.error('Failed to update term', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorUpdate}

**${t.errorReason}:** ${error.message}

${t.tryAgain}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
    {
      name: 'update_term',
      description:
        'Update an existing term (appointment/deadline) in wFirma. Required: termId. All other fields are optional - only provided fields will be updated.',
      schema: z.object({
        termId: z.string().describe('Term ID to update (required)'),
        date: z.string().nullable().optional().describe('New term date (YYYY-MM-DD)'),
        hour: z.string().nullable().optional().describe('New term hour (HH:MM:SS)'),
        description: z.string().nullable().optional().describe('New description'),
        termGroupId: z.string().nullable().optional().describe('New term group ID'),
        type: z
          .enum(['normal', 'cycle_day_of_week', 'cycle_day_of_month'])
          .nullable().optional()
          .describe('New term type'),
        contractorId: z.string().nullable().optional().describe('New contractor ID'),
        contactId: z.string().nullable().optional().describe('New contact ID'),
      }),
    }
  );
}

/**
 * Tool to delete a term from wFirma
 */
export function createDeleteTermTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ termId }: { termId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termId) {
          return t.notFoundById;
        }

        // Get term details before deletion for confirmation
        const term = await wfirmaService.getTerm(termId);

        if (!term) {
          return t.notFoundById;
        }

        await wfirmaService.deleteTerm(termId);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term');

        return formatTermDeleted(term, locale);
      } catch (error) {
        logger.error('Failed to delete term', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorDelete}

**${t.errorReason}:** ${error.message}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_term',
      description:
        'Delete a term (appointment/deadline) from wFirma. WARNING: This action cannot be undone.',
      schema: z.object({
        termId: z.string().describe('Term ID to delete'),
      }),
    }
  );
}

// ============================================
// TERM GROUP TOOLS
// ============================================

/**
 * Tool to get list of term groups from wFirma
 */
export function createGetTermGroupsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      search,
      limit,
    }: {
      search?: string;
      limit?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const termGroups = await wfirmaService.findTermGroups({
          search,
          limit: limit || 100,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched term groups for AI tool', { count: termGroups.length });
        return formatTermGroupsList(termGroups, locale);
      } catch (error) {
        logger.error('Failed to get term groups', { error });
        const t = getTermTranslations(locale);
        return `Error: ${t.errorFetchGroups}`;
      }
    },
    {
      name: 'get_term_groups',
      description:
        'Get list of term groups from wFirma. Can search by name.',
      schema: z.object({
        search: z.string().nullable().optional().describe('Search by group name'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
      }),
    }
  );
}

/**
 * Tool to get term group details by ID
 */
export function createGetTermGroupDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ termGroupId }: { termGroupId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termGroupId) {
          return t.groupNotFoundById;
        }

        const termGroup = await wfirmaService.getTermGroup(termGroupId);

        if (!termGroup) {
          return t.groupNotFoundById;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatTermGroupDetails(termGroup, locale);
      } catch (error) {
        logger.error('Failed to get term group details', { error });
        const t = getTermTranslations(locale);
        return `Error: ${t.errorFetchGroupDetails}`;
      }
    },
    {
      name: 'get_term_group_details',
      description:
        'Get detailed information about a specific term group by ID.',
      schema: z.object({
        termGroupId: z.string().describe('Term group ID from wFirma'),
      }),
    }
  );
}

/**
 * Tool to create a new term group in wFirma
 */
export function createAddTermGroupTool(
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
      isReadonly,
    }: {
      name: string;
      isReadonly?: boolean;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const termGroupData = {
          name,
          isReadonly: isReadonly || false,
        };

        const termGroup = await wfirmaService.createTermGroup(termGroupData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term_group');

        return formatTermGroupCreated(termGroup, locale);
      } catch (error) {
        logger.error('Failed to create term group', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- name (Group name)

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreateGroup}`;
      }
    },
    {
      name: 'add_term_group',
      description:
        'Create a new term group in wFirma. Required: name. Optional: isReadonly (determines if group and its terms can be modified via wFirma.pl website).',
      schema: z.object({
        name: z.string().describe('Group name (required)'),
        isReadonly: z
          .boolean()
          .nullable().optional()
          .describe('If true, group and its terms cannot be modified via wFirma.pl website'),
      }),
    }
  );
}

/**
 * Tool to update an existing term group in wFirma
 */
export function createUpdateTermGroupTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      termGroupId,
      name,
      isReadonly,
    }: {
      termGroupId: string;
      name?: string;
      isReadonly?: boolean;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termGroupId) {
          return t.groupNotFoundById;
        }

        // Build update data
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (isReadonly !== undefined) updateData.isReadonly = isReadonly;

        const termGroup = await wfirmaService.updateTermGroup(termGroupId, updateData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term_group');

        return formatTermGroupUpdated(termGroup, locale);
      } catch (error) {
        logger.error('Failed to update term group', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorUpdateGroup}

**${t.errorReason}:** ${error.message}

${t.tryAgain}`;
        }
        return `Error: ${t.errorUpdateGroup}`;
      }
    },
    {
      name: 'update_term_group',
      description:
        'Update an existing term group in wFirma. Required: termGroupId. Optional: name, isReadonly.',
      schema: z.object({
        termGroupId: z.string().describe('Term group ID to update (required)'),
        name: z.string().nullable().optional().describe('New group name'),
        isReadonly: z.boolean().nullable().optional().describe('New read-only setting'),
      }),
    }
  );
}

/**
 * Tool to delete a term group from wFirma
 */
export function createDeleteTermGroupTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ termGroupId }: { termGroupId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getTermTranslations(locale);

        if (!termGroupId) {
          return t.groupNotFoundById;
        }

        // Get term group details before deletion for confirmation
        const termGroup = await wfirmaService.getTermGroup(termGroupId);

        if (!termGroup) {
          return t.groupNotFoundById;
        }

        await wfirmaService.deleteTermGroup(termGroupId);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'term_group');

        return formatTermGroupDeleted(termGroup, locale);
      } catch (error) {
        logger.error('Failed to delete term group', { error });
        const t = getTermTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorDeleteGroup}

**${t.errorReason}:** ${error.message}`;
        }
        return `Error: ${t.errorDeleteGroup}`;
      }
    },
    {
      name: 'delete_term_group',
      description:
        'Delete a term group from wFirma. WARNING: This action cannot be undone. Make sure to reassign any terms in this group first.',
      schema: z.object({
        termGroupId: z.string().describe('Term group ID to delete'),
      }),
    }
  );
}
