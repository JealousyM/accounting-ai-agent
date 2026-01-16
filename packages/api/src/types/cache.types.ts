/**
 * Cache Types for wFirma Data
 */

// ============================================
// CACHE DATA TYPES
// ============================================

export type CacheDataType = 'company' | 'contractor' | 'invoice' | 'financial';

export interface CacheEntry<T = any> {
  dataType: CacheDataType;
  wfirmaId: string;
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
}

// ============================================
// TTL CONFIGURATION
// ============================================

export const DEFAULT_TTL_CONFIG: Record<CacheDataType, number> = {
  company: 24 * 60 * 60 * 1000,    // 24 hours
  contractor: 1 * 60 * 60 * 1000,  // 1 hour
  invoice: 30 * 60 * 1000,         // 30 minutes
  financial: 6 * 60 * 60 * 1000,   // 6 hours
};

// ============================================
// CACHE STATISTICS
// ============================================

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  byType: Record<CacheDataType, number>;
}
