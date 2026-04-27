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
});
