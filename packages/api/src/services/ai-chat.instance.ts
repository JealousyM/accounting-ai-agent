/**
 * AI Chat Service Instance
 * Singleton instance of the AI Chat Service
 */

import { prisma } from '../lib/prisma';
import { wfirmaIntegrationService } from './wfirma-integration.instance';
import { wfirmaCacheService } from './wfirma-cache.instance';
import { fileStorageService } from './file-storage.instance';
import { AIChatService } from './ai-chat';

/**
 * Singleton instance of the AI Chat Service
 * Uses the shared prisma client, wFirma integration, cache, and file storage services
 */
export const aiChatService = new AIChatService(
  prisma,
  wfirmaIntegrationService,
  wfirmaCacheService,
  fileStorageService
);
