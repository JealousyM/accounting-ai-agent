/**
 * AI Chat Service Instance
 * Singleton instance of the AI Chat Service
 */

import { prisma } from '../lib/prisma';
import { wfirmaIntegrationService } from './wfirma-integration.instance';
import { wfirmaCacheService } from './wfirma-cache.instance';
import { fileStorageService } from './file-storage.instance';
import { wfirmaServiceFactory } from './wfirma-integration-factory.instance';
import { credentialsService } from './credentials.instance';
import { AIChatService } from './ai-chat';
import { aiMemoryService } from './ai-memory/ai-memory.instance';
import { memoryExtractionService } from './ai-memory/memory-extraction.instance';

/**
 * Singleton instance of the AI Chat Service
 * Uses the shared prisma client, wFirma integration, cache, and file storage services
 * Now also supports user-specific wFirma and LLM credentials via factory and credentials service
 * AI Context Memory: injects user preferences/patterns into system prompt, extracts memories from conversations
 */
export const aiChatService = new AIChatService(
  prisma,
  wfirmaIntegrationService,
  wfirmaCacheService,
  fileStorageService,
  wfirmaServiceFactory,
  credentialsService,
  aiMemoryService,
  memoryExtractionService
);
