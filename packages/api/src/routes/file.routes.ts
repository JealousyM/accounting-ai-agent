/**
 * File Download Routes
 * API endpoints for secure file downloads
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { fileStorageService } from '../services/file-storage.instance';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/files/download/:fileId
 * Download a file by ID (requires authentication)
 *
 * Security features:
 * - JWT authentication required
 * - Owner-only access (userId check)
 * - Automatic expiration (15 min TTL)
 */
router.get(
  '/download/:fileId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = (req as any).userId; // Set by authenticate middleware

      if (!fileId) {
        logger.warn('File download request without fileId');
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      // Retrieve file with security check
      const file = await fileStorageService.getFile(fileId, userId);

      if (!file) {
        logger.warn('File not found or unauthorized', { fileId, userId });
        res.status(404).json({ error: 'File not found or expired' });
        return;
      }

      // Set headers for download
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.filename}"`
      );
      res.setHeader('Content-Length', Buffer.byteLength(file.content, 'utf-8'));
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      logger.info('File downloaded successfully', {
        fileId,
        userId,
        filename: file.filename,
        size: file.content.length,
      });

      // Send file content
      res.send(file.content);
    } catch (error) {
      logger.error('Failed to download file', {
        error,
        fileId: req.params.fileId,
        userId: (req as any).userId,
      });
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

export default router;
