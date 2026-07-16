import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { Locale, getEDeliveryTranslations } from '../../i18n';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { LetterAnalysis } from './types';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const ESCALATION_DAYS = [7, 3, 1, 0];

export class EDoreczeniaReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly telegramBotService: TelegramBotService) {}

  start(): void {
    this.tick().catch((e) => logger.error('[EDorReminder] Tick error on start', { error: (e as Error).message }));
    this.timer = setInterval(() => {
      this.tick().catch((e) => logger.error('[EDorReminder] Tick error', { error: (e as Error).message }));
    }, CHECK_INTERVAL_MS);
    logger.info('[EDorReminder] E-Doręczenia reminder service started');
  }

  stop(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  async alertNewLetter(userId: string, letterId: string): Promise<void> {
    if (!this.telegramBotService.isInitialized()) return;

    const letter = await prisma.eDoreczeniaLetter.findFirst({
      where: { id: letterId, userId },
      include: { user: { select: { locale: true } } },
    });
    if (!letter) return;

    const link = await prisma.telegramLink.findUnique({ where: { userId } });
    if (!link) return;

    const locale = ((letter.user?.locale as Locale) || 'pl');
    const t = getEDeliveryTranslations(locale);
    const analysis = letter.analysis as unknown as LetterAnalysis | null;

    const lines = [
      t.alertTitle,
      '',
      `${t.newLetterFrom}: ${letter.senderName ?? '—'}`,
      letter.subject ? `📄 ${letter.subject}` : '',
    ];
    if (analysis) {
      const sev = analysis.severity === 'high' ? t.severityHigh : analysis.severity === 'medium' ? t.severityMedium : t.severityLow;
      lines.push('', sev, '', `${t.requiredAction}: ${analysis.requiredAction}`);
    }
    await this.telegramBotService.sendProactiveMessage(link.telegramUserId, lines.filter((l) => l !== '').join('\n'));
    logger.info('[EDorReminder] New-letter alert sent', { userId, letterId });
  }

  async tick(): Promise<void> {
    if (!this.telegramBotService.isInitialized()) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = await prisma.eDoreczeniaDeadline.findMany({
      where: { status: 'active' },
      include: { letter: { select: { senderName: true, subject: true } }, user: { select: { locale: true } } },
    });

    for (const d of active) {
      const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (!ESCALATION_DAYS.includes(daysUntil)) continue;

      const key = `edor:reminded:${d.id}:${daysUntil}`;
      if (await redis.get(key)) continue;
      await redis.setEx(key, 25 * 60 * 60, '1');

      const link = await prisma.telegramLink.findUnique({ where: { userId: d.userId } });
      if (!link) continue;

      const locale = ((d.user?.locale as Locale) || 'pl');
      const t = getEDeliveryTranslations(locale);
      const msg = [t.alertTitle, '', `${d.letter?.senderName ?? '—'}: ${d.letter?.subject ?? ''}`, '', `${t.deadlineIn}: ${daysUntil} d`].join('\n');
      try {
        await this.telegramBotService.sendProactiveMessage(link.telegramUserId, msg);
        await prisma.eDoreczeniaDeadline.update({ where: { id: d.id }, data: { remindersSent: { increment: 1 }, lastRemindedAt: new Date() } });
      } catch (e) {
        logger.error('[EDorReminder] Failed to send deadline reminder', { deadlineId: d.id, error: (e as Error).message });
      }
    }
  }
}
