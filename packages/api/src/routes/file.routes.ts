/**
 * File Download Routes
 * API endpoints for secure file downloads
 */

import { Router, Request, Response } from 'express';
import { fileStorageService } from '../services/file-storage.instance';
import { wfirmaIntegrationService } from '../services/wfirma-integration.instance';
import { authenticate } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/files/download/:fileId
 * Download a file by ID (public endpoint with secure file IDs)
 *
 * Security features:
 * - Random UUID file IDs (hard to guess)
 * - Automatic expiration (15 min TTL)
 * - One-time or limited access
 */
router.get(
  '/download/:fileId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        logger.warn('File download request without fileId');
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      // Retrieve file (no userId check - security is via random UUID + expiration)
      const file = await fileStorageService.getFile(fileId);

      if (!file) {
        logger.warn('File not found or expired', { fileId });
        res.status(404).json({ error: 'File not found or expired' });
        return;
      }

      // Decode base64 content if needed
      let fileContent: string | Buffer = file.content;
      if (file.isBase64) {
        fileContent = Buffer.from(file.content, 'base64');
      }

      // Set headers for download
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.filename}"`
      );
      res.setHeader(
        'Content-Length',
        Buffer.isBuffer(fileContent)
          ? fileContent.length
          : Buffer.byteLength(fileContent, 'utf-8')
      );
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      logger.info('File downloaded successfully', {
        fileId,
        filename: file.filename,
        size: Buffer.isBuffer(fileContent) ? fileContent.length : fileContent.length,
        isBase64: file.isBase64,
      });

      // Send file content
      res.send(fileContent);
    } catch (error) {
      logger.error('Failed to download file', {
        error,
        fileId: req.params.fileId,
      });
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

/**
 * GET /api/files/invoice/:invoiceId
 * Download an invoice PDF directly by its ID (requires authentication)
 *
 * Query parameters:
 * - page: 'all' | 'invoice' | 'invoicecopy' (default: 'invoice')
 * - address: boolean - include return address envelope
 * - leaflet: boolean - include leaflet
 * - duplicate: boolean - mark as duplicate
 */
router.get(
  '/invoice/:invoiceId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params;
      const { page, address, leaflet, duplicate } = req.query;

      if (!invoiceId) {
        logger.warn('Invoice download request without invoiceId');
        res.status(400).json({ error: 'Invoice ID is required' });
        return;
      }

      // Download invoice from wFirma
      const result = await wfirmaIntegrationService.downloadInvoice(invoiceId, {
        page: page as 'all' | 'invoice' | 'invoicecopy' | undefined,
        address: address === 'true',
        leaflet: leaflet === 'true',
        duplicate: duplicate === 'true',
      });

      // Set headers for download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.filename)}"`
      );
      res.setHeader('Content-Length', result.content.length);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      logger.info('Invoice PDF downloaded successfully from wFirma', {
        invoiceId,
        invoiceNumber: result.invoiceNumber,
        filename: result.filename,
        size: result.content.length,
      });

      // Send file content
      res.send(result.content);
    } catch (error) {
      logger.error('Failed to download invoice PDF from wFirma', {
        error,
        invoiceId: req.params.invoiceId,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to download invoice' });
    }
  }
);

/**
 * GET /api/files/document/:documentId
 * Download a wFirma document directly by its ID (requires authentication)
 *
 * This endpoint fetches the document from wFirma and streams it to the user.
 * Used for direct download links in the document list.
 */
router.get(
  '/document/:documentId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        logger.warn('Document download request without documentId');
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      // Download document from wFirma
      const { content, filename, mime } =
        await wfirmaIntegrationService.downloadDocument(documentId);

      // Set headers for download
      res.setHeader('Content-Type', mime);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      res.setHeader('Content-Length', content.length);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      logger.info('Document downloaded successfully from wFirma', {
        documentId,
        filename,
        size: content.length,
      });

      // Send file content
      res.send(content);
    } catch (error) {
      logger.error('Failed to download document from wFirma', {
        error,
        documentId: req.params.documentId,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);

export default router;
