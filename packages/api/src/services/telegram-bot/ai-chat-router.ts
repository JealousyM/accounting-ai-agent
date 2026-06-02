import { Context } from 'telegraf';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { AIChatService } from '../ai-chat/ai-chat.service';
import { convertToTelegramMarkdown, splitMessage } from './markdown-converter';

type LinkedAccount = { id: string; userId: string; activeConversationId: string | null };

export class AIChatRouter {
  constructor(private readonly aiChatService: AIChatService) {}

  /**
   * Route a plain-text message to the AI chat service. Creates a conversation
   * if the user has none active, then sends the message and replies with the
   * AI response formatted for Telegram.
   *
   * Caller must have already verified the rate limit and resolved `link`.
   */
  async route(
    ctx: Context & { message: { text: string } },
    link: LinkedAccount,
  ): Promise<void> {
    const messageText = ctx.message.text;

    let conversationId = link.activeConversationId;
    if (!conversationId) {
      const conversation = await this.aiChatService.createConversation(link.userId);
      conversationId = conversation.id;
      await prisma.telegramLink.update({
        where: { id: link.id },
        data: { activeConversationId: conversationId },
      });
    }

    await ctx.sendChatAction('typing');

    const result = await this.aiChatService.sendMessage(conversationId, link.userId, messageText);

    const responseText =
      typeof result.assistantMessage.content === 'string' ? result.assistantMessage.content : '';
    const telegramText = convertToTelegramMarkdown(responseText);
    const chunks = splitMessage(telegramText);

    for (const chunk of chunks) {
      try {
        await ctx.reply(chunk, { parse_mode: 'MarkdownV2' });
      } catch (parseError) {
        logger.warn('[AIChatRouter] MarkdownV2 parse failed, sending as plain text', {
          error: (parseError as Error).message,
        });
        // eslint-disable-next-line no-useless-escape
        const plainText = chunk.replace(/\\([_*\[\]()~`>#\+\-=|{}.!\\])/g, '$1');
        await ctx.reply(plainText);
      }
    }
  }
}
