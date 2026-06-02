/**
 * Declaration Tools
 * LangChain tools for JPK VAT and PIT declarations
 */

import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getDeclarationTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { fileStorageService } from '../../file-storage.instance';
import { formatDeclarationResult } from '../formatters';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';

/**
 * Tool: Get JPK VAT declaration
 * Retrieves JPK VAT declaration XML from wFirma and stores it for download
 */
export function createGetJpkVatTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_jpk_vat_declaration',
    description:
      'Get JPK VAT declaration in XML format for a specific year and month. Returns a downloadable XML file with tax declaration data. Use this when user asks for JPK VAT, VAT declaration, or tax declaration for a specific month.',
    schema: z.object({
      year: z
        .number()
        .int()
        .min(2020)
        .max(2030)
        .describe('Year for the declaration (e.g., 2024, 2025)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .describe(
          'Month number (1-12) for the declaration (e.g., 1 for January, 12 for December)'
        ),
    }),
    func: async ({ year, month }: { year: number; month: number }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        // Fetch declaration from wFirma
        const declaration = await wfirmaService.getJpkVat({ year, month });

        await incrementWFirmaUsage(subscriptionService, userId);

        // Store file temporarily
        const fileId = await fileStorageService.storeFile(
          declaration.filename,
          declaration.xml,
          userId,
          'application/xml'
        );

        logger.info('JPK VAT declaration stored for download', {
          fileId,
          filename: declaration.filename,
          userId,
        });

        // Return formatted markdown with download link
        return formatDeclarationResult(
          declaration,
          fileId,
          locale,
          'jpk_vat'
        );
      } catch (error) {
        logger.error('Failed to fetch JPK VAT declaration', {
          error,
          userId,
          year,
          month,
        });
        return `Error: ${getDeclarationTranslations(locale).errorFetchJpkVat}`;
      }
    },
  });

}

/**
 * Tool: Get PIT declaration
 * Retrieves PIT declaration XML from wFirma and stores it for download
 */
export function createGetPitTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return new DynamicStructuredTool({
    name: 'get_pit_declaration',
    description:
      'Get PIT declaration in XML format for a specific year and type (pit36, pit36l, or pit28). Returns a downloadable XML file with income tax declaration. Use this when user asks for PIT, PIT-36, PIT-36L, or PIT-28 declaration.',
    schema: z.object({
      year: z
        .number()
        .int()
        .min(2020)
        .max(2030)
        .describe('Year for the declaration (e.g., 2024, 2025)'),
      type: z
        .enum(['pit36', 'pit36l', 'pit28'])
        .describe(
          'PIT declaration type: pit36 for standard personal income tax, pit36l for simplified form, pit28 for flat tax'
        ),
    }),
    func: async ({
      year,
      type,
    }: {
      year: number;
      type: 'pit36' | 'pit36l' | 'pit28';
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        // Fetch declaration from wFirma
        const declaration = await wfirmaService.getPit({ year, type });

        await incrementWFirmaUsage(subscriptionService, userId);

        // Store file temporarily
        const fileId = await fileStorageService.storeFile(
          declaration.filename,
          declaration.xml,
          userId,
          'application/xml'
        );

        logger.info('PIT declaration stored for download', {
          fileId,
          filename: declaration.filename,
          userId,
          type,
        });

        // Return formatted markdown with download link
        return formatDeclarationResult(declaration, fileId, locale, 'pit');
      } catch (error) {
        logger.error('Failed to fetch PIT declaration', {
          error,
          userId,
          year,
          type,
        });
        const t = getDeclarationTranslations(locale);
        return `Error: ${t.errorFetchPit}`;
      }
    },
  });

}
