import { HealthMonitorService } from '../health-monitor.service';
import { HealthSnapshot } from '../types';

const mockGetSnapshot = jest.fn();
const mockCaptureMessage = jest.fn();
const mockNotifyAlert = jest.fn();
const mockNotifyRecovery = jest.fn();

jest.mock('../health.service.instance', () => ({
  healthService: { getSnapshot: (...args: unknown[]) => mockGetSnapshot(...args) },
}));
jest.mock('../../../lib/sentry', () => ({
  Sentry: { captureMessage: (...args: unknown[]) => mockCaptureMessage(...args) },
}));
jest.mock('../../telegram.instance', () => ({
  telegramService: {
    notifyHealthAlert: (...args: unknown[]) => mockNotifyAlert(...args),
    notifyHealthRecovery: (...args: unknown[]) => mockNotifyRecovery(...args),
  },
}));

const okSnap: HealthSnapshot = {
  status: 'ok',
  timestamp: 'now',
  uptimeSeconds: 1,
  checks: { db: { ok: true, latencyMs: 1 }, redis: { ok: true, latencyMs: 1 } },
  integrations: {
    wfirma: { ok: true, latencyMs: 1 },
    openai: { ok: true, latencyMs: 1 },
  },
};
const downSnap: HealthSnapshot = { ...okSnap, status: 'down', checks: { db: { ok: false, latencyMs: 1 }, redis: { ok: true, latencyMs: 1 } } };

describe('HealthMonitorService', () => {
  let monitor: HealthMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new HealthMonitorService();
  });
  afterEach(() => monitor.stop());

  it('does not alert on first failure (debounce: needs 2 in a row)', async () => {
    mockGetSnapshot.mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    expect(mockNotifyAlert).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('alerts after 2 consecutive failures', async () => {
    mockGetSnapshot.mockResolvedValueOnce(downSnap).mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage.mock.calls[0][1].level).toBe('error');
  });

  it('does not re-alert on continued failures (one alert per transition)', async () => {
    mockGetSnapshot
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap)
      .mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
  });

  it('fires recovery with downtime when transitioning back to ok', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-27T14:30:00Z'));

    mockGetSnapshot.mockResolvedValueOnce(downSnap).mockResolvedValueOnce(downSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-04-27T14:34:12Z')); // +4m 12s
    mockGetSnapshot.mockResolvedValueOnce(okSnap);
    await monitor['tick']();
    expect(mockNotifyRecovery).toHaveBeenCalledTimes(1);
    expect(mockNotifyRecovery.mock.calls[0][1]).toBe(252_000);

    jest.useRealTimers();
  });

  it('uses warning level in Sentry for degraded state', async () => {
    const degradedSnap = { ...okSnap, status: 'degraded' as const, integrations: { ...okSnap.integrations, openai: { ok: false, latencyMs: 1 } } };
    mockGetSnapshot.mockResolvedValueOnce(degradedSnap).mockResolvedValueOnce(degradedSnap);
    await monitor['tick']();
    await monitor['tick']();
    expect(mockCaptureMessage.mock.calls[0][1].level).toBe('warning');
  });

  it('survives a getSnapshot exception (treats it as down)', async () => {
    mockGetSnapshot.mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('boom'));
    await monitor['tick']();
    await monitor['tick']();
    expect(mockNotifyAlert).toHaveBeenCalledTimes(1);
  });

  it('start() runs an immediate first tick', async () => {
    mockGetSnapshot.mockResolvedValue(okSnap);
    monitor.start();
    await new Promise((r) => setImmediate(r));
    expect(mockGetSnapshot).toHaveBeenCalledTimes(1);
  });

  it('stop() prevents further ticks', () => {
    jest.useFakeTimers();
    mockGetSnapshot.mockResolvedValue(okSnap);
    monitor.start();
    monitor.stop();
    mockGetSnapshot.mockClear();
    jest.advanceTimersByTime(60_000);
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
