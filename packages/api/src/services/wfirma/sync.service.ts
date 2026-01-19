/**
 * wFirma Sync Service
 * Handles data synchronization and connection checking
 */

import { logger } from '../../utils/logger';
import { SyncResult } from '../../types/wfirma.types';
import { WFirmaCompanyService } from './company.service';
import { WFirmaContractorService } from './contractor.service';
import { WFirmaFinancialService } from './financial.service';

export class WFirmaSyncService {
  constructor(
    private readonly companyService: WFirmaCompanyService,
    private readonly contractorService: WFirmaContractorService,
    private readonly financialService: WFirmaFinancialService
  ) {}

  /**
   * Sync data from wFirma to local cache
   */
  async syncDataFromWFirma(): Promise<SyncResult> {
    logger.info('Starting data synchronization from wFirma');

    const startTime = Date.now();
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      // Sync company data
      try {
        await this.companyService.getCompanyData();
        itemsSynced++;
      } catch (error) {
        const errorMessage = `Failed to sync company data: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      // Sync contractors
      try {
        const contractors = await this.contractorService.getContractors();
        itemsSynced += contractors.length;
      } catch (error) {
        const errorMessage = `Failed to sync contractors: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      // Sync financial data for current year
      try {
        const currentYear = new Date().getFullYear();
        await this.financialService.getFinancialData(currentYear);
        itemsSynced++;
      } catch (error) {
        const errorMessage = `Failed to sync financial data: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      logger.info('Data synchronization completed', {
        success,
        itemsSynced,
        duration,
        errors: errors.length,
      });

      return {
        success,
        syncedAt: new Date(),
        itemsSynced,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Data synchronization failed', { error });
      return {
        success: false,
        syncedAt: new Date(),
        itemsSynced,
        errors: [...errors, (error as Error).message],
      };
    }
  }

  /**
   * Check connection to wFirma API
   */
  async checkConnection(): Promise<boolean> {
    logger.info('Checking connection to wFirma API');

    try {
      await this.companyService.getCompanyData();

      logger.info('wFirma API connection check', { isConnected: true });
      return true;
    } catch (error) {
      logger.error('wFirma API connection check failed', { error });
      return false;
    }
  }
}
