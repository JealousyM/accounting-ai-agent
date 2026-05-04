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
import { convertToTelegramMarkdown, splitMessage } from './markdown-converter';
import { receiptOCRService } from '../ocr/receipt-ocr.instance';
import { formatParsedReceipt } from '../ocr/formatter';
import { getOcrTranslations, Locale } from '../../i18n';
import { detectLocale } from '../ai-chat/utils';
import { credentialsService } from '../credentials.instance';

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
    this.bot.command('chats', (ctx) => this.handleChats(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));

    // Callback queries for inline keyboard (chat switching)
    this.bot.on('callback_query', (ctx) => this.handleCallbackQuery(ctx));
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

  private async handleChats(ctx: Context): Promise<void> {
    try {
      const telegramUserId = String(ctx.from?.id);

      const link = await prisma.telegramLink.findUnique({
        where: { telegramUserId },
      });

      if (!link) {
        await ctx.reply('Please link your account first with /link');
        return;
      }

      const conversations = await this.aiChatService.getConversations(link.userId, 10);

      if (conversations.length === 0) {
        await ctx.reply('No conversations yet. Send a message to start one.');
        return;
      }

      const buttons = conversations.map((conv) => {
        const isActive = conv.id === link.activeConversationId;
        const title = conv.title || 'Untitled';
        const label = isActive
          ? `✓ ${title.substring(0, 38)}`
          : title.substring(0, 40);
        return [Markup.button.callback(label, `chat:${conv.id}`)];
      });

      await ctx.reply(
        'Your recent conversations:',
        Markup.inlineKeyboard(buttons)
      );
    } catch (error) {
      logger.error('[TelegramBot] Error in /chats', { error: (error as Error).message });
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleCallbackQuery(ctx: Context): Promise<void> {
    try {
      const data = (ctx.callbackQuery as any)?.data as string | undefined;
      if (!data || !data.startsWith('chat:')) return;

      const conversationId = data.substring(5);
      const telegramUserId = String(ctx.from?.id);

      const link = await prisma.telegramLink.findUnique({
        where: { telegramUserId },
      });

      if (!link) {
        await ctx.answerCbQuery('Account not linked.');
        return;
      }

      // Update active conversation
      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { activeConversationId: conversationId },
      });

      // Get conversations to find title and rebuild keyboard
      const conversations = await this.aiChatService.getConversations(link.userId, 10);
      const selected = conversations.find((c) => c.id === conversationId);
      const title = selected?.title || 'Untitled';

      await ctx.answerCbQuery(`Switched to: ${title.substring(0, 50)}`);

      // Update the inline keyboard to reflect new active chat
      const buttons = conversations.map((conv) => {
        const isActive = conv.id === conversationId;
        const convTitle = conv.title || 'Untitled';
        const label = isActive
          ? `✓ ${convTitle.substring(0, 38)}`
          : convTitle.substring(0, 40);
        return [Markup.button.callback(label, `chat:${conv.id}`)];
      });

      await ctx.editMessageReplyMarkup(
        Markup.inlineKeyboard(buttons).reply_markup
      );

      // Show recent messages from the selected conversation
      const conversation = await this.aiChatService.getConversation(conversationId, link.userId);
      if (conversation && conversation.messages.length > 0) {
        const recent = conversation.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-6); // last 3 pairs

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

  private async handleHelp(ctx: Context): Promise<void> {
    try {
      await ctx.reply(
        'Available commands:\n\n' +
          '/start - Welcome message\n' +
          '/link - Get a code to link your account\n' +
          '/unlink - Unlink your Telegram account\n' +
          '/new - Start a new conversation\n' +
          '/chats - Switch between conversations\n' +
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

    this.bot.on('photo', async (ctx) => {
      try {
        await this.handlePhoto(ctx);
      } catch (error) {
        logger.error('[TelegramBot] Unhandled error in photo handler', {
          error: (error as Error).message,
        });
        await ctx.reply('Could not process the photo. Please try again.');
      }
    });
  }

  /**
   * OCR a receipt photo: download highest-resolution variant, run it through
   * the receipt-ocr service, post a formatted markdown card back. Locale is
   * detected from the user's Telegram language setting (`language_code`).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePhoto(ctx: any): Promise<void> {
    const telegramUserId = String(ctx.from?.id);
    const langCode: string = ctx.from?.language_code || 'pl';
    // Map Telegram language_code → our Locale (pl/en/ru). Default to pl.
    const locale: Locale = langCode.startsWith('ru')
      ? 'ru'
      : langCode.startsWith('en')
        ? 'en'
        : 'pl';
    const t = getOcrTranslations(locale);

    // Account-link gate (same as text handler)
    const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
    if (!link) {
      await ctx.reply('Please link your account first with /link');
      return;
    }

    // Rate limit
    const rateLimitKey = `telegram:rate:${telegramUserId}`;
    const currentCount = await redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await redis.setEx(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS, String(currentCount));
    }
    if (currentCount > RATE_LIMIT_MAX_MESSAGES) {
      await ctx.reply('You are sending messages too fast. Please wait a moment and try again.');
      return;
    }

    await ctx.sendChatAction('typing');
    const ackMsg = await ctx.reply(`🔍 ${t.recognizing}`);

    // Pick the largest photo size (Telegram sends multiple resolutions)
    const photos = ctx.message.photo as Array<{ file_id: string; width: number; height: number }>;
    const largest = photos.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    const fileLink = await ctx.telegram.getFileLink(largest.file_id);

    // Download bytes
    const response = await fetch(fileLink.toString());
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Vision OCR runs on the user's own OpenAI quota — same per-user
    // credential model as the AI chat (see ai-chat.service.ts:runAgent).
    // Vision is currently OpenAI-only (gpt-4o); for users on a non-OpenAI
    // provider we surface the same actionable "add OpenAI key" message.
    const userCreds = await credentialsService.getLLMCredentials(link.userId);
    if (!userCreds || userCreds.provider !== 'openai' || !userCreds.apiKey) {
      logger.warn('[TelegramBot] OCR skipped — no OpenAI credentials', {
        telegramUserId,
        userId: link.userId,
        provider: userCreds?.provider ?? null,
      });
      try {
        await ctx.telegram.deleteMessage(ackMsg.chat.id, ackMsg.message_id);
      } catch {
        /* best effort */
      }
      await ctx.reply(`⚠️ ${t.noApiKey}`);
      return;
    }

    let markdown: string;
    try {
      const parsed = await receiptOCRService.extractFromImage(buffer, 'image/jpeg', locale, {
        apiKey: userCreds.apiKey,
      });
      // detectLocale on parsed seller name lets us refine: a receipt clearly in PL
      // but user has language_code=en → still use 'pl' formatting? No — keep user
      // locale for table headers, the data itself is locale-neutral.
      void detectLocale; // referenced to keep import — used by AI chat path
      markdown = formatParsedReceipt(parsed, locale);
    } catch (error) {
      logger.warn('[TelegramBot] OCR failed', {
        telegramUserId,
        error: (error as Error).message,
      });
      await ctx.reply(`⚠️ ${t.recognizeFailed}`);
      return;
    } finally {
      // remove the "recognizing..." placeholder so chat stays clean
      try {
        await ctx.telegram.deleteMessage(ackMsg.chat.id, ackMsg.message_id);
      } catch {
        /* best effort */
      }
    }

    const telegramText = convertToTelegramMarkdown(markdown);
    const chunks = splitMessage(telegramText);
    for (const chunk of chunks) {
      try {
        await ctx.reply(chunk, { parse_mode: 'MarkdownV2' });
      } catch {
        // eslint-disable-next-line no-useless-escape
        const plainText = chunk.replace(/\\([_*\[\]()~`>#\+\-=|{}.!\\])/g, '$1');
        await ctx.reply(plainText);
      }
    }
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
