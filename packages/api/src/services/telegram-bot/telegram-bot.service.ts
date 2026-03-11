/**
 * Telegram Chatbot Service
 *
 * A conversational Telegram bot that lets linked users interact with the
 * AI accounting agent directly from Telegram.
 *
 * NOTE: This is separate from telegram.service.ts which handles admin
 * notifications to a hardcoded chat.
 */

import { Telegraf, Context } from 'telegraf';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { AIChatService } from '../ai-chat/ai-chat.service';
import { convertToTelegramMarkdown, splitMessage } from './markdown-converter';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 10;
const LINK_CODE_TTL_SECONDS = 300; // 5 minutes

export class TelegramBotService {
  private bot: Telegraf | null = null;
  private aiChatService: AIChatService;
  private initialized = false;

  constructor(aiChatService: AIChatService) {
    this.aiChatService = aiChatService;

    const token = process.env.TELEGRAM_CHATBOT_TOKEN;
    if (!token) {
      logger.warn('[TelegramBot] TELEGRAM_CHATBOT_TOKEN not configured, bot disabled');
      return;
    }

    this.bot = new Telegraf(token);
    this.setupCommands();
    this.setupMessageHandler();
    this.initialized = true;

    logger.info('[TelegramBot] Bot service initialized');
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  private setupCommands(): void {
    if (!this.bot) return;

    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('link', (ctx) => this.handleLink(ctx));
    this.bot.command('unlink', (ctx) => this.handleUnlink(ctx));
    this.bot.command('new', (ctx) => this.handleNew(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));
  }

  private async handleStart(ctx: Context): Promise<void> {
    try {
      await ctx.reply(
        'Welcome to eKsiegowyAI! \n\n' +
          'To start chatting, link your account:\n' +
          '1. Use /link to get a 6-digit code\n' +
          '2. Enter the code in the web app under Settings > Telegram\n\n' +
          'Use /help to see all available commands.'
      );
    } catch (error) {
      logger.error('[TelegramBot] Error in /start', { error: (error as Error).message });
    }
  }

  private async handleLink(ctx: Context): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);
      if (!telegramUserId || telegramUserId === 'undefined') {
        await ctx.reply('Could not identify your Telegram account.');
        return;
      }

      // Check if already linked
      const existing = await prisma.telegramLink.findUnique({
        where: { telegramUserId },
      });
      if (existing) {
        await ctx.reply('Your Telegram account is already linked. Use /unlink first to relink.');
        return;
      }

      // Generate 6-digit code
      const code = String(crypto.randomInt(100000, 999999));

      const linkData = JSON.stringify({
        telegramUserId,
        telegramUsername: ctx.from?.username || null,
        telegramFirstName: ctx.from?.first_name || null,
      });

      await redis.setEx(`telegram:link:${code}`, LINK_CODE_TTL_SECONDS, linkData);

      await ctx.reply(
        `Your linking code: *${code}*\n\n` +
          'Enter this code in the web app under Settings > Telegram.\n' +
          'The code expires in 5 minutes.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('[TelegramBot] Error in /link', { error: (error as Error).message });
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleUnlink(ctx: Context): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);

      const deleted = await prisma.telegramLink.deleteMany({
        where: { telegramUserId },
      });

      if (deleted.count > 0) {
        await ctx.reply('Your account has been unlinked. Use /link to link again.');
      } else {
        await ctx.reply('Your Telegram account is not linked to any account.');
      }
    } catch (error) {
      logger.error('[TelegramBot] Error in /unlink', { error: (error as Error).message });
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleNew(ctx: Context): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);

      const link = await prisma.telegramLink.findUnique({
        where: { telegramUserId },
      });

      if (!link) {
        await ctx.reply('Please link your account first with /link');
        return;
      }

      const conversation = await this.aiChatService.createConversation(link.userId);

      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { activeConversationId: conversation.id },
      });

      await ctx.reply('New conversation started. You can send your message now.');
    } catch (error) {
      logger.error('[TelegramBot] Error in /new', { error: (error as Error).message });
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleHelp(ctx: Context): Promise<void> {
    try {
      await ctx.reply(
        'Available commands:\n\n' +
          '/start - Welcome message\n' +
          '/link - Get a code to link your account\n' +
          '/unlink - Unlink your Telegram account\n' +
          '/new - Start a new conversation\n' +
          '/help - Show this help message\n\n' +
          'Just send any text message to chat with the AI accountant.'
      );
    } catch (error) {
      logger.error('[TelegramBot] Error in /help', { error: (error as Error).message });
    }
  }

  // ---------------------------------------------------------------------------
  // Message handler
  // ---------------------------------------------------------------------------

  private setupMessageHandler(): void {
    if (!this.bot) return;

    this.bot.on('text', async (ctx) => {
      // Skip commands (already handled above)
      if (ctx.message.text.startsWith('/')) return;

      try {
        await this.handleMessage(ctx);
      } catch (error) {
        logger.error('[TelegramBot] Unhandled error in message handler', {
          error: (error as Error).message,
        });
        await ctx.reply('An error occurred while processing your message. Please try again.');
      }
    });
  }

  private async handleMessage(ctx: Context & { message: { text: string } }): Promise<void> {
    const telegramUserId = String(ctx.from?.id);
    const messageText = ctx.message.text;

    // Rate limiting
    const rateLimitKey = `telegram:rate:${telegramUserId}`;
    const currentCount = await redis.incr(rateLimitKey);

    // Set expiry on first increment (currentCount === 1)
    if (currentCount === 1) {
      await redis.setEx(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS, String(currentCount));
    }

    if (currentCount > RATE_LIMIT_MAX_MESSAGES) {
      await ctx.reply('You are sending messages too fast. Please wait a moment and try again.');
      return;
    }

    // Look up linked account
    const link = await prisma.telegramLink.findUnique({
      where: { telegramUserId },
    });

    if (!link) {
      await ctx.reply('Please link your account first with /link');
      return;
    }

    // Create a conversation if none is active
    let conversationId = link.activeConversationId;
    if (!conversationId) {
      const conversation = await this.aiChatService.createConversation(link.userId);
      conversationId = conversation.id;

      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { activeConversationId: conversationId },
      });
    }

    // Show typing indicator
    await ctx.sendChatAction('typing');

    // Send message to AI
    const result = await this.aiChatService.sendMessage(
      conversationId,
      link.userId,
      messageText
    );

    // Convert markdown to Telegram format and split if needed
    const responseText = typeof result.assistantMessage.content === 'string'
      ? result.assistantMessage.content
      : '';
    const telegramText = convertToTelegramMarkdown(responseText);
    const chunks = splitMessage(telegramText);

    for (const chunk of chunks) {
      try {
        await ctx.reply(chunk, { parse_mode: 'MarkdownV2' });
      } catch (parseError) {
        // Fallback: send without formatting if MarkdownV2 parsing fails
        logger.warn('[TelegramBot] MarkdownV2 parse failed, sending as plain text', {
          error: (parseError as Error).message,
        });
        // Strip escape characters for plain text fallback
        // eslint-disable-next-line no-useless-escape
        const plainText = chunk.replace(/\\([_*\[\]()~`>#\+\-=|{}.!\\])/g, '$1');
        await ctx.reply(plainText);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start polling for updates (development mode).
   */
  async startPolling(): Promise<void> {
    if (!this.bot || !this.initialized) {
      logger.warn('[TelegramBot] Cannot start polling: bot not initialized');
      return;
    }

    try {
      await this.bot.launch();
      logger.info('[TelegramBot] Bot started in polling mode');
    } catch (error) {
      logger.error('[TelegramBot] Failed to start polling', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Set up a webhook for production.
   */
  async setupWebhook(url: string, secret: string): Promise<void> {
    if (!this.bot || !this.initialized) {
      logger.warn('[TelegramBot] Cannot setup webhook: bot not initialized');
      return;
    }

    try {
      await this.bot.telegram.setWebhook(url, { secret_token: secret });
      logger.info('[TelegramBot] Webhook set', { url });
    } catch (error) {
      logger.error('[TelegramBot] Failed to set webhook', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get the webhook callback handler for Express.
   */
  getWebhookCallback(secret: string) {
    if (!this.bot) return null;
    return this.bot.webhookCallback(`/api/telegram/webhook`, { secretToken: secret });
  }

  /**
   * Gracefully stop the bot.
   */
  stop(): void {
    if (!this.bot || !this.initialized) return;

    try {
      this.bot.stop('SIGTERM');
      logger.info('[TelegramBot] Bot stopped');
    } catch (error) {
      logger.error('[TelegramBot] Error stopping bot', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Whether the bot was successfully initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
