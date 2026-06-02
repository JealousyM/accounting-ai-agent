/**
 * Document Tools
 * LangChain tools for document operations with file download support
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getDocumentTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { fileStorageService } from '../../file-storage.instance';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import { sanitizeForPrompt } from '../utils';
import {
  formatDocumentsList,
  formatDocumentDetails,
  formatDocumentWithDownload,
  formatDocumentDeleted,
} from '../formatters';

/**
 * Tool: Get list of documents from wFirma
 */
export function createGetDocumentsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({
      objectName,
      objectId,
      type,
      set,
      search,
      limit,
    }: {
      objectName?: string;
      objectId?: string;
      type?: string;
      set?: string;
      search?: string;
      limit?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const documents = await wfirmaService.findDocuments({
          objectName,
          objectId,
          type: type as any,
          set: set as any,
          search,
          limit: limit || 50,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched documents for AI tool', { count: documents.length });
        return formatDocumentsList(documents, locale);
      } catch (error) {
        logger.error('Failed to get documents', { error });
        const t = getDocumentTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_documents',
      description:
        'Get list of documents from wFirma. Can filter by type (file/document_template/url), set (book/crm/declaration/staff/warehouse), related object (objectName + objectId), or search by name. Returns a table with document names, types, and download icons for files.',
      schema: z.object({
        objectName: z
          .string()
          .nullable().optional()
          .describe(
            'Filter by related object type (e.g., invoice, expense, contractor)'
          ),
        objectId: z.string().nullable().optional().describe('Filter by related object ID'),
        type: z
          .enum(['file', 'document_template', 'url'])
          .nullable().optional()
          .describe('Filter by document type'),
        set: z
          .enum(['book', 'crm', 'declaration', 'staff', 'warehouse'])
          .nullable().optional()
          .describe('Filter by document set/category'),
        search: z.string().nullable().optional().describe('Search in document name'),
        limit: z
          .number()
          .nullable().optional()
          .describe('Maximum number of results (default 50)'),
      }),
    }
  );
}

/**
 * Tool: Get document details and optionally prepare for download
 */
export function createGetDocumentDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({
      documentId,
      prepareDownload,
    }: {
      documentId: string;
      prepareDownload?: boolean;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getDocumentTranslations(locale);

        const document = await wfirmaService.getDocument(documentId);

        await incrementWFirmaUsage(subscriptionService, userId);

        if (!document) {
          return t.notFoundById;
        }

        // If document is a file and user wants to download, prepare the file
        if (prepareDownload && document.type === 'file') {
          try {
            const { content, filename, mime } =
              await wfirmaService.downloadDocument(documentId);

            // Store file temporarily (as base64 for binary content)
            const fileId = await fileStorageService.storeFile(
              filename,
              content.toString('base64'),
              userId,
              mime
            );

            logger.info('Document file stored for download', {
              fileId,
              filename,
              documentId,
              userId,
            });

            return formatDocumentWithDownload(document, fileId, locale);
          } catch (downloadError) {
            logger.error('Failed to prepare document download', {
              error: downloadError,
              documentId,
            });
            // Return details without download link
            return (
              formatDocumentDetails(document, locale) +
              `\n\n> ${t.errorDownload}`
            );
          }
        }

        return formatDocumentDetails(document, locale);
      } catch (error) {
        logger.error('Failed to get document details', { error });
        const t = getDocumentTranslations(locale);
        return `Error: ${t.errorFetchDetails}`;
      }
    },
    {
      name: 'get_document_details',
      description:
        'Get detailed information about a specific document by ID. If prepareDownload is true and document is a file, returns a download link. Use this when user wants to see document details or download a specific document.',
      schema: z.object({
        documentId: z.string().describe('Document ID from wFirma'),
        prepareDownload: z
          .boolean()
          .nullable().optional()
          .describe(
            'Set to true to prepare file for download (only works for type=file)'
          ),
      }),
    }
  );
}

/**
 * Tool: Download a document file
 */
export function createDownloadDocumentTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({ documentId }: { documentId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getDocumentTranslations(locale);

        // First get document info
        const document = await wfirmaService.getDocument(documentId);

        if (!document) {
          return t.notFoundById;
        }

        if (document.type !== 'file') {
          return t.notDownloadable;
        }

        // Download the file
        const { content, filename, mime } =
          await wfirmaService.downloadDocument(documentId);

        await incrementWFirmaUsage(subscriptionService, userId);

        // Store file temporarily (as base64 for binary content)
        const fileId = await fileStorageService.storeFile(
          filename,
          content.toString('base64'),
          userId,
          mime
        );

        logger.info('Document downloaded and stored', {
          fileId,
          filename,
          documentId,
          userId,
          size: content.length,
        });

        return formatDocumentWithDownload(document, fileId, locale);
      } catch (error) {
        logger.error('Failed to download document', { error });
        const t = getDocumentTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.errorDownload}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDownload}`;
      }
    },
    {
      name: 'download_document',
      description:
        'Download a document file from wFirma and get a temporary download link. Only works for documents with type=file. Use this when user wants to download a document file.',
      schema: z.object({
        documentId: z.string().describe('Document ID to download'),
      }),
    }
  );
}

/**
 * Tool: Delete a document from wFirma
 */
export function createDeleteDocumentTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  return (tool as any)(
    async ({ documentId }: { documentId: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getDocumentTranslations(locale);

        // Get document info first
        const document = await wfirmaService.getDocument(documentId);

        if (!document) {
          return t.notFoundById;
        }

        // Delete the document
        await wfirmaService.deleteDocument(documentId);

        await incrementWFirmaUsage(subscriptionService, userId);

        // Invalidate cache
        await cacheService.invalidateCache(userId, 'document');

        return formatDocumentDeleted(document, locale);
      } catch (error) {
        logger.error('Failed to delete document', { error });
        const t = getDocumentTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.errorDelete}\n\n**${t.errorReason}:** ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_document',
      description:
        'Delete a document from wFirma. WARNING: This action cannot be undone. Use this when user explicitly wants to delete a document.',
      schema: z.object({
        documentId: z.string().describe('Document ID to delete'),
      }),
    }
  );
}
