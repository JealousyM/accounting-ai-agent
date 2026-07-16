import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EDoreczeniaConfigService, ActiveConfig } from './config.service';
import { UAApiClient } from './ua-api-client';
import { LetterAnalysisService } from './letter-analysis.service';
import { EDoreczeniaDeadlineService } from './deadline.service';
import { Locale } from '../../i18n';

export interface MailboxPollerDeps {
  prisma: PrismaClient;
  configService: EDoreczeniaConfigService;
  clientFactory: (cfg: ActiveConfig) => UAApiClient;
  analysisService: LetterAnalysisService;
  deadlineService: EDoreczeniaDeadlineService;
  onNewLetter?: (userId: string, letterId: string) => Promise<void>;
  pollIntervalMs?: number;
}

export class MailboxPollerService {
  private intervalId?: ReturnType<typeof setInterval>;
  private dbUnavailable = false;
  private readonly intervalMs: number;

  constructor(private readonly deps: MailboxPollerDeps) {
    this.intervalMs = deps.pollIntervalMs
      ?? parseInt(process.env.EDORECZENIA_POLL_INTERVAL_MINUTES ?? '15', 10) * 60 * 1000;
  }

  start(): void {
    if (this.intervalId) { logger.warn('[EDoreczenia] Poller already running'); return; }
    logger.info('[EDoreczenia] Starting mailbox poller', { intervalMs: this.intervalMs });
    this.intervalId = setInterval(() => {
      this.pollOnce().catch((error) => {
        const msg = error instanceof Error ? error.message : 'Unknown';
        if (msg.includes("Can't reach database server")) {
          if (!this.dbUnavailable) { this.dbUnavailable = true; logger.warn('[EDoreczenia] DB unavailable, pausing polls'); }
          return;
        }
        logger.error('[EDoreczenia] Poller error', { error: msg });
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = undefined; logger.info('[EDoreczenia] Poller stopped'); }
  }

  async pollOnce(): Promise<void> {
    if (this.dbUnavailable) {
      await this.deps.prisma.$queryRaw`SELECT 1`;
      this.dbUnavailable = false;
      logger.info('[EDoreczenia] DB reconnected, resuming polls');
    }

    const configs = await this.deps.configService.getActiveConfigs();
    for (const cfg of configs) {
      try {
        await this.pollConfig(cfg);
        await this.deps.prisma.eDoreczeniaConfig.update({
          where: { id: cfg.id },
          data: { lastPolledAt: new Date(), lastPollError: null, consecutiveFailures: 0 },
        });
      } catch (e) {
        logger.error('[EDoreczenia] Config poll failed', { configId: cfg.id, error: (e as Error).message });
        await this.deps.prisma.eDoreczeniaConfig.update({
          where: { id: cfg.id },
          data: { lastPollError: (e as Error).message, consecutiveFailures: { increment: 1 } },
        });
      }
    }
  }

  private async pollConfig(cfg: ActiveConfig): Promise<void> {
    const client = this.deps.clientFactory(cfg);
    const summaries = await client.listMessages();

    for (const s of summaries) {
      const existing = await this.deps.prisma.eDoreczeniaLetter.findUnique({
        where: { userId_messageId: { userId: cfg.userId, messageId: s.messageId } },
      });
      if (existing) continue; // dedupe

      const senderType = this.deps.analysisService.classifySender(s.senderName);

      // fikcja-doręczenia safeguard (spec §6.3): only perform the legally-receiving
      // read + AI analysis when autoReceive is on. When off, record envelope
      // metadata only and alert; the user triggers full receipt explicitly later.
      if (!cfg.autoReceive) {
        const letter = await this.deps.prisma.eDoreczeniaLetter.create({
          data: {
            userId: cfg.userId,
            configId: cfg.id,
            messageId: s.messageId,
            senderName: s.senderName,
            senderType,
            subject: s.subject,
            receivedAt: s.receivedAt,
            status: 'new',
            analysisStatus: 'pending',
          },
        });
        if (this.deps.onNewLetter) await this.deps.onNewLetter(cfg.userId, letter.id);
        continue;
      }

      const content = await client.receiveMessage(s.messageId);

      const letter = await this.deps.prisma.eDoreczeniaLetter.create({
        data: {
          userId: cfg.userId,
          configId: cfg.id,
          messageId: s.messageId,
          senderName: s.senderName,
          senderType,
          subject: s.subject,
          receivedAt: s.receivedAt,
          bodyText: content.bodyText,
          attachmentsMeta: content.attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, sizeBytes: a.sizeBytes })),
          status: 'new',
          analysisStatus: 'pending',
        },
      });

      // Analyse (best-effort — the guardian still works if AI fails).
      try {
        const analysis = await this.deps.analysisService.analyze(cfg.userId, {
          senderName: s.senderName, subject: s.subject, bodyText: content.bodyText, locale: 'pl' as Locale,
        });
        const deadlines = this.deps.deadlineService.buildDeadlines(s.receivedAt, analysis);
        await this.deps.deadlineService.persistDeadlines(letter.id, cfg.userId, deadlines);
        await this.deps.prisma.eDoreczeniaLetter.update({
          where: { id: letter.id },
          data: { analysis: analysis as object, analysisStatus: 'done', status: analysis.severity === 'high' ? 'needs_action' : 'new' },
        });
      } catch (e) {
        logger.error('[EDoreczenia] Analysis failed', { letterId: letter.id, error: (e as Error).message });
        await this.deps.prisma.eDoreczeniaLetter.update({ where: { id: letter.id }, data: { analysisStatus: 'unavailable' } });
      }

      if (this.deps.onNewLetter) await this.deps.onNewLetter(cfg.userId, letter.id);
    }
  }
}
