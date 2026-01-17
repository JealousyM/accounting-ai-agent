import { PrismaClient } from '@prisma/client';
import { WFirmaCacheService } from '../wfirma-cache.service';
import { CacheDataType } from '../../types/cache.types';

// Mock Prisma
const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

describe('WFirmaCacheService', () => {
  let cacheService: WFirmaCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new WFirmaCacheService(mockPrisma);
  });

  describe('cacheData', () => {
    it('should cache data with correct TTL for company type', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';
      const data = { name: 'Test Company', nip: '1234567890' };

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.cacheData(userId, dataType, wfirmaId, data);

      expect(result.dataType).toBe(dataType);
      expect(result.wfirmaId).toBe(wfirmaId);
      expect(result.data).toEqual(data);
      expect(result.isValid).toBe(true);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should cache data with custom TTL', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'contractor';
      const wfirmaId = 'contractor-789';
      const data = { name: 'Test Contractor' };
      const customTtl = 5000; // 5 seconds

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.cacheData(
        userId,
        dataType,
        wfirmaId,
        data,
        { ttl: customTtl }
      );

      expect(result.expiresAt.getTime() - result.cachedAt.getTime()).toBe(customTtl);
    });

    it('should handle caching errors', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';
      const data = { name: 'Test Company' };

      (mockPrisma.$executeRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        cacheService.cacheData(userId, dataType, wfirmaId, data)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getCachedData', () => {
    it('should return cached data if valid and not expired', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';
      const cachedData = { name: 'Test Company', nip: '1234567890' };
      const futureDate = new Date(Date.now() + 10000);

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          data: cachedData,
          cachedAt: new Date(),
          expiresAt: futureDate,
          isValid: true,
        },
      ]);

      const result = await cacheService.getCachedData(userId, dataType, wfirmaId);

      expect(result).toEqual(cachedData);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return null if cache entry not found', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await cacheService.getCachedData(userId, dataType, wfirmaId);

      expect(result).toBeNull();
    });

    it('should return null and invalidate if cache entry expired', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';
      const cachedData = { name: 'Test Company' };
      const pastDate = new Date(Date.now() - 10000);

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          data: cachedData,
          cachedAt: new Date(Date.now() - 20000),
          expiresAt: pastDate,
          isValid: true,
        },
      ]);
      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.getCachedData(userId, dataType, wfirmaId);

      expect(result).toBeNull();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled(); // invalidateCache called
    });

    it('should return null if forceRefresh is true', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      const result = await cacheService.getCachedData(
        userId,
        dataType,
        wfirmaId,
        { forceRefresh: true }
      );

      expect(result).toBeNull();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return null on database error', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await cacheService.getCachedData(userId, dataType, wfirmaId);

      expect(result).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate specific cache entry', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const count = await cacheService.invalidateCache(userId, dataType, wfirmaId);

      expect(count).toBe(1);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should invalidate all entries of a type if wfirmaId not provided', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'contractor';

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(5);

      const count = await cacheService.invalidateCache(userId, dataType);

      expect(count).toBe(5);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle invalidation errors', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$executeRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        cacheService.invalidateCache(userId, dataType, wfirmaId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('invalidateAllCache', () => {
    it('should invalidate all cache entries for a user', async () => {
      const userId = 'user-123';

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(10);

      const count = await cacheService.invalidateAllCache(userId);

      expect(count).toBe(10);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should clean up expired entries for specific user', async () => {
      const userId = 'user-123';

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(3);

      const count = await cacheService.cleanupExpiredCache(userId);

      expect(count).toBe(3);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should clean up expired entries for all users', async () => {
      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(15);

      const count = await cacheService.cleanupExpiredCache();

      expect(count).toBe(15);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const userId = 'user-123';

      (mockPrisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ count: BigInt(10) }]) // total
        .mockResolvedValueOnce([{ count: BigInt(7) }])  // valid
        .mockResolvedValueOnce([{ count: BigInt(3) }])  // expired
        .mockResolvedValueOnce([                        // by type
          { dataType: 'company', count: BigInt(1) },
          { dataType: 'contractor', count: BigInt(5) },
          { dataType: 'invoice', count: BigInt(1) },
        ]);

      const stats = await cacheService.getCacheStats(userId);

      expect(stats.totalEntries).toBe(10);
      expect(stats.validEntries).toBe(7);
      expect(stats.expiredEntries).toBe(3);
      expect(stats.byType.company).toBe(1);
      expect(stats.byType.contractor).toBe(5);
      expect(stats.byType.invoice).toBe(1);
      expect(stats.byType.financial).toBe(0);
    });
  });

  describe('hasCachedData', () => {
    it('should return true if valid cache entry exists', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(1) }]);

      const result = await cacheService.hasCachedData(userId, dataType, wfirmaId);

      expect(result).toBe(true);
    });

    it('should return false if no valid cache entry exists', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

      const result = await cacheService.hasCachedData(userId, dataType, wfirmaId);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';

      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await cacheService.hasCachedData(userId, dataType, wfirmaId);

      expect(result).toBe(false);
    });
  });

  describe('TTL Configuration', () => {
    it('should use default TTL for company (24 hours)', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'company';
      const wfirmaId = 'company-456';
      const data = { name: 'Test Company' };

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.cacheData(userId, dataType, wfirmaId, data);

      const expectedTtl = 24 * 60 * 60 * 1000; // 24 hours in ms
      const actualTtl = result.expiresAt.getTime() - result.cachedAt.getTime();

      expect(actualTtl).toBe(expectedTtl);
    });

    it('should use default TTL for contractor (1 hour)', async () => {
      const userId = 'user-123';
      const dataType: CacheDataType = 'contractor';
      const wfirmaId = 'contractor-789';
      const data = { name: 'Test Contractor' };

      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const result = await cacheService.cacheData(userId, dataType, wfirmaId, data);

      const expectedTtl = 1 * 60 * 60 * 1000; // 1 hour in ms
      const actualTtl = result.expiresAt.getTime() - result.cachedAt.getTime();

      expect(actualTtl).toBe(expectedTtl);
    });

    it('should allow custom TTL configuration', () => {
      const customTtl = {
        company: 1000,
        contractor: 2000,
      };

      const customCacheService = new WFirmaCacheService(mockPrisma, customTtl);

      expect(customCacheService).toBeDefined();
    });
  });
});
