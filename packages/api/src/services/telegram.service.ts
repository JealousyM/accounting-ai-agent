import axios from 'axios';
import { logger } from '../utils/logger';

export class TelegramNotificationService {
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  private readonly enabled: boolean;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);

    if (!this.enabled) {
      logger.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured, notifications disabled');
    }
  }

  private async sendMessage(text: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
      });
    } catch (error) {
      logger.error('[Telegram] Failed to send message', {
        error: (error as Error).message,
      });
    }
  }

  notifyNewUser(email: string, firstName: string, provider?: string, plan?: string): void {
    const method = provider || 'email';
    const planName = plan === 'pro' ? 'Pro' : 'Free';
    const text =
      `<b>New user registered in eKsiegowyAi.pl</b>\n` +
      `Email: ${email}\n` +
      `Name: ${firstName}\n` +
      `Method: ${method}\n` +
      `Plan: ${planName}`;

    this.sendMessage(text).catch(() => {});
  }

  notifySubscriptionChanged(email: string, plan: string): void {
    const planName = plan === 'pro' ? 'Pro' : plan === 'free' ? 'Free' : plan;
    const text =
      `<b>Subscription changed in eKsiegowyAi.pl</b>\n` +
      `Email: ${email}\n` +
      `Plan: ${planName}`;

    this.sendMessage(text).catch(() => {});
  }

  notifySubscriptionCanceled(email: string): void {
    const text =
      `<b>Subscription canceled in eKsiegowyAi.pl</b>\n` +
      `Email: ${email}`;

    this.sendMessage(text).catch(() => {});
  }
}
