/**
 * Telegram Chatbot Service
 *
 * A conversational Telegram bot that lets linked users interact with the
 * AI accounting agent directly from Telegram.
 *
 * NOTE: This is separate from telegram.service.ts which handles admin
 * notifications to a hardcoded chat.
 */

import { Telegraf, Context, Markup } from 'telegraf';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { AIChatService } from '../ai-chat/ai-chat.service';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { CompanyEnrichmentService } from '../company-enrichment.service';
import { WFirmaCacheService } from '../wfirma-cache.service';
import { TelegramRateLimiter } from './rate-limiter';
import { OcrFlowHandler } from './ocr-flow-handler';
import { AIChatRouter } from './ai-chat-router';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 10;
const LINK_CODE_TTL_SECONDS = 300; // 5 minutes

export class TelegramBotService {
  private bot: Telegraf | null = null;
  private readonly rateLimiter: TelegramRateLimiter;
  private readonly ocrFlowHandler: OcrFlowHandler;
  private readonly aiChatRouter: AIChatRouter;
  private initialized = false;

  constructor(
    aiChatService: AIChatService,
    wfirmaFactory?: WFirmaServiceFactory,
    enrichmentService?: CompanyEnrichmentService,
    cacheService?: WFirmaCacheService,
  ) {
    this.rateLimiter = new TelegramRateLimiter(redis, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_MESSAGES);
    this.ocrFlowHandler = new OcrFlowHandler({ wfirmaFactory, enrichmentService, cacheService });
    this.aiChatRouter = new AIChatRouter(aiChatService);

    const token = process.env.TELEGRAM_CHATBOT_TOKEN;
    if (!token) {
      logger.warn('[TelegramBot] TELEGRAM_CHATBOT_TOKEN not configured, bot disabled');
      return;
    }

    this.bot = new Telegraf(token);
    this.setupCommands(aiChatService);
    this.setupMessageHandler();
    this.initialized = true;

    logger.info('[TelegramBot] Bot service initialized');
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  private setupCommands(aiChatService: AIChatService): void {
    if (!this.bot) return;

    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('link', (ctx) => this.handleLink(ctx));
    this.bot.command('unlink', (ctx) => this.handleUnlink(ctx));
    this.bot.command('new', (ctx) => this.handleNew(ctx, aiChatService));
    this.bot.command('chats', (ctx) => this.handleChats(ctx, aiChatService));
    this.bot.command('reminders', (ctx) => this.handleReminders(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));

    this.bot.on('callback_query', (ctx) => this.handleCallbackQuery(ctx, aiChatService));
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

      const existing = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
      if (existing) {
        await ctx.reply('Your Telegram account is already linked. Use /unlink first to relink.');
        return;
      }

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
      const deleted = await prisma.telegramLink.deleteMany({ where: { telegramUserId } });

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

  private async handleNew(ctx: Context, aiChatService: AIChatService): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);
      const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });

      if (!link) {
        await ctx.reply('Please link your account first with /link');
        return;
      }

      const conversation = await aiChatService.createConversation(link.userId);
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

  private async handleChats(ctx: Context, aiChatService: AIChatService): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);
      const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });

      if (!link) {
        await ctx.reply('Please link your account first with /link');
        return;
      }

      const conversations = await aiChatService.getConversations(link.userId, 10);

      if (conversations.length === 0) {
        await ctx.reply('No conversations yet. Send a message to start one.');
        return;
      }

      const buttons = conversations.map((conv) => {
        const isActive = conv.id === link.activeConversationId;
        const title = conv.title || 'Untitled';
        const label = isActive ? `✓ ${title.substring(0, 38)}` : title.substring(0, 40);
        return [Markup.button.callback(label, `chat:${conv.id}`)];
      });

      await ctx.reply('Your recent conversations:', Markup.inlineKeyboard(buttons));
    } catch (error) {
      logger.error('[TelegramBot] Error in /chats', { error: (error as Error).message });
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
          '/chats - Switch between conversations\n' +
          '/reminders - Manage tax deadline reminders\n' +
          '/help - Show this help message\n\n' +
          'Just send any text message to chat with the AI accountant.'
      );
    } catch (error) {
      logger.error('[TelegramBot] Error in /help', { error: (error as Error).message });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleReminders(ctx: Context): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);
      const text = (ctx.message as { text?: string })?.text ?? '';
      const arg = text.trim().split(/\s+/)[1]?.toLowerCase();

      // Cast to `any` until `prisma generate` is run after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const link = (await prisma.telegramLink.findUnique({ where: { telegramUserId } })) as any;
      if (!link) {
        await ctx.reply('Please link your account first with /link');
        return;
      }

      if (!arg) {
        const status = link.reminderEnabled ? 'on ✅' : 'off ❌';
        await ctx.reply(
          `Tax deadline reminders: ${status}\n` +
            `Lead time: ${link.reminderLeadDays} day(s) before deadline\n\n` +
            'Commands:\n' +
            '/reminders on — enable reminders\n' +
            '/reminders off — disable reminders\n' +
            '/reminders 1 — remind 1 day before\n' +
            '/reminders 3 — remind 3 days before\n' +
            '/reminders 7 — remind 7 days before'
        );
        return;
      }

      if (arg === 'off') {
        await (prisma.telegramLink.update as any)({
          where: { id: link.id },
          data: { reminderEnabled: false },
        });
        await ctx.reply('Tax deadline reminders disabled. Use /reminders on to re-enable.');
        return;
      }

      if (arg === 'on') {
        await (prisma.telegramLink.update as any)({
          where: { id: link.id },
          data: { reminderEnabled: true },
        });
        await ctx.reply('Tax deadline reminders enabled.');
        return;
      }

      const days = parseInt(arg, 10);
      if ([1, 3, 7].includes(days)) {
        await (prisma.telegramLink.update as any)({
          where: { id: link.id },
          data: { reminderLeadDays: days },
        });
        await ctx.reply(`Reminder lead time set to ${days} day(s) before deadline.`);
        return;
      }

      await ctx.reply('Usage: /reminders [on|off|1|3|7]');
    } catch (error) {
      logger.error('[TelegramBot] Error in /reminders', { error: (error as Error).message });
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleCallbackQuery(ctx: Context, aiChatService: AIChatService): Promise<void> {
    try {
      const data = (ctx.callbackQuery as any)?.data as string | undefined;
      if (!data) return;

      if (data.startsWith('ocr:add:')) {
        await this.ocrFlowHandler.handleAdd(ctx, data.substring('ocr:add:'.length));
        return;
      }
      if (data.startsWith('ocr:cancel:')) {
        await this.ocrFlowHandler.handleCancel(ctx, data.substring('ocr:cancel:'.length));
        return;
      }

      if (!data.startsWith('chat:')) return;

      const conversationId = data.substring(5);
      const telegramUserId = String(ctx.from?.id);

      const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
      if (!link) {
        await ctx.answerCbQuery('Account not linked.');
        return;
      }

      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { activeConversationId: conversationId },
      });

      const conversations = await aiChatService.getConversations(link.userId, 10);
      const selected = conversations.find((c) => c.id === conversationId);
      const title = selected?.title || 'Untitled';

      await ctx.answerCbQuery(`Switched to: ${title.substring(0, 50)}`);

      const buttons = conversations.map((conv) => {
        const isActive = conv.id === conversationId;
        const convTitle = conv.title || 'Untitled';
        const label = isActive ? `✓ ${convTitle.substring(0, 38)}` : convTitle.substring(0, 40);
        return [Markup.button.callback(label, `chat:${conv.id}`)];
      });

      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(buttons).reply_markup);

      const conversation = await aiChatService.getConversation(conversationId, link.userId);
      if (conversation && conversation.messages.length > 0) {
        const recent = conversation.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-6);

        if (recent.length > 0) {
          const lines = recent.map((m) => {
            const prefix = m.role === 'user' ? '👤' : '🤖';
            const text = typeof m.content === 'string' ? m.content : '';
            return `${prefix} ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`;
          });

          await ctx.reply(
            `📋 *${title.substring(0, 50)}*\n\nRecent messages:\n\n${lines.join('\n\n')}`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (error) {
      logger.error('[TelegramBot] Error in callback query', { error: (error as Error).message });
      try {
        await ctx.answerCbQuery('An error occurred.');
      } catch { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Message handler
  // ---------------------------------------------------------------------------

  private setupMessageHandler(): void {
    if (!this.bot) return;

    this.bot.on('text', async (ctx) => {
      if (ctx.message.text.startsWith('/')) return;

      try {
        const telegramUserId = String(ctx.from?.id);

        const allowed = await this.rateLimiter.isAllowed(telegramUserId);
        if (!allowed) {
          await ctx.reply('You are sending messages too fast. Please wait a moment and try again.');
          return;
        }

        const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
        if (!link) {
          await ctx.reply('Please link your account first with /link');
          return;
        }

        await this.aiChatRouter.route(ctx, link);
      } catch (error) {
        logger.error('[TelegramBot] Unhandled error in message handler', {
          error: (error as Error).message,
        });
        await ctx.reply('An error occurred while processing your message. Please try again.');
      }
    });

    this.bot.on('photo', async (ctx) => {
      try {
        const telegramUserId = String(ctx.from?.id);

        const allowed = await this.rateLimiter.isAllowed(telegramUserId);
        if (!allowed) {
          await ctx.reply('You are sending messages too fast. Please wait a moment and try again.');
          return;
        }

        const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
        if (!link) {
          await ctx.reply('Please link your account first with /link');
          return;
        }

        await this.ocrFlowHandler.handlePhoto(ctx, link);
      } catch (error) {
        logger.error('[TelegramBot] Unhandled error in photo handler', {
          error: (error as Error).message,
        });
        await ctx.reply('Could not process the photo. Please try again.');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Proactive messaging
  // ---------------------------------------------------------------------------

  /**
   * Send a plain-text message to a Telegram user without an incoming context.
   * Used by TaxDeadlineReminderService for proactive deadline notifications.
   */
  async sendProactiveMessage(telegramUserId: string, text: string): Promise<void> {
    if (!this.bot || !this.initialized) {
      logger.warn('[TelegramBot] Cannot send proactive message: bot not initialized');
      return;
    }

    try {
      await this.bot.telegram.sendMessage(telegramUserId, text);
    } catch (error) {
      logger.error('[TelegramBot] Failed to send proactive message', {
        telegramUserId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async startPolling(): Promise<void> {
    if (!this.bot || !this.initialized) {
      logger.warn('[TelegramBot] Cannot start polling: bot not initialized');
      return;
    }

    try {
      await this.bot.launch();
      logger.info('[TelegramBot] Bot started in polling mode');
    } catch (error) {
      logger.error('[TelegramBot] Failed to start polling', { error: (error as Error).message });
    }
  }

  async setupWebhook(url: string, secret: string): Promise<void> {
    if (!this.bot || !this.initialized) {
      logger.warn('[TelegramBot] Cannot setup webhook: bot not initialized');
      return;
    }

    try {
      await this.bot.telegram.setWebhook(url, { secret_token: secret });
      logger.info('[TelegramBot] Webhook set', { url });
    } catch (error) {
      logger.error('[TelegramBot] Failed to set webhook', { error: (error as Error).message });
    }
  }

  getWebhookCallback(secret: string) {
    if (!this.bot) return null;
    return this.bot.webhookCallback(`/api/telegram/webhook`, { secretToken: secret });
  }

  stop(): void {
    if (!this.bot || !this.initialized) return;

    try {
      this.bot.stop('SIGTERM');
      logger.info('[TelegramBot] Bot stopped');
    } catch (error) {
      logger.error('[TelegramBot] Error stopping bot', { error: (error as Error).message });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
