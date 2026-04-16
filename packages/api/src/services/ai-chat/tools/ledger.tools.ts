/**
 * Ledger Tools
 * LangChain tools for fiscal years and accounting schemas (read-only)
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getLedgerTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService, WFirmaError } from '../../wfirma';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import {
  formatFiscalYearsList,
  formatFiscalYearDetails,
  formatOperationSchemasList,
  formatOperationSchemaDetails,
} from '../formatters';
import { sanitizeForPrompt } from '../utils';

// ============================================
// FISCAL YEAR TOOLS
// ============================================

/**
 * Tool to get list of fiscal years from wFirma
 */
export function createGetFiscalYearsTool(
  wfirmaService: WFirmaIntegrationService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      limit,
      page,
    }: {
      limit?: number;
      page?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const years = await wfirmaService.findLedgerAccountantYears({
          limit: limit || 100,
          page: page || 1,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched fiscal years for AI tool', { count: years.length });
        return formatFiscalYearsList(years, locale);
      } catch (error) {
        logger.error('Failed to get fiscal years', { error });
        const t = getLedgerTranslations(locale);
        const wfirmaMessage = error instanceof WFirmaError ? (error.details?.message || error.message) : '';
        return `Error: ${t.errorFetchFiscalYears}${wfirmaMessage ? ` - ${sanitizeForPrompt(wfirmaMessage)}` : ''}`;
      }
    },
    {
      name: 'get_fiscal_years',
      description:
        'Get list of fiscal years (accounting periods) from wFirma. Fiscal years define the accounting periods for the company.',
      schema: z.object({
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
        page: z.number().nullable().optional().describe('Page number for pagination (default 1)'),
      }),
    }
  );
}

/**
 * Tool to get fiscal year details by ID
 */
export function createGetFiscalYearDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ fiscalYearId }: { fiscalYearId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getLedgerTranslations(locale);

        if (!fiscalYearId) {
          return t.fiscalYearNotFoundById;
        }

        const year = await wfirmaService.getLedgerAccountantYear(fiscalYearId);

        if (!year) {
          return t.fiscalYearNotFoundById;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched fiscal year details for AI tool', { yearId: fiscalYearId });
        return formatFiscalYearDetails(year, locale);
      } catch (error) {
        logger.error('Failed to get fiscal year details', { error });
        const t = getLedgerTranslations(locale);
        const wfirmaMessage = error instanceof WFirmaError ? (error.details?.message || error.message) : '';
        return `Error: ${t.errorFetchFiscalYearDetails}${wfirmaMessage ? ` - ${sanitizeForPrompt(wfirmaMessage)}` : ''}`;
      }
    },
    {
      name: 'get_fiscal_year_details',
      description:
        'Get detailed information about a specific fiscal year by ID or symbol (e.g. "2025"). Shows symbol, start date, and end date.',
      schema: z.object({
        fiscalYearId: z.string().describe('Fiscal year ID or symbol (e.g. "2025") from wFirma'),
      }),
    }
  );
}

// ============================================
// ACCOUNTING SCHEMA TOOLS
// ============================================

/**
 * Tool to get list of accounting schemas from wFirma
 */
export function createGetAccountingSchemasTool(
  wfirmaService: WFirmaIntegrationService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      fiscalYearId,
      category,
      limit,
      page,
    }: {
      fiscalYearId?: string;
      category?: string;
      limit?: number;
      page?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const schemas = await wfirmaService.findLedgerOperationSchemas({
          ledgerAccountantYearId: fiscalYearId,
          category,
          limit: limit || 100,
          page: page || 1,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched accounting schemas for AI tool', { count: schemas.length });
        return formatOperationSchemasList(schemas, locale);
      } catch (error) {
        logger.error('Failed to get accounting schemas', { error });
        const t = getLedgerTranslations(locale);
        const wfirmaMessage = error instanceof WFirmaError ? (error.details?.message || error.message) : '';
        return `Error: ${t.errorFetchSchemas}${wfirmaMessage ? ` - ${sanitizeForPrompt(wfirmaMessage)}` : ''}`;
      }
    },
    {
      name: 'get_accounting_schemas',
      description:
        'Get list of accounting schemas (operation schemas) from wFirma. Can filter by fiscal year or category. Schemas define how transactions are recorded in the accounting system.',
      schema: z.object({
        fiscalYearId: z.string().nullable().optional().describe('Filter by fiscal year ID'),
        category: z.string().nullable().optional().describe('Filter by schema category'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
        page: z.number().nullable().optional().describe('Page number for pagination (default 1)'),
      }),
    }
  );
}

/**
 * Tool to get accounting schema details by ID
 */
export function createGetAccountingSchemaDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  locale: Locale,
  userId: string,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ schemaId }: { schemaId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getLedgerTranslations(locale);

        if (!schemaId) {
          return t.operationSchemaNotFoundById;
        }

        const schema = await wfirmaService.getLedgerOperationSchema(schemaId);

        if (!schema) {
          return t.operationSchemaNotFoundById;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched accounting schema details for AI tool', { schemaId });
        return formatOperationSchemaDetails(schema, locale);
      } catch (error) {
        logger.error('Failed to get accounting schema details', { error });
        const t = getLedgerTranslations(locale);
        const wfirmaMessage = error instanceof WFirmaError ? (error.details?.message || error.message) : '';
        return `Error: ${t.errorFetchSchemaDetails}${wfirmaMessage ? ` - ${sanitizeForPrompt(wfirmaMessage)}` : ''}`;
      }
    },
    {
      name: 'get_accounting_schema_details',
      description:
        'Get detailed information about a specific accounting schema by ID. Shows name, category, visibility, and related fiscal year.',
      schema: z.object({
        schemaId: z.string().describe('Accounting schema ID from wFirma'),
      }),
    }
  );
}
