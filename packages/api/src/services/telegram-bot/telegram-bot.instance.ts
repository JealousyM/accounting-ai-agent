/**
 * Telegram Bot Service - Singleton Instance
 */

import { TelegramBotService } from './telegram-bot.service';
import { aiChatService } from '../ai-chat.instance';
import { wfirmaServiceFactory } from '../wfirma-integration-factory.instance';
import { companyEnrichmentService } from '../company-enrichment.instance';
import { wfirmaCacheService } from '../wfirma-cache.instance';

export const telegramBotService = new TelegramBotService(
  aiChatService,
  wfirmaServiceFactory,
  companyEnrichmentService,
  wfirmaCacheService,
);
