# WFirma Cache Service

## Overview

The `WFirmaCacheService` provides a caching layer for wFirma API data to optimize performance and reduce API calls. It stores data in the PostgreSQL database with configurable TTL (Time To Live) for different data types.

## Features

- **Configurable TTL per data type**
  - Company data: 24 hours
  - Contractor data: 1 hour
  - Invoice data: 30 minutes
  - Financial data: 6 hours

- **Automatic expiration checking**
- **Cache invalidation support**
- **Statistics and monitoring**
- **Force refresh option**

## Requirements

Validates Requirements:
- **7.2**: Cache wFirma data in local database for performance optimization
- **7.3**: Synchronize changes with wFirma in real-time or by schedule

## Database Schema

```sql
CREATE TABLE wfirma_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_type VARCHAR NOT NULL, -- 'company', 'contractor', 'invoice', 'financial'
  wfirma_id VARCHAR NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, data_type, wfirma_id)
);

CREATE INDEX idx_wfirma_cache_user_type ON wfirma_cache(user_id, data_type);
CREATE INDEX idx_wfirma_cache_expires ON wfirma_cache(expires_at);
CREATE INDEX idx_wfirma_cache_valid ON wfirma_cache(is_valid);
```

## Usage

### Basic Usage

```typescript
import { wfirmaCacheService } from './services/wfirma-cache.instance';

// Cache data
await wfirmaCacheService.cacheData(
  'user-123',
  'company',
  'company-456',
  { name: 'Test Company', nip: '1234567890' }
);

// Get cached data
const data = await wfirmaCacheService.getCachedData(
  'user-123',
  'company',
  'company-456'
);

// Force refresh (skip cache)
const freshData = await wfirmaCacheService.getCachedData(
  'user-123',
  'company',
  'company-456',
  { forceRefresh: true }
);

// Invalidate cache
await wfirmaCacheService.invalidateCache('user-123', 'company', 'company-456');

// Invalidate all contractors
await wfirmaCacheService.invalidateCache('user-123', 'contractor');

// Clean up expired entries
await wfirmaCacheService.cleanupExpiredCache('user-123');

// Get statistics
const stats = await wfirmaCacheService.getCacheStats('user-123');
console.log(stats);
// {
//   totalEntries: 10,
//   validEntries: 7,
//   expiredEntries: 3,
//   byType: {
//     company: 1,
//     contractor: 5,
//     invoice: 1,
//     financial: 0
//   }
// }
```

### Integration with wFirma Service

```typescript
import { wfirmaIntegrationService } from './services/wfirma-integration.instance';
import { wfirmaCacheService } from './services/wfirma-cache.instance';

async function getCompanyDataWithCache(userId: string, forceRefresh = false) {
  // Try cache first
  const cached = await wfirmaCacheService.getCachedData(
    userId,
    'company',
    'main-company',
    { forceRefresh }
  );

  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const data = await wfirmaIntegrationService.getCompanyData();

  // Cache the result
  await wfirmaCacheService.cacheData(
    userId,
    'company',
    'main-company',
    data
  );

  return data;
}
```

### Custom TTL

```typescript
import { WFirmaCacheService } from './services/wfirma-cache.service';
import { prisma } from './lib/prisma';

// Create service with custom TTL
const customCacheService = new WFirmaCacheService(prisma, {
  company: 12 * 60 * 60 * 1000,  // 12 hours
  contractor: 30 * 60 * 1000,     // 30 minutes
});

// Cache with custom TTL for this operation
await customCacheService.cacheData(
  'user-123',
  'company',
  'company-456',
  data,
  { ttl: 5 * 60 * 1000 } // 5 minutes
);
```

## API Reference

### `cacheData<T>(userId, dataType, wfirmaId, data, options?)`

Cache data from wFirma.

**Parameters:**
- `userId` (string): User ID who owns the data
- `dataType` (CacheDataType): Type of data ('company', 'contractor', 'invoice', 'financial')
- `wfirmaId` (string): ID of the object in wFirma
- `data` (T): Data to cache
- `options` (CacheOptions): Optional cache options
  - `ttl` (number): Custom TTL in milliseconds

**Returns:** `Promise<CacheEntry<T>>`

### `getCachedData<T>(userId, dataType, wfirmaId, options?)`

Get cached data with expiration checking.

**Parameters:**
- `userId` (string): User ID who owns the data
- `dataType` (CacheDataType): Type of data
- `wfirmaId` (string): ID of the object in wFirma
- `options` (CacheOptions): Optional cache options
  - `forceRefresh` (boolean): Skip cache and return null

**Returns:** `Promise<T | null>`

### `invalidateCache(userId, dataType, wfirmaId?)`

Invalidate cache for specific entry or all entries of a type.

**Parameters:**
- `userId` (string): User ID who owns the data
- `dataType` (CacheDataType): Type of data
- `wfirmaId` (string, optional): Specific ID to invalidate

**Returns:** `Promise<number>` - Number of entries invalidated

### `invalidateAllCache(userId)`

Invalidate all cache entries for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** `Promise<number>` - Number of entries invalidated

### `cleanupExpiredCache(userId?)`

Clean up expired cache entries.

**Parameters:**
- `userId` (string, optional): User ID to clean up

**Returns:** `Promise<number>` - Number of entries deleted

### `getCacheStats(userId)`

Get cache statistics.

**Parameters:**
- `userId` (string): User ID

**Returns:** `Promise<CacheStats>`

```typescript
interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  byType: Record<CacheDataType, number>;
}
```

### `hasCachedData(userId, dataType, wfirmaId)`

Check if valid cache entry exists.

**Parameters:**
- `userId` (string): User ID
- `dataType` (CacheDataType): Type of data
- `wfirmaId` (string): ID of the object in wFirma

**Returns:** `Promise<boolean>`

## Cache Strategy

### When to Use Cache

✅ **Use cache for:**
- Company data (rarely changes)
- Contractor lists (changes infrequently)
- Financial data (historical data)
- Invoice lists (for display purposes)

❌ **Don't cache:**
- Real-time payment status
- Critical financial operations
- User authentication data

### Cache Invalidation Strategy

1. **Time-based expiration**: Automatic based on TTL
2. **Manual invalidation**: After create/update/delete operations
3. **Force refresh**: User-initiated refresh
4. **Scheduled cleanup**: Periodic cleanup of expired entries

### Best Practices

1. **Always check cache first** before making API calls
2. **Invalidate cache** after mutations (create, update, delete)
3. **Use force refresh** for critical operations
4. **Monitor cache statistics** to optimize TTL values
5. **Schedule cleanup** to prevent database bloat

## Monitoring

### Cache Hit Rate

```typescript
const stats = await wfirmaCacheService.getCacheStats(userId);
const hitRate = stats.validEntries / stats.totalEntries;
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
```

### Cache Size

```typescript
const stats = await wfirmaCacheService.getCacheStats(userId);
console.log(`Total cached entries: ${stats.totalEntries}`);
console.log(`Valid entries: ${stats.validEntries}`);
console.log(`Expired entries: ${stats.expiredEntries}`);
```

### Cleanup Schedule

Set up a cron job to clean up expired entries:

```typescript
import cron from 'node-cron';

// Run cleanup every hour
cron.schedule('0 * * * *', async () => {
  const deleted = await wfirmaCacheService.cleanupExpiredCache();
  console.log(`Cleaned up ${deleted} expired cache entries`);
});
```

## Testing

Run tests:

```bash
npm test -- wfirma-cache.service.test.ts
```

All tests should pass with 100% coverage of core functionality.

## Performance Impact

### Without Cache
- API call latency: ~500-1000ms
- Database queries: 0
- Total time: ~500-1000ms

### With Cache (Hit)
- API call latency: 0ms
- Database queries: 1 (~10-50ms)
- Total time: ~10-50ms

**Performance improvement: 10-100x faster**

## Troubleshooting

### Cache not working

1. Check database connection
2. Verify Prisma schema is up to date
3. Check TTL configuration
4. Verify user ID is correct

### Stale data

1. Use `forceRefresh: true` option
2. Invalidate cache manually
3. Reduce TTL for that data type
4. Check expiration logic

### High memory usage

1. Run cleanup regularly
2. Reduce TTL values
3. Limit cache size per user
4. Monitor cache statistics

## Future Enhancements

- [ ] Redis integration for faster access
- [ ] Cache warming on user login
- [ ] Automatic cache preloading
- [ ] Cache compression for large data
- [ ] Cache versioning for schema changes
- [ ] Distributed cache for multi-instance deployments
