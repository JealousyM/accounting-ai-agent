import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CacheDataType,
  CacheEntry,
  CacheOptions,
  DEFAULT_TTL_CONFIG,
  CacheStats,
} from '../types/cache.types';

/**
 * WFirmaCacheService
 * 
 * Manages caching of wFirma data in the local database for performance optimization.
 * 
 * Features:
 * - Configurable TTL per data type (company: 24h, contractor: 1h, invoice: 30m, financial: 6h)
 * - Automatic expiration checking
 * - Cache invalidation support
 * - Statistics and monitoring
 * 
 * Requirements: 7.2, 7.3
 */
export class WFirmaCacheService {
  private readonly prisma: PrismaClient;
  private readonly ttlConfig: Record<CacheDataType, number>;

  constructor(prisma?: PrismaClient, customTtlConfig?: Partial<Record<CacheDataType, number>>) {
    this.prisma = prisma || new PrismaClient();
    this.ttlConfig = {
      ...DEFAULT_TTL_CONFIG,
      ...customTtlConfig,
    };

    logger.info('WFirmaCacheService initialized', {
      ttlConfig: this.ttlConfig,
    });
  }

  /**
   * Cache data from wFirma
   * 
   * @param userId - User ID who owns the data
   * @param dataType - Type of data being cached
   * @param wfirmaId - ID of the object in wFirma
   * @param data - Data to cache
   * @param options - Cache options (custom TTL, etc.)
   * @returns The cached entry
   */
  async cacheData<T = any>(
    userId: string,
    dataType: CacheDataType,
    wfirmaId: string,
    data: T,
    options?: CacheOptions
  ): Promise<CacheEntry<T>> {
    logger.debug('Caching wFirma data', {
      userId,
      dataType,
      wfirmaId,
      hasData: !!data,
    });

    try {
      // Calculate expiration time
      const ttl = options?.ttl || this.ttlConfig[dataType];
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      // Upsert cache entry
      await this.prisma.$executeRaw`
        INSERT INTO wfirma_cache (id, "userId", "dataType", "wfirmaId", data, "cachedAt", "expiresAt", "isValid")
        VALUES (gen_random_uuid(), ${userId}::uuid, ${dataType}, ${wfirmaId}, ${JSON.stringify(data)}::jsonb, ${now}, ${expiresAt}, true)
        ON CONFLICT ("userId", "dataType", "wfirmaId")
        DO UPDATE SET
          data = ${JSON.stringify(data)}::jsonb,
          "cachedAt" = ${now},
          "expiresAt" = ${expiresAt},
          "isValid" = true
      `;

      logger.info('Successfully cached wFirma data', {
        userId,
        dataType,
        wfirmaId,
        expiresAt,
      });

      return {
        dataType,
        wfirmaId,
        data,
        cachedAt: now,
        expiresAt,
        isValid: true,
      };
    } catch (error) {
      logger.error('Failed to cache wFirma data', {
        userId,
        dataType,
        wfirmaId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get cached data with expiration checking
   *
   * @param userId - User ID who owns the data
   * @param dataType - Type of data to retrieve
   * @param wfirmaId - ID of the object in wFirma
   * @param options - Cache options
   * @returns The cached data, or null if not found/expired/error
   */
  async getCachedData<T = any>(
    userId: string,
    dataType: CacheDataType,
    wfirmaId: string,
    options?: CacheOptions
  ): Promise<T | null> {
    logger.debug('Retrieving cached wFirma data', {
      userId,
      dataType,
      wfirmaId,
      forceRefresh: options?.forceRefresh,
    });

    try {
      // If force refresh is requested, skip cache
      if (options?.forceRefresh) {
        logger.debug('Force refresh requested, skipping cache', {
          userId,
          dataType,
          wfirmaId,
        });
        return null;
      }

      // Query cache entry
      const result = await this.prisma.$queryRaw<Array<{
        data: any;
        cachedAt: Date;
        expiresAt: Date;
        isValid: boolean;
      }>>`
        SELECT data, "cachedAt", "expiresAt", "isValid"
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND "dataType" = ${dataType}
          AND "wfirmaId" = ${wfirmaId}
          AND "isValid" = true
        LIMIT 1
      `;

      if (!result || result.length === 0) {
        logger.debug('Cache miss - no entry found', {
          userId,
          dataType,
          wfirmaId,
        });
        return null;
      }

      const entry = result[0];
      const now = new Date();

      // Check if entry is expired
      if (entry.expiresAt <= now) {
        logger.debug('Cache miss - entry expired', {
          userId,
          dataType,
          wfirmaId,
          expiresAt: entry.expiresAt,
          now,
        });

        // Mark as invalid
        await this.invalidateCache(userId, dataType, wfirmaId);
        return null;
      }

      logger.info('Cache hit - returning cached data', {
        userId,
        dataType,
        wfirmaId,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
      });

      return entry.data as T;
    } catch (error) {
      logger.error('Failed to retrieve cached data', {
        userId,
        dataType,
        wfirmaId,
        error,
      });
      // Return null on error to allow fallback to API
      return null;
    }
  }

  /**
   * Invalidate cache for specific entry or all entries of a type
   * 
   * @param userId - User ID who owns the data
   * @param dataType - Type of data to invalidate
   * @param wfirmaId - Optional specific ID to invalidate (if not provided, invalidates all of type)
   * @returns Number of entries invalidated
   */
  async invalidateCache(
    userId: string,
    dataType: CacheDataType,
    wfirmaId?: string
  ): Promise<number> {
    logger.info('Invalidating cache', {
      userId,
      dataType,
      wfirmaId,
    });

    try {
      let count: number;

      if (wfirmaId) {
        // Invalidate specific entry
        count = await this.prisma.$executeRaw`
          UPDATE wfirma_cache
          SET "isValid" = false
          WHERE "userId" = ${userId}::uuid
            AND "dataType" = ${dataType}
            AND "wfirmaId" = ${wfirmaId}
        `;
      } else {
        // Invalidate all entries of this type
        count = await this.prisma.$executeRaw`
          UPDATE wfirma_cache
          SET "isValid" = false
          WHERE "userId" = ${userId}::uuid
            AND "dataType" = ${dataType}
        `;
      }

      logger.info('Successfully invalidated cache', {
        userId,
        dataType,
        wfirmaId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Failed to invalidate cache', {
        userId,
        dataType,
        wfirmaId,
        error,
      });
      throw error;
    }
  }

  /**
   * Invalidate all cache entries for a user
   * 
   * @param userId - User ID
   * @returns Number of entries invalidated
   */
  async invalidateAllCache(userId: string): Promise<number> {
    logger.info('Invalidating all cache for user', { userId });

    try {
      const count = await this.prisma.$executeRaw`
        UPDATE wfirma_cache
        SET "isValid" = false
        WHERE "userId" = ${userId}::uuid
      `;

      logger.info('Successfully invalidated all cache', {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Failed to invalidate all cache', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   *
   * @param userId - Optional user ID to clean up (if not provided, cleans all users)
   * @returns Number of entries deleted
   */
  async cleanupExpiredCache(userId?: string): Promise<number> {
    logger.info('Cleaning up expired cache', { userId });

    try {
      const now = new Date();
      let count: number;

      if (userId) {
        count = await this.prisma.$executeRaw`
          DELETE FROM wfirma_cache
          WHERE "userId" = ${userId}::uuid
            AND ("expiresAt" < ${now} OR "isValid" = false)
        `;
      } else {
        count = await this.prisma.$executeRaw`
          DELETE FROM wfirma_cache
          WHERE "expiresAt" < ${now} OR "isValid" = false
        `;
      }

      logger.info('Successfully cleaned up expired cache', {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Failed to clean up expired cache', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get cache statistics
   *
   * @param userId - User ID
   * @returns Cache statistics
   */
  async getCacheStats(userId: string): Promise<CacheStats> {
    logger.debug('Getting cache statistics', { userId });

    try {
      const now = new Date();

      // Get total entries
      const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
      `;
      const totalEntries = Number(totalResult[0]?.count || 0);

      // Get valid entries
      const validResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND "isValid" = true
          AND "expiresAt" >= ${now}
      `;
      const validEntries = Number(validResult[0]?.count || 0);

      // Get expired entries
      const expiredResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND ("isValid" = false OR "expiresAt" < ${now})
      `;
      const expiredEntries = Number(expiredResult[0]?.count || 0);

      // Get counts by type
      const byTypeResult = await this.prisma.$queryRaw<Array<{
        dataType: CacheDataType;
        count: bigint;
      }>>`
        SELECT "dataType", COUNT(*) as count
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND "isValid" = true
          AND "expiresAt" >= ${now}
        GROUP BY "dataType"
      `;

      const byType: Record<CacheDataType, number> = {
        company: 0,
        contractor: 0,
        invoice: 0,
        financial: 0,
        user: 0,
        user_company: 0,
        payment: 0,
        expense: 0,
        vehicle: 0,
        term: 0,
        term_group: 0,
        document: 0,
      };

      byTypeResult.forEach((row) => {
        const dataType = row.dataType as CacheDataType;
        if (dataType in byType) {
          byType[dataType] = Number(row.count);
        }
      });

      const stats: CacheStats = {
        totalEntries,
        validEntries,
        expiredEntries,
        byType,
      };

      logger.debug('Cache statistics retrieved', {
        userId,
        stats,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get cache statistics', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Check if cache entry exists and is valid
   * 
   * @param userId - User ID
   * @param dataType - Type of data
   * @param wfirmaId - ID of the object in wFirma
   * @returns True if valid cache entry exists
   */
  async hasCachedData(
    userId: string,
    dataType: CacheDataType,
    wfirmaId: string
  ): Promise<boolean> {
    try {
      const now = new Date();

      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND "dataType" = ${dataType}
          AND "wfirmaId" = ${wfirmaId}
          AND "isValid" = true
          AND "expiresAt" >= ${now}
      `;

      return Number(result[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Failed to check cached data', {
        userId,
        dataType,
        wfirmaId,
        error,
      });
      return false;
    }
  }
}
