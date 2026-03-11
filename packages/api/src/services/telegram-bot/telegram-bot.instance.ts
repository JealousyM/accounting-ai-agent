/**
 * Telegram Bot Service - Singleton Instance
 */

import { TelegramBotService } from './telegram-bot.service';
import { aiChatService } from '../ai-chat.instance';

export const telegramBotService = new TelegramBotService(aiChatService);
