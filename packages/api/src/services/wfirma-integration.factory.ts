import { logger } from '../utils/logger';
import { CredentialsService } from './credentials.service';
import { WFirmaIntegrationService } from './wfirma';
import { wfirmaIntegrationService as defaultWfirmaService } from './wfirma-integration.instance';

/**
 * Factory for creating user-specific WFirmaIntegrationService instances.
 * Caches instances to avoid recreating them for each request.
 */
export class WFirmaServiceFactory {
  private cache = new Map<string, { service: WFirmaIntegrationService; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly credentialsService: CredentialsService) {}

  /**
   * Get WFirmaIntegrationService for a user.
   * Returns user-specific instance if credentials are configured, otherwise returns default.
   */
  async getServiceForUser(userId: string): Promise<WFirmaIntegrationService> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.service;
    }

    // Get user credentials
    const userCreds = await this.credentialsService.getWFirmaCredentials(userId);

    if (userCreds) {
      // Create user-specific instance
      const service = new WFirmaIntegrationService({
        accessKey: userCreds.accessKey,
        secretKey: userCreds.secretKey,
        appKey: userCreds.appKey,
        companyId: userCreds.companyId,
      });

      // Cache the instance
      this.cache.set(userId, {
        service,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      logger.debug('Created user-specific wFirma service', { userId });
      return service;
    }

    // Return default service (uses env vars)
    logger.debug('Using default wFirma service for user', { userId });
    return defaultWfirmaService;
  }

  /**
   * Check if user has configured wFirma credentials
   */
  async hasUserCredentials(userId: string): Promise<boolean> {
    return this.credentialsService.hasWFirmaEnabled(userId);
  }

  /**
   * Invalidate cached service for a user (call when credentials are updated)
   */
  invalidateCache(userId: string): void {
    this.cache.delete(userId);
    logger.debug('Invalidated wFirma service cache', { userId });
  }

  /**
   * Clear all cached services
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Cleared all wFirma service cache');
  }
}
