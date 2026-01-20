/**
 * File Storage Service
 * Manages temporary file storage with TTL and security
 *
 * Features:
 * - In-memory storage with Map
 * - Disk backup to .tmp-files directory
 * - 15-minute TTL for auto-expiration
 * - Owner-only access (userId security check)
 * - Auto-cleanup every 5 minutes
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface StoredFile {
  id: string;
  filename: string;
  content: string;
  userId: string;
  mimeType: string;
  createdAt: Date;
  expiresAt: Date;
}

export class FileStorageService {
  private readonly storageDir: string;
  private readonly ttlMs: number = 15 * 60 * 1000; // 15 minutes
  private readonly fileStore = new Map<string, StoredFile>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(storageDir?: string) {
    this.storageDir = storageDir || path.join(process.cwd(), '.tmp-files');
    this.initializeStorage();
    this.startCleanupTask();
  }

  /**
   * Initialize storage directory
   */
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger.info('File storage initialized', { storageDir: this.storageDir });
    } catch (error) {
      logger.error('Failed to initialize file storage', { error });
      throw error;
    }
  }

  /**
   * Store a file temporarily
   * @param filename - Original filename
   * @param content - File content (string)
   * @param userId - Owner user ID
   * @param mimeType - MIME type (default: application/xml)
   * @returns File ID (UUID)
   */
  async storeFile(
    filename: string,
    content: string,
    userId: string,
    mimeType: string = 'application/xml'
  ): Promise<string> {
    const fileId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    const storedFile: StoredFile = {
      id: fileId,
      filename,
      content,
      userId,
      mimeType,
      createdAt: new Date(),
      expiresAt,
    };

    // Store in memory map
    this.fileStore.set(fileId, storedFile);

    // Write to disk as backup
    try {
      const filePath = path.join(this.storageDir, `${fileId}.xml`);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      logger.error('Failed to write file to disk', { fileId, error });
      // Continue anyway - in-memory storage is primary
    }

    logger.info('File stored', {
      fileId,
      filename,
      userId,
      size: content.length,
      expiresAt,
    });

    return fileId;
  }

  /**
   * Retrieve a file by ID (with security check)
   * @param fileId - File UUID
   * @param userId - Requesting user ID
   * @returns Stored file or null if not found/expired/unauthorized
   */
  async getFile(fileId: string, userId: string): Promise<StoredFile | null> {
    const file = this.fileStore.get(fileId);

    if (!file) {
      logger.warn('File not found', { fileId, userId });
      return null;
    }

    // Security check: only the owner can access
    if (file.userId !== userId) {
      logger.warn('Unauthorized file access attempt', {
        fileId,
        requestedBy: userId,
        owner: file.userId,
      });
      return null;
    }

    // Check expiration
    if (file.expiresAt < new Date()) {
      logger.info('File expired', { fileId });
      await this.deleteFile(fileId);
      return null;
    }

    return file;
  }

  /**
   * Delete a file
   * @param fileId - File UUID
   */
  async deleteFile(fileId: string): Promise<void> {
    this.fileStore.delete(fileId);

    try {
      const filePath = path.join(this.storageDir, `${fileId}.xml`);
      await fs.unlink(filePath);
      logger.debug('File deleted from disk', { fileId });
    } catch (error) {
      // File may not exist on disk - that's OK
      logger.debug('File not found on disk (already deleted)', { fileId });
    }
  }

  /**
   * Cleanup expired files (runs every 5 minutes)
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const expiredFiles: string[] = [];

      for (const [fileId, file] of this.fileStore.entries()) {
        if (file.expiresAt < now) {
          expiredFiles.push(fileId);
        }
      }

      for (const fileId of expiredFiles) {
        this.deleteFile(fileId);
      }

      if (expiredFiles.length > 0) {
        logger.info('Cleaned up expired files', { count: expiredFiles.length });
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('File cleanup task started (runs every 5 minutes)');
  }

  /**
   * Stop the cleanup task (for graceful shutdown)
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('File cleanup task stopped');
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): { totalFiles: number; totalSize: number } {
    let totalSize = 0;
    for (const file of this.fileStore.values()) {
      totalSize += file.content.length;
    }

    return {
      totalFiles: this.fileStore.size,
      totalSize,
    };
  }
}
