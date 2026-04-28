import axios from 'axios';
import { logger } from '../utils/logger';
import { HealthSnapshot } from './health/types';

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

  async notifyHealthAlert(prev: string, next: string, snap: HealthSnapshot): Promise<void> {
    const failedChecks = Object.entries(snap.checks)
      .filter(([, c]) => !c.ok)
      .map(([k, c]) => `❌ ${k}: ${c.error ?? 'failed'} (${c.latencyMs}ms)`);
    const okChecks = Object.entries(snap.checks)
      .filter(([, c]) => c.ok)
      .map(([k, c]) => `✅ ${k} (${c.latencyMs}ms)`);
    const integrationLines = Object.entries(snap.integrations)
      .map(([k, c]) => `  ${c.ok ? '✅' : '❌'} ${k}${c.ok ? '' : `: ${c.error ?? 'failed'}`}`);

    const icon = next === 'down' ? '🚨' : '⚠️';
    const text = [
      `${icon} <b>ALERT — Service ${next}</b>`,
      ``,
      `State: ${prev} → ${next}`,
      `Time: ${snap.timestamp}`,
      `Failed checks:`,
      ...failedChecks.map((l) => `  ${l}`),
      ...okChecks.map((l) => `  ${l}`),
      `Integrations:`,
      ...integrationLines,
      ``,
      `Env: ${process.env.NODE_ENV ?? 'unknown'}`,
    ].join('\n');

    await this.sendMessage(text);
  }

  async notifyHealthRecovery(previousState: string, downtimeMs: number): Promise<void> {
    const minutes = Math.floor(downtimeMs / 60_000);
    const seconds = Math.floor((downtimeMs % 60_000) / 1000);
    const downtime = `${minutes}m ${seconds}s`;

    const text = [
      `✅ <b>RECOVERED</b>`,
      ``,
      `Previous: ${previousState}`,
      `Downtime: ${downtime}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');

    await this.sendMessage(text);
  }
}
