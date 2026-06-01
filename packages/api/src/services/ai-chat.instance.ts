/**
 * AI Chat Service Instance
 * Singleton instance of the AI Chat Service
 */

import { prisma } from '../lib/prisma';
import { wfirmaCacheService } from './wfirma-cache.instance';
import { fileStorageService } from './file-storage.instance';
import { wfirmaServiceFactory } from './wfirma-integration-factory.instance';
import { credentialsService } from './credentials.instance';
import { AIChatService } from './ai-chat';
import { ConversationRepository } from './ai-chat/conversation-repository';
import { LangGraphAgentRunner } from './ai-chat/langgraph-agent-runner';
import { TTSIntegration } from './ai-chat/tts-integration';
import { ttsService } from './tts.instance';
import { aiMemoryService } from './ai-memory/ai-memory.instance';
import { memoryExtractionService } from './ai-memory/memory-extraction.instance';

const conversationRepo = new ConversationRepository(prisma);

const agentRunner = new LangGraphAgentRunner(
  credentialsService,
  wfirmaServiceFactory,
  wfirmaCacheService,
  fileStorageService,
  aiMemoryService
);

const ttsIntegration = new TTSIntegration(ttsService, prisma);

export const aiChatService = new AIChatService(
  conversationRepo,
  agentRunner,
  ttsIntegration,
  memoryExtractionService
);
