/**
 * Example: Using WFirmaIntegrationService with WFirmaCacheService
 * 
 * This example demonstrates how to integrate the cache layer with wFirma API calls
 * to optimize performance and reduce API calls.
 */

import { WFirmaIntegrationService } from './wfirma-integration.service';
import { WFirmaCacheService } from './wfirma-cache.service';
import { prisma } from '../lib/prisma';
import { WFirmaCompany, WFirmaContractor } from '../types/wfirma.types';

export class WFirmaIntegrationWithCache {
  private readonly wfirmaService: WFirmaIntegrationService;
  private readonly cacheService: WFirmaCacheService;

  constructor() {
    this.wfirmaService = new WFirmaIntegrationService();
    this.cacheService = new WFirmaCacheService(prisma);
  }

  /**
   * Get company data with caching
   * 
   * First checks cache, if not found or expired, fetches from wFirma API
   * and caches the result.
   */
  async getCompanyData(userId: string, forceRefresh = false): Promise<WFirmaCompany> {
    const cacheKey = 'main-company';

    // Try to get from cache first
    const cachedData = await this.cacheService.getCachedData<WFirmaCompany>(
      userId,
      'company',
      cacheKey,
      { forceRefresh }
    );

    if (cachedData) {
      return cachedData;
    }

    // Cache miss - fetch from wFirma API
    const companyData = await this.wfirmaService.getCompanyData();

    // Cache the result
    await this.cacheService.cacheData(
      userId,
      'company',
      cacheKey,
      companyData
    );

    return companyData;
  }

  /**
   * Get contractors with caching
   * 
   * Caches each contractor individually for better granularity
   */
  async getContractors(userId: string, forceRefresh = false): Promise<WFirmaContractor[]> {
    const cacheKey = 'all-contractors';

    // Try to get from cache first
    const cachedData = await this.cacheService.getCachedData<WFirmaContractor[]>(
      userId,
      'contractor',
      cacheKey,
      { forceRefresh }
    );

    if (cachedData) {
      return cachedData;
    }

    // Cache miss - fetch from wFirma API
    const contractors = await this.wfirmaService.getContractors();

    // Cache the result
    await this.cacheService.cacheData(
      userId,
      'contractor',
      cacheKey,
      contractors
    );

    // Also cache individual contractors
    for (const contractor of contractors) {
      await this.cacheService.cacheData(
        userId,
        'contractor',
        contractor.id,
        contractor
      );
    }

    return contractors;
  }

  /**
   * Get specific contractor with caching
   */
  async getContractor(userId: string, contractorId: string, forceRefresh = false): Promise<WFirmaContractor | null> {
    // Try to get from cache first
    const cachedData = await this.cacheService.getCachedData<WFirmaContractor>(
      userId,
      'contractor',
      contractorId,
      { forceRefresh }
    );

    if (cachedData) {
      return cachedData;
    }

    // Cache miss - fetch all contractors and find the one we need
    const contractors = await this.getContractors(userId, forceRefresh);
    return contractors.find(c => c.id === contractorId) || null;
  }

  /**
   * Create contractor and invalidate cache
   */
  async createContractor(userId: string, data: any): Promise<WFirmaContractor> {
    // Create in wFirma
    const contractor = await this.wfirmaService.createContractor(data);

    // Invalidate contractors cache to force refresh on next request
    await this.cacheService.invalidateCache(userId, 'contractor');

    // Cache the new contractor
    await this.cacheService.cacheData(
      userId,
      'contractor',
      contractor.id,
      contractor
    );

    return contractor;
  }

  /**
   * Get financial data with caching
   */
  async getFinancialData(userId: string, year: number, forceRefresh = false) {
    const cacheKey = `financial-${year}`;

    // Try to get from cache first
    const cachedData = await this.cacheService.getCachedData(
      userId,
      'financial',
      cacheKey,
      { forceRefresh }
    );

    if (cachedData) {
      return cachedData;
    }

    // Cache miss - fetch from wFirma API
    const financialData = await this.wfirmaService.getFinancialData(year);

    // Cache the result
    await this.cacheService.cacheData(
      userId,
      'financial',
      cacheKey,
      financialData
    );

    return financialData;
  }

  /**
   * Sync all data from wFirma and update cache
   */
  async syncAllData(userId: string) {
    // Invalidate all cache first
    await this.cacheService.invalidateAllCache(userId);

    // Sync and cache company data
    const company = await this.getCompanyData(userId, true);

    // Sync and cache contractors
    const contractors = await this.getContractors(userId, true);

    // Sync and cache financial data for current year
    const currentYear = new Date().getFullYear();
    const financial = await this.getFinancialData(userId, currentYear, true);

    return {
      company,
      contractors,
      financial,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(userId: string) {
    return this.cacheService.getCacheStats(userId);
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(userId: string) {
    return this.cacheService.cleanupExpiredCache(userId);
  }
}

// Example usage:
/*
const service = new WFirmaIntegrationWithCache();

// Get company data (will use cache if available)
const company = await service.getCompanyData('user-123');

// Force refresh from API
const freshCompany = await service.getCompanyData('user-123', true);

// Get contractors with caching
const contractors = await service.getContractors('user-123');

// Create new contractor (invalidates cache)
const newContractor = await service.createContractor('user-123', {
  name: 'New Contractor',
  nip: '1234567890',
});

// Sync all data
await service.syncAllData('user-123');

// Get cache statistics
const stats = await service.getCacheStats('user-123');
console.log('Cache stats:', stats);

// Clean up expired entries
await service.cleanupCache('user-123');
*/
