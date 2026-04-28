import { healthService } from './health.service.instance';
import { HealthSnapshot } from './types';
import { Sentry } from '../../lib/sentry';
import { telegramService } from '../telegram.instance';
import { logger } from '../../utils/logger';

type State = HealthSnapshot['status'];

export class HealthMonitorService {
  private currentState: State = 'ok';
  private consecutiveFailures = 0;
  private downSince: Date | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly FAIL_THRESHOLD = 2;
  private readonly POLL_INTERVAL_MS = 30_000;

  start(): void {
    if (this.timer) return;
    // Immediate first tick — no 30s blind window after boot.
    this.tick().catch((err) => logger.error('[HealthMonitor] First tick failed', err));
    this.timer = setInterval(
      () => this.tick().catch((err) => logger.error('[HealthMonitor] Tick failed', err)),
      this.POLL_INTERVAL_MS,
    );
    logger.info('[HealthMonitor] Started');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    let snapshot: HealthSnapshot;
    try {
      snapshot = await healthService.getSnapshot();
    } catch (err) {
      logger.error('[HealthMonitor] getSnapshot threw', err);
      // Synthetic down snapshot
      snapshot = {
        status: 'down',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 0,
        checks: { db: { ok: false, latencyMs: 0, error: (err as Error).message }, redis: { ok: false, latencyMs: 0 } },
        integrations: {
          wfirma: { ok: false, latencyMs: 0 },
          openai: { ok: false, latencyMs: 0 },
          anthropic: { ok: false, latencyMs: 0 },
        },
      };
    }

    const next = snapshot.status;

    if (next !== 'ok' && this.currentState === 'ok') {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures < this.FAIL_THRESHOLD) return;
    } else {
      this.consecutiveFailures = 0;
    }

    if (next !== this.currentState) {
      await this.transitionTo(next, snapshot);
    }
  }

  private async transitionTo(next: State, snapshot: HealthSnapshot): Promise<void> {
    const prev = this.currentState;
    this.currentState = next;

    if (next === 'down' || next === 'degraded') {
      this.downSince = new Date();
      Sentry.captureMessage(`Health: ${prev} → ${next}`, {
        level: next === 'down' ? 'error' : 'warning',
        tags: { component: 'health-monitor', state: next },
        extra: { snapshot },
      });
      try {
        await telegramService.notifyHealthAlert(prev, next, snapshot);
      } catch (err) {
        logger.error('[HealthMonitor] Telegram alert failed', err);
      }
    } else if (next === 'ok') {
      const downtimeMs = this.downSince ? Date.now() - this.downSince.getTime() : 0;
      this.downSince = null;
      try {
        await telegramService.notifyHealthRecovery(prev, downtimeMs);
      } catch (err) {
        logger.error('[HealthMonitor] Telegram recovery failed', err);
      }
    }
  }
}
