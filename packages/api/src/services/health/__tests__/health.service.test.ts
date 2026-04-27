import { HealthService } from '../health.service';

jest.mock('../../../lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));
jest.mock('../../../lib/redis', () => ({
  redis: { ping: jest.fn() },
}));

import { prisma } from '../../../lib/prisma';
import { redis } from '../../../lib/redis';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedRedis = redis as jest.Mocked<typeof redis>;

describe('HealthService', () => {
  let service: HealthService;
  beforeEach(() => {
    service = new HealthService();
    jest.clearAllMocks();
  });

  describe('core checks', () => {
    it('returns ok=true when SELECT 1 succeeds', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service['checkDb']();
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('returns ok=false with error string on prisma failure', async () => {
      mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      const result = await service['checkDb']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('connection refused');
    });

    it('returns ok=true when redis.ping returns PONG', async () => {
      mockedRedis.ping.mockResolvedValueOnce('PONG');
      const result = await service['checkRedis']();
      expect(result.ok).toBe(true);
    });

    it('returns ok=false when redis.ping rejects', async () => {
      mockedRedis.ping.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const result = await service['checkRedis']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });
  });

  describe('integration probes — cost-free guarantee', () => {
    const fetchMock = jest.fn();
    beforeAll(() => {
      (global as any).fetch = fetchMock;
    });
    beforeEach(() => fetchMock.mockReset());

    it('checkOpenAI calls GET /v1/models exactly (must remain non-billable)', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      fetchMock.mockResolvedValueOnce({ ok: true } as Response);

      await service['checkOpenAI']();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/v1\/models$/);   // regression guard
      expect(options.method ?? 'GET').toBe('GET');    // regression guard
    });

    it('checkAnthropic calls GET /v1/models exactly (must remain non-billable)', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      fetchMock.mockResolvedValueOnce({ ok: true } as Response);

      await service['checkAnthropic']();

      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/v1\/models$/);
      expect(options.method ?? 'GET').toBe('GET');
    });

    it('checkOpenAI returns ok=true with "not configured" when env missing, makes NO request', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await service['checkOpenAI']();
      expect(result.ok).toBe(true);
      expect(result.error).toBe('not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('checkAnthropic returns ok=true with "not configured" when env missing, makes NO request', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = await service['checkAnthropic']();
      expect(result.ok).toBe(true);
      expect(result.error).toBe('not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('checkOpenAI returns ok=false when fetch rejects', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      fetchMock.mockRejectedValueOnce(new Error('timeout'));
      const result = await service['checkOpenAI']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('checkOpenAI returns ok=false when API returns non-2xx', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
      const result = await service['checkOpenAI']();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('500');
    });

    it('aborts after 5s timeout', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'; // explicit reset — earlier tests may have deleted it
      fetchMock.mockImplementationOnce((_url, opts: any) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        })
      );
      jest.useFakeTimers();
      const promise = service['checkOpenAI']();
      jest.advanceTimersByTime(5001);
      const result = await promise;
      jest.useRealTimers();
      expect(result.ok).toBe(false);
    });
  });
});
