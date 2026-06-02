import { Markup } from 'telegraf';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { receiptOCRService } from '../ocr/receipt-ocr.instance';
import { formatParsedReceipt } from '../ocr/formatter';
import { ParsedReceipt } from '../ocr/types';
import { getOcrTranslations, getExpenseTranslations, Locale } from '../../i18n';
import { credentialsService } from '../credentials.instance';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { CompanyEnrichmentService } from '../company-enrichment.service';
import { WFirmaCacheService } from '../wfirma-cache.service';
import { createExpenseFromParsedReceipt } from '../ai-chat/tools/expense.tools';
import { formatExpenseCreated } from '../ai-chat/formatters';
import { convertToTelegramMarkdown, splitMessage } from './markdown-converter';

// How long parsed-receipt data lives in Redis. Long enough to read the card
// and decide; short enough that stale entries expire on their own.
const OCR_PARSED_TTL_SECONDS = 600;

interface OcrFlowHandlerDeps {
  wfirmaFactory?: WFirmaServiceFactory;
  enrichmentService?: CompanyEnrichmentService;
  cacheService?: WFirmaCacheService;
}

type LinkedAccount = { id: string; userId: string; activeConversationId: string | null };

function resolveLocale(languageCode: string | undefined): Locale {
  const lang = languageCode ?? 'pl';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('en')) return 'en';
  return 'pl';
}

export class OcrFlowHandler {
  private readonly wfirmaFactory?: WFirmaServiceFactory;
  private readonly enrichmentService?: CompanyEnrichmentService;
  private readonly cacheService?: WFirmaCacheService;

  constructor({ wfirmaFactory, enrichmentService, cacheService }: OcrFlowHandlerDeps) {
    this.wfirmaFactory = wfirmaFactory;
    this.enrichmentService = enrichmentService;
    this.cacheService = cacheService;
  }

  /**
   * Process a photo message: download, OCR, cache result, reply with a card
   * and "Add as expense" / "Cancel" inline buttons.
   *
   * Caller must have already verified that `link` is valid and rate-limit
   * passed before invoking this method.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handlePhoto(ctx: any, link: LinkedAccount): Promise<void> {
    const telegramUserId = String(ctx.from?.id);
    const locale = resolveLocale(ctx.from?.language_code);
    const t = getOcrTranslations(locale);

    await ctx.sendChatAction('typing');
    const ackMsg = await ctx.reply(`🔍 ${t.recognizing}`);

    type PhotoSize = { file_id: string; width: number; height: number };
    const photos = ctx.message.photo as PhotoSize[];
    const largest = photos.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    const fileLink = await ctx.telegram.getFileLink(largest.file_id);

    const response = await fetch(fileLink.toString());
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Vision is OpenAI-only. For users on other providers surface the same
    // "add OpenAI key" message as the AI chat does.
    const userCreds = await credentialsService.getLLMCredentials(link.userId);
    if (!userCreds || userCreds.provider !== 'openai' || !userCreds.apiKey) {
      logger.warn('[OcrFlowHandler] OCR skipped — no OpenAI credentials', {
        telegramUserId,
        userId: link.userId,
        provider: userCreds?.provider ?? null,
      });
      try {
        await ctx.telegram.deleteMessage(ackMsg.chat.id, ackMsg.message_id);
      } catch { /* best effort */ }
      await ctx.reply(`⚠️ ${t.noApiKey}`);
      return;
    }

    let markdown: string;
    let parsed: ParsedReceipt;
    try {
      parsed = await receiptOCRService.extractFromImage(buffer, 'image/jpeg', locale, {
        apiKey: userCreds.apiKey,
      });
      markdown = formatParsedReceipt(parsed, locale);
    } catch (error) {
      logger.warn('[OcrFlowHandler] OCR failed', {
        telegramUserId,
        error: (error as Error).message,
      });
      await ctx.reply(`⚠️ ${t.recognizeFailed}`);
      return;
    } finally {
      try {
        await ctx.telegram.deleteMessage(ackMsg.chat.id, ackMsg.message_id);
      } catch { /* best effort */ }
    }

    // Cache parsed receipt so the inline-button callback can create the
    // expense without re-running OCR.
    const ocrId = crypto.randomBytes(6).toString('hex');
    await redis.setEx(
      `telegram:ocr:${telegramUserId}:${ocrId}`,
      OCR_PARSED_TTL_SECONDS,
      JSON.stringify(parsed),
    );

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t.addAsExpense, `ocr:add:${ocrId}`)],
      [Markup.button.callback(t.cancel, `ocr:cancel:${ocrId}`)],
    ]);

    const telegramText = convertToTelegramMarkdown(markdown);
    const chunks = splitMessage(telegramText);
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const opts = isLast
        ? { parse_mode: 'MarkdownV2' as const, reply_markup: keyboard.reply_markup }
        : { parse_mode: 'MarkdownV2' as const };
      try {
        await ctx.reply(chunks[i], opts);
      } catch {
        // eslint-disable-next-line no-useless-escape
        const plainText = chunks[i].replace(/\\([_*\[\]()~`>#\+\-=|{}.!\\])/g, '$1');
        await ctx.reply(plainText, isLast ? { reply_markup: keyboard.reply_markup } : undefined);
      }
    }
  }

  /**
   * Callback for the "✅ Add as expense" inline button. Retrieves the cached
   * parsed receipt and pushes it to wFirma as an expense.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleAdd(ctx: any, ocrId: string): Promise<void> {
    const telegramUserId = String(ctx.from?.id);
    const locale = resolveLocale(ctx.from?.language_code);
    const t = getOcrTranslations(locale);

    const link = await prisma.telegramLink.findUnique({ where: { telegramUserId } });
    if (!link) {
      await ctx.answerCbQuery('Account not linked.');
      return;
    }

    const cacheKey = `telegram:ocr:${telegramUserId}:${ocrId}`;
    const raw = await redis.get(cacheKey);
    if (!raw) {
      await ctx.answerCbQuery();
      await ctx.reply(`⚠️ ${t.expenseExpired}`);
      return;
    }

    if (!this.wfirmaFactory) {
      logger.error('[OcrFlowHandler] wfirmaFactory not configured — cannot create expense from OCR');
      await ctx.answerCbQuery();
      await ctx.reply(`⚠️ ${t.expenseCreateFailed.replace('{error}', 'wFirma not configured')}`);
      return;
    }

    let parsed: ParsedReceipt;
    try {
      parsed = JSON.parse(raw) as ParsedReceipt;
    } catch (err) {
      logger.error('[OcrFlowHandler] Failed to parse cached receipt', { err });
      await ctx.answerCbQuery();
      await ctx.reply(`⚠️ ${t.expenseExpired}`);
      return;
    }

    await ctx.answerCbQuery(t.expenseCreating);
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch { /* best effort — disable buttons to prevent double-click */ }

    try {
      const wfirmaService = await this.wfirmaFactory.getServiceForUser(link.userId);
      const expense = await createExpenseFromParsedReceipt(parsed, wfirmaService, {
        userId: link.userId,
        locale,
        enrichmentService: this.enrichmentService,
        cacheService: this.cacheService,
      });

      await redis.del(cacheKey);

      const successText = `${t.expenseCreated}\n\n${formatExpenseCreated(expense, locale)}`;
      const tgText = convertToTelegramMarkdown(successText);
      const chunks = splitMessage(tgText);
      for (const chunk of chunks) {
        try {
          await ctx.reply(chunk, { parse_mode: 'MarkdownV2' });
        } catch {
          // eslint-disable-next-line no-useless-escape
          const plainText = chunk.replace(/\\([_*\[\]()~`>#\+\-=|{}.!\\])/g, '$1');
          await ctx.reply(plainText);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      const exT = getExpenseTranslations(locale);
      const human = msg === 'cannotResolveSeller' ? exT.cannotResolveSeller : msg;
      logger.error('[OcrFlowHandler] Failed to create expense from OCR', {
        userId: link.userId,
        telegramUserId,
        error: msg,
      });
      await ctx.reply(`${t.expenseCreateFailed.replace('{error}', human)}`);
    }
  }

  /**
   * Callback for the "❌ Cancel" inline button. Drops the cached receipt.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleCancel(ctx: any, ocrId: string): Promise<void> {
    const telegramUserId = String(ctx.from?.id);
    const locale = resolveLocale(ctx.from?.language_code);
    const t = getOcrTranslations(locale);

    await redis.del(`telegram:ocr:${telegramUserId}:${ocrId}`);
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch { /* best effort */ }
    await ctx.reply(t.expenseCancelled);
  }
}
