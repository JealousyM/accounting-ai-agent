/**
 * wFirma Declaration Service
 * Handles JPK VAT and PIT declaration operations
 */

import { logger } from '../../utils/logger';
import {
  JpkVatParams,
  PitParams,
  DeclarationResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaDeclarationService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get JPK VAT declaration XML
   * @param params - Year and month for the declaration
   * @returns Declaration result with XML content
   */
  async getJpkVat(params: JpkVatParams): Promise<DeclarationResult> {
    logger.info('Fetching JPK VAT declaration', { params });

    return this.client.withRetry(async () => {
      try {
        // Validation
        if (!params.year || !params.month) {
          throw new WFirmaValidationError(
            'Year and month are required for JPK VAT declaration'
          );
        }

        if (params.month < 1 || params.month > 12) {
          throw new WFirmaValidationError(
            'Month must be between 1 and 12'
          );
        }

        if (params.year < 2020 || params.year > 2030) {
          throw new WFirmaValidationError(
            'Year must be between 2020 and 2030'
          );
        }

        // API call
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/declaration_body_jpkvat/get',
          params: {
            ...this.client.buildQueryParams(),
            year: params.year,
            month: params.month,
          },
        });

        const xml = response.data;

        // Validate XML response
        if (typeof xml !== 'string' || !xml.includes('<?xml')) {
          logger.error('Invalid XML response from wFirma JPK VAT', {
            responseType: typeof xml,
            preview: xml?.substring?.(0, 100),
          });
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Invalid XML response from wFirma - expected XML string'
          );
        }

        const filename = `JPK_VAT_${params.year}_${String(params.month).padStart(2, '0')}.xml`;

        logger.info('Successfully fetched JPK VAT declaration', {
          year: params.year,
          month: params.month,
          filename,
          size: xml.length,
        });

        return {
          xml,
          filename,
          type: 'jpk_vat',
          generatedAt: new Date(),
        };
      } catch (error) {
        logger.error('Failed to fetch JPK VAT declaration', {
          error,
          params,
        });
        throw error;
      }
    });
  }

  /**
   * Get PIT declaration XML
   * @param params - Year and type (pit36, pit36l, pit28)
   * @returns Declaration result with XML content
   */
  async getPit(params: PitParams): Promise<DeclarationResult> {
    logger.info('Fetching PIT declaration', { params });

    return this.client.withRetry(async () => {
      try {
        // Validation
        if (!params.year || !params.type) {
          throw new WFirmaValidationError(
            'Year and type are required for PIT declaration'
          );
        }

        const validTypes = ['pit36', 'pit36l', 'pit28'];
        if (!validTypes.includes(params.type)) {
          throw new WFirmaValidationError(
            `Type must be one of: ${validTypes.join(', ')}`
          );
        }

        if (params.year < 2020 || params.year > 2030) {
          throw new WFirmaValidationError(
            'Year must be between 2020 and 2030'
          );
        }

        // API call
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/declaration_body_pit/get',
          params: {
            ...this.client.buildQueryParams(),
            type: params.type,
            year: params.year,
          },
        });

        const xml = response.data;

        // Validate XML response
        if (typeof xml !== 'string' || !xml.includes('<?xml')) {
          logger.error('Invalid XML response from wFirma PIT', {
            responseType: typeof xml,
            preview: xml?.substring?.(0, 100),
          });
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Invalid XML response from wFirma - expected XML string'
          );
        }

        const filename = `PIT_${params.type.toUpperCase()}_${params.year}.xml`;

        logger.info('Successfully fetched PIT declaration', {
          year: params.year,
          type: params.type,
          filename,
          size: xml.length,
        });

        return {
          xml,
          filename,
          type: 'pit',
          generatedAt: new Date(),
        };
      } catch (error) {
        logger.error('Failed to fetch PIT declaration', { error, params });
        throw error;
      }
    });
  }
}
