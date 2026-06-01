/**
 * Tax Deadline Reminder Service
 *
 * Runs hourly. Once per day (at TAX_REMINDER_HOUR, default 09:00) sends a
 * plain-text Telegram reminder to every linked user whose `reminderEnabled`
 * flag is true, for each tax deadline due in exactly `reminderLeadDays` days.
 */

import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { TaxCalendarService, formatDateKey } from '../tax-calendar.service';
import { TaxDeadline } from '../../types/tax-calendar.types';
import { Locale } from '../../i18n';
import { TelegramBotService } from './telegram-bot.service';

const REMIND_HOUR = parseInt(process.env.TAX_REMINDER_HOUR ?? '9', 10);
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// These fields exist in the DB after migration but aren't in the generated Prisma client yet.
// Remove these casts after running `prisma generate`.
type TelegramLinkWithReminders = {
  id: string;
  userId: string;
  telegramUserId: string;
  reminderEnabled: boolean;
  reminderLeadDays: number;
  user: { locale: string };
};

export class TaxDeadlineReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly taxCalendarService = new TaxCalendarService();

  constructor(private readonly telegramBotService: TelegramBotService) {}

  start(): void {
    this.tick().catch((err) =>
      logger.error('[TaxReminder] Tick error on start', { error: (err as Error).message })
    );
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        logger.error('[TaxReminder] Tick error', { error: (err as Error).message })
      );
    }, CHECK_INTERVAL_MS);
    logger.info('[TaxReminder] Tax deadline reminder service started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.telegramBotService.isInitialized()) return;

    const now = new Date();
    if (now.getHours() !== REMIND_HOUR) return;

    const dayKey = formatDateKey(now);
    const redisKey = `tax:reminders:sent:${dayKey}`;

    const alreadySent = await redis.get(redisKey);
    if (alreadySent) return;

    // Mark before sending to prevent duplicate runs within the same hour
    await redis.setEx(redisKey, 25 * 60 * 60, '1');

    logger.info('[TaxReminder] Sending daily tax deadline reminders');
    await this.sendDailyReminders();
  }

  private async sendDailyReminders(): Promise<void> {
    const links = (await prisma.telegramLink.findMany({
      where: { reminderEnabled: true } as object,
      include: { user: { select: { locale: true } } },
    })) as unknown as TelegramLinkWithReminders[];

    logger.info(`[TaxReminder] Processing ${links.length} users with reminders enabled`);

    for (const link of links) {
      try {
        await this.processUserReminder({
          telegramUserId: link.telegramUserId,
          reminderLeadDays: link.reminderLeadDays,
          userId: link.userId,
          locale: link.user.locale,
        });
      } catch (err) {
        logger.error('[TaxReminder] Failed to send reminder for user', {
          userId: link.userId,
          error: (err as Error).message,
        });
      }
    }
  }

  private async processUserReminder(opts: {
    telegramUserId: string;
    reminderLeadDays: number;
    userId: string;
    locale: string;
  }): Promise<void> {
    const { telegramUserId, reminderLeadDays, userId } = opts;
    const locale = (opts.locale as Locale) || 'pl';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + reminderLeadDays);
    const targetKey = formatDateKey(targetDate);

    const allUpcoming = this.taxCalendarService.getUpcomingDeadlines(reminderLeadDays + 1, locale, 0);
    const matching = allUpcoming.filter((d) => formatDateKey(d.date) === targetKey);

    if (matching.length === 0) return;

    const message = this.formatReminderMessage(matching, reminderLeadDays, locale);
    await this.telegramBotService.sendProactiveMessage(telegramUserId, message);

    logger.info('[TaxReminder] Reminder sent', {
      userId,
      deadlines: matching.map((d) => d.name),
      leadDays: reminderLeadDays,
    });
  }

  private formatReminderMessage(deadlines: TaxDeadline[], leadDays: number, locale: Locale): string {
    const lines: string[] = [];

    if (locale === 'pl') {
      const daysWord = leadDays === 1 ? 'jutro' : `za ${leadDays} dni`;
      lines.push('⚠️ Przypomnienie podatkowe');
      lines.push('');
      lines.push(`Zbliżające się terminy (${daysWord}):`);
      lines.push('');
      for (const d of deadlines) {
        lines.push(`• ${d.name} — ${d.description}`);
        lines.push(`  📅 ${this.formatDate(d.date, locale)}`);
      }
      lines.push('');
      lines.push('Aby uzyskać pomoc z przygotowaniem deklaracji, napisz /new lub wyślij wiadomość.');
    } else if (locale === 'ru') {
      const daysWord = leadDays === 1 ? 'завтра' : `через ${leadDays} дня`;
      lines.push('⚠️ Напоминание о налоговых сроках');
      lines.push('');
      lines.push(`Приближающиеся сроки (${daysWord}):`);
      lines.push('');
      for (const d of deadlines) {
        lines.push(`• ${d.name} — ${d.description}`);
        lines.push(`  📅 ${this.formatDate(d.date, locale)}`);
      }
      lines.push('');
      lines.push('Для помощи с подготовкой деклараций напишите /new или отправьте сообщение.');
    } else {
      const daysWord = leadDays === 1 ? 'tomorrow' : `in ${leadDays} days`;
      lines.push('⚠️ Tax deadline reminder');
      lines.push('');
      lines.push(`Upcoming deadlines (${daysWord}):`);
      lines.push('');
      for (const d of deadlines) {
        lines.push(`• ${d.name} — ${d.description}`);
        lines.push(`  📅 ${this.formatDate(d.date, locale)}`);
      }
      lines.push('');
      lines.push('To get help preparing these filings, send /new or type your question.');
    }

    return lines.join('\n');
  }

  private formatDate(date: Date, locale: Locale): string {
    const localeMap: Record<Locale, string> = {
      pl: 'pl-PL',
      en: 'en-GB',
      ru: 'ru-RU',
    };
    return date.toLocaleDateString(localeMap[locale] ?? 'pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
