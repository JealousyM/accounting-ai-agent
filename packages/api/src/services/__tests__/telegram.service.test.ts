import axios from 'axios';
import { TelegramNotificationService } from '../telegram.service';
import { HealthSnapshot } from '../health/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramNotificationService — health alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
  });

  const snap: HealthSnapshot = {
    status: 'down',
    timestamp: '2026-04-27T14:32:18.000Z',
    uptimeSeconds: 100,
    checks: {
      db: { ok: false, latencyMs: 85, error: 'connection refused' },
      redis: { ok: true, latencyMs: 12 },
    },
    integrations: {
      wfirma: { ok: false, latencyMs: 5000, error: 'timeout' },
      openai: { ok: true, latencyMs: 230 },
      anthropic: { ok: true, latencyMs: 180 },
    },
  };

  it('notifyHealthAlert sends a HTML message with state and failed checks', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

    await svc.notifyHealthAlert('ok', 'down', snap);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [, body] = mockedAxios.post.mock.calls[0] as [string, { parse_mode: string; text: string }];
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('ALERT');
    expect(body.text).toContain('ok → down');
    expect(body.text).toContain('db');
    expect(body.text).toContain('wfirma');
  });

  it('notifyHealthRecovery includes downtime in human-readable form', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } });
    await svc.notifyHealthRecovery('down', 252_000); // 4m 12s
    const [, body] = mockedAxios.post.mock.calls[0] as [string, { parse_mode: string; text: string }];
    expect(body.text).toContain('RECOVERED');
    expect(body.text).toContain('4m 12s');
  });

  it('is no-op when TELEGRAM_CHAT_ID missing', async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const svc = new TelegramNotificationService();
    await svc.notifyHealthAlert('ok', 'down', snap);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not throw when axios fails (logs only)', async () => {
    const svc = new TelegramNotificationService();
    mockedAxios.post.mockRejectedValueOnce(new Error('telegram down'));
    await expect(svc.notifyHealthAlert('ok', 'down', snap)).resolves.not.toThrow();
  });
});
