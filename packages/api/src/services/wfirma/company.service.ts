/**
 * wFirma Company Service
 * Handles company data operations
 */

import { logger } from '../../utils/logger';
import { WFirmaCompany } from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError } from './errors';

export class WFirmaCompanyService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get company data from wFirma
   */
  async getCompanyData(): Promise<WFirmaCompany> {
    logger.info('Fetching company data from wFirma');

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            companies: {
              parameters: {
                limit: 1,
                page: 1,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/companies/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company data',
            data.status
          );
        }

        // Extract company data from response
        let companyData = data.companies?.company;

        if (!companyData && data.companies?.['0']?.company) {
          companyData = data.companies['0'].company;
        }

        if (!companyData && Array.isArray(data.companies?.company)) {
          companyData = data.companies.company[0];
        }

        if (!companyData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No company data in response',
            data
          );
        }

        const company: WFirmaCompany = {
          id: companyData.id || companyData.company_id || this.client.config.companyId || '',
          name: companyData.name || '',
          nip: companyData.nip || '',
          regon: companyData.regon,
          krs: companyData.krs,
          address: {
            street: companyData.street || '',
            city: companyData.city || companyData.post || '',
            zip: companyData.zip || '',
            country: companyData.country || 'PL',
          },
          bankAccounts: companyData.account ? [{
            accountNumber: companyData.account,
            bankName: companyData.bank || '',
          }] : [],
          email: companyData.email,
          phone: companyData.phone,
          website: companyData.www,
        };

        logger.info('Successfully fetched company data from wFirma', {
          companyId: company.id,
          companyName: company.name,
        });

        return company;
      } catch (error) {
        logger.error('Failed to fetch company data from wFirma', { error });
        throw error;
      }
    });
  }
}
