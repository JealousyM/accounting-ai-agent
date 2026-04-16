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

/**
 * Extract base64-encoded declaration XML from wFirma API response.
 * wFirma wraps the actual declaration in: <api><declaration_body_*><declaration_xml>BASE64</declaration_xml>...
 */
function extractDeclarationXml(responseXml: string): string {
  // Check for API error
  if (responseXml.includes('<code>ERROR</code>')) {
    const msgMatch = responseXml.match(/<message>(.*?)<\/message>/);
    throw new WFirmaError('WFIRMA_API_ERROR', msgMatch?.[1] || 'Unknown wFirma error');
  }

  const match = responseXml.match(/<declaration_xml>([\s\S]*?)<\/declaration_xml>/);
  if (!match?.[1]) {
    logger.error('Could not find <declaration_xml> in wFirma response', {
      preview: responseXml.substring(0, 300),
    });
    throw new WFirmaError('WFIRMA_API_ERROR', 'Unexpected response format — no declaration_xml found');
  }

  const decoded = Buffer.from(match[1].trim(), 'base64').toString('utf-8');
  if (!decoded.includes('<?xml')) {
    logger.error('Decoded declaration_xml is not valid XML', {
      preview: decoded.substring(0, 200),
    });
    throw new WFirmaError('WFIRMA_API_ERROR', 'Decoded declaration is not valid XML');
  }

  return decoded;
}

export class WFirmaDeclarationService {
  constructor(private readonly client: WFirmaClient) {}

  async getJpkVat(params: JpkVatParams): Promise<DeclarationResult> {
    logger.info('Fetching JPK VAT declaration', { params });

    return this.client.withRetry(async () => {
      try {
        if (!params.year || !params.month) {
          throw new WFirmaValidationError('Year and month are required for JPK VAT declaration');
        }
        if (params.month < 1 || params.month > 12) {
          throw new WFirmaValidationError('Month must be between 1 and 12');
        }
        if (params.year < 1970 || params.year > 2030) {
          throw new WFirmaValidationError('Year must be between 1970 and 2030');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/declaration_body_jpkvat/get/${params.year}/${params.month}`,
          params: {
            outputFormat: 'xml',
            inputFormat: 'xml',
            company_id: this.client.config.companyId,
          },
          responseType: 'text',
        });

        const xml = extractDeclarationXml(response.data as string);
        const filename = `JPK_VAT_${params.year}_${String(params.month).padStart(2, '0')}.xml`;

        logger.info('Successfully fetched JPK VAT declaration', {
          year: params.year,
          month: params.month,
          filename,
          size: xml.length,
        });

        return { xml, filename, type: 'jpk_vat', generatedAt: new Date() };
      } catch (error) {
        logger.error('Failed to fetch JPK VAT declaration', { error, params });
        throw error;
      }
    });
  }

  async getPit(params: PitParams): Promise<DeclarationResult> {
    logger.info('Fetching PIT declaration', { params });

    return this.client.withRetry(async () => {
      try {
        if (!params.year || !params.type) {
          throw new WFirmaValidationError('Year and type are required for PIT declaration');
        }
        const validTypes = ['pit36', 'pit36l', 'pit28'];
        if (!validTypes.includes(params.type)) {
          throw new WFirmaValidationError(`Type must be one of: ${validTypes.join(', ')}`);
        }
        if (params.year < 1970 || params.year > 2030) {
          throw new WFirmaValidationError('Year must be between 1970 and 2030');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/declaration_body_pit/get/${params.type}/${params.year}`,
          params: {
            outputFormat: 'xml',
            inputFormat: 'xml',
            company_id: this.client.config.companyId,
          },
          responseType: 'text',
        });

        const xml = extractDeclarationXml(response.data as string);
        const filename = `PIT_${params.type.toUpperCase()}_${params.year}.xml`;

        logger.info('Successfully fetched PIT declaration', {
          year: params.year,
          type: params.type,
          filename,
          size: xml.length,
        });

        return { xml, filename, type: 'pit', generatedAt: new Date() };
      } catch (error) {
        logger.error('Failed to fetch PIT declaration', { error, params });
        throw error;
      }
    });
  }
}
