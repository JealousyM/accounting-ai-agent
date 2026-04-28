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

    it('checkOpenAI returns ok=true with "not configured" when env missing, makes NO request', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await service['checkOpenAI']();
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

  describe('checkWfirma', () => {
    const fetchMock = jest.fn();
    beforeAll(() => { (global as any).fetch = fetchMock; });
    beforeEach(() => fetchMock.mockReset());

    it('returns ok=true with "not configured" when WFIRMA_HEALTH_* missing', async () => {
      delete process.env.WFIRMA_HEALTH_API_KEY;
      delete process.env.WFIRMA_HEALTH_COMPANY_ID;
      const result = await service['checkWfirma']();
      expect(result.ok).toBe(true);
      expect(result.error).toBe('not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns ok=true on 2xx response', async () => {
      process.env.WFIRMA_HEALTH_API_KEY = 'k';
      process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
      fetchMock.mockResolvedValueOnce({ ok: true } as Response);
      const result = await service['checkWfirma']();
      expect(result.ok).toBe(true);
    });

    it('returns ok=false on network error', async () => {
      process.env.WFIRMA_HEALTH_API_KEY = 'k';
      process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
      fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND'));
      const result = await service['checkWfirma']();
      expect(result.ok).toBe(false);
    });
  });

  describe('getSnapshot', () => {
    const fetchMock = jest.fn();
    beforeAll(() => { (global as any).fetch = fetchMock; });
    beforeEach(() => {
      fetchMock.mockReset();
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.WFIRMA_HEALTH_API_KEY = 'k';
      process.env.WFIRMA_HEALTH_COMPANY_ID = 'c';
      fetchMock.mockResolvedValue({ ok: true } as Response);
      mockedPrisma.$queryRaw.mockResolvedValue([]);
      mockedRedis.ping.mockResolvedValue('PONG');
    });

    it('returns status=ok when everything works', async () => {
      const snap = await service.getSnapshot();
      expect(snap.status).toBe('ok');
      expect(snap.checks.db.ok).toBe(true);
      expect(snap.checks.redis.ok).toBe(true);
      expect(snap.integrations.wfirma.ok).toBe(true);
    });

    it('returns status=down when DB fails', async () => {
      mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
      const snap = await service.getSnapshot();
      expect(snap.status).toBe('down');
    });

    it('returns status=down when Redis fails', async () => {
      mockedRedis.ping.mockRejectedValueOnce(new Error('boom'));
      const snap = await service.getSnapshot();
      expect(snap.status).toBe('down');
    });

    it('returns status=degraded when only an integration fails', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response); // wfirma fails
      const snap = await service.getSnapshot();
      expect(snap.status).toBe('degraded');
      expect(snap.integrations.wfirma.ok).toBe(false);
    });

    it('caches integrations for 5 minutes (does not re-probe)', async () => {
      await service.getSnapshot();
      fetchMock.mockClear();
      await service.getSnapshot();
      expect(fetchMock).not.toHaveBeenCalled(); // served from cache
    });

    it('serves stale integration data when cache expired and refreshes in background', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
      await service.getSnapshot();
      fetchMock.mockClear();
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 min
      fetchMock.mockResolvedValue({ ok: true } as Response);
      await service.getSnapshot();
      // Stale-while-revalidate: returns immediately with old data, background refresh started
      // Verify a refresh request fired (not blocking)
      await new Promise(r => setImmediate(r));
      expect(fetchMock).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('skips integrations entirely when skipIntegrations=true', async () => {
      fetchMock.mockClear();
      const fresh = new HealthService();
      await fresh.getSnapshot({ skipIntegrations: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uptimeSeconds is non-negative', async () => {
      const snap = await service.getSnapshot();
      expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('production mode strips error messages from CheckResult', async () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const fresh = new HealthService(); // avoid cache contamination from prior tests in this describe
      mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error('secret stack trace'));
      const snap = await fresh.getSnapshot({ skipIntegrations: true });
      expect(snap.checks.db.error).toBeUndefined();
      expect(snap.checks.db.ok).toBe(false);
      process.env.NODE_ENV = oldEnv;
    });
  });
});
