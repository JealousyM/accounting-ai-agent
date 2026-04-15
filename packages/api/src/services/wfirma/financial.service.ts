/**
 * wFirma Financial Service
 * Handles financial data operations
 */

import { logger } from '../../utils/logger';
import { FinancialData } from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError } from './errors';

export class WFirmaFinancialService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get financial data for a specific year
   */
  async getFinancialData(year: number): Promise<FinancialData> {
    logger.info('Fetching financial data from wFirma', { year });

    return this.client.withRetry(async () => {
      try {
        const dateFrom = `${year}-01-01`;
        const dateTo = `${year}-12-31`;

        const payload = {
          api: {
            invoices: {
              parameters: {
                conditions: this.client.buildConditions([
                  { field: 'date', operator: 'ge', value: dateFrom },
                  { field: 'date', operator: 'le', value: dateTo },
                ]),
                limit: 1000,
                page: 1,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/invoices/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch financial data',
            data.status
          );
        }

        let invoicesData = data.invoices?.invoice;

        if (!invoicesData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            invoicesData = [];
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoicesData.push(invoicesObj[key].invoice);
              }
            }
          }
        }

        if (!invoicesData || invoicesData.length === 0) {
          invoicesData = [];
        } else if (!Array.isArray(invoicesData)) {
          invoicesData = [invoicesData];
        }

        let revenue = 0;
        let expenses = 0;

        invoicesData.forEach((invoice: any) => {
          const total = parseFloat(invoice.total || invoice.brutto || 0);
          if (invoice.type === 'normal' || invoice.type === 'vat') {
            revenue += total;
          } else if (invoice.type === 'purchase') {
            expenses += total;
          }
        });

        const profit = revenue - expenses;

        const financialData: FinancialData = {
          year,
          revenue,
          expenses,
          profit,
          taxPaid: 0,
          vatPaid: 0,
          pitPaid: 0,
          zusPaid: 0,
        };

        logger.info('Successfully fetched financial data from wFirma', {
          year,
          revenue,
          profit,
        });

        return financialData;
      } catch (error) {
        logger.error('Failed to fetch financial data from wFirma', { error });
        throw error;
      }
    });
  }
}
