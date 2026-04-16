/**
 * wFirma Ledger Service
 * Handles ledger accountant years and operation schemas (read-only operations)
 */

import { logger } from '../../utils/logger';
import {
  WFirmaLedgerAccountantYear,
  LedgerAccountantYearFilters,
  WFirmaLedgerOperationSchema,
  LedgerOperationSchemaFilters,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaLedgerService {
  constructor(private readonly client: WFirmaClient) {}

  // ============================================
  // LEDGER ACCOUNTANT YEARS (Fiscal Years)
  // ============================================

  /**
   * Get list of fiscal years from wFirma
   */
  async findLedgerAccountantYears(
    filters?: LedgerAccountantYearFilters
  ): Promise<WFirmaLedgerAccountantYear[]> {
    logger.info('Fetching ledger accountant years from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const limit = filters?.limit || 100;
        const page = filters?.page || 1;

        const payload = {
          api: {
            ledger_accountant_years: {
              parameters: {
                limit,
                page,
              },
            },
          },
        };

        logger.debug('wFirma findLedgerAccountantYears payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/ledger_accountant_years/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch ledger accountant years',
            data.status
          );
        }

        let yearsData = data.ledger_accountant_years?.ledger_accountant_year;

        // Handle numeric key responses
        if (!yearsData) {
          const yearsObj = data.ledger_accountant_years;
          if (yearsObj) {
            yearsData = [];
            for (const key in yearsObj) {
              if (!isNaN(Number(key)) && yearsObj[key]?.ledger_accountant_year) {
                yearsData.push(yearsObj[key].ledger_accountant_year);
              }
            }
          }
        }

        if (!yearsData || yearsData.length === 0) {
          return [];
        }

        if (!Array.isArray(yearsData)) {
          yearsData = [yearsData];
        }

        const years: WFirmaLedgerAccountantYear[] = yearsData.map((y: any) =>
          this.mapLedgerAccountantYear(y)
        );

        logger.info('Successfully fetched ledger accountant years from wFirma', {
          count: years.length,
        });

        return years;
      } catch (error) {
        logger.error('Failed to fetch ledger accountant years from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single fiscal year by ID or symbol from wFirma.
   * First tries /get by ID, then falls back to finding by symbol in the full list.
   */
  async getLedgerAccountantYear(
    idOrSymbol: string
  ): Promise<WFirmaLedgerAccountantYear | null> {
    logger.info('Fetching ledger accountant year from wFirma', { idOrSymbol });

    if (!idOrSymbol) {
      throw new WFirmaValidationError('Ledger accountant year ID or symbol is required');
    }

    // Try direct /get by ID first
    const directResult = await this.getLedgerAccountantYearById(idOrSymbol);
    if (directResult) {
      return directResult;
    }

    // Fall back to searching by symbol in the full list
    logger.info('Direct get failed, searching by symbol', { idOrSymbol });
    const allYears = await this.findLedgerAccountantYears();
    const year = allYears.find((y) => y.symbol === idOrSymbol);

    if (!year) {
      logger.warn('Ledger accountant year not found', { idOrSymbol });
      return null;
    }

    logger.info('Successfully found ledger accountant year by symbol', {
      idOrSymbol,
      yearId: year.id,
      symbol: year.symbol,
    });

    return year;
  }

  /**
   * Get a single fiscal year by ID from wFirma API
   */
  private async getLedgerAccountantYearById(
    id: string
  ): Promise<WFirmaLedgerAccountantYear | null> {
    return this.client.withRetry(async () => {
      try {
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/ledger_accountant_years/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          return null;
        }

        let yearData = data.ledger_accountant_years?.ledger_accountant_year;
        if (!yearData) {
          const yearsObj = data.ledger_accountant_years;
          if (yearsObj) {
            for (const key in yearsObj) {
              if (!isNaN(Number(key)) && yearsObj[key]?.ledger_accountant_year) {
                yearData = yearsObj[key].ledger_accountant_year;
                break;
              }
            }
          }
        }

        if (!yearData) {
          return null;
        }

        return this.mapLedgerAccountantYear(yearData);
      } catch (error) {
        logger.debug('Direct get for ledger accountant year failed', { id, error });
        return null;
      }
    });
  }

  // ============================================
  // LEDGER OPERATION SCHEMAS (Accounting Schemas)
  // ============================================

  /**
   * Get list of accounting schemas from wFirma
   */
  async findLedgerOperationSchemas(
    filters?: LedgerOperationSchemaFilters
  ): Promise<WFirmaLedgerOperationSchema[]> {
    logger.info('Fetching ledger operation schemas from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.ledgerAccountantYearId) {
          conditions.push({
            field: 'ledger_accountant_year',
            operator: 'eq',
            value: filters.ledgerAccountantYearId,
          });
        }

        if (filters?.category) {
          conditions.push({
            field: 'category',
            operator: 'eq',
            value: filters.category,
          });
        }

        const limit = filters?.limit || 100;
        const page = filters?.page || 1;

        const schemaParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        const builtConditions = this.client.buildConditions(conditions);
          if (builtConditions) {
            schemaParams.parameters.conditions = builtConditions;
          }

        const payload = {
          api: {
            ledger_operation_schemas: schemaParams,
          },
        };

        logger.debug('wFirma findLedgerOperationSchemas payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/ledger_operation_schemas/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch ledger operation schemas',
            data.status
          );
        }

        let schemasData = data.ledger_operation_schemas?.ledger_operation_schema;

        // Handle numeric key responses
        if (!schemasData) {
          const schemasObj = data.ledger_operation_schemas;
          if (schemasObj) {
            schemasData = [];
            for (const key in schemasObj) {
              if (!isNaN(Number(key)) && schemasObj[key]?.ledger_operation_schema) {
                schemasData.push(schemasObj[key].ledger_operation_schema);
              }
            }
          }
        }

        if (!schemasData || schemasData.length === 0) {
          return [];
        }

        if (!Array.isArray(schemasData)) {
          schemasData = [schemasData];
        }

        const schemas: WFirmaLedgerOperationSchema[] = schemasData.map((s: any) =>
          this.mapLedgerOperationSchema(s)
        );

        logger.info('Successfully fetched ledger operation schemas from wFirma', {
          count: schemas.length,
        });

        return schemas;
      } catch (error) {
        logger.error('Failed to fetch ledger operation schemas from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single accounting schema by ID from wFirma
   */
  async getLedgerOperationSchema(
    id: string
  ): Promise<WFirmaLedgerOperationSchema | null> {
    logger.info('Fetching ledger operation schema by ID from wFirma', { schemaId: id });

    if (!id) {
      throw new WFirmaValidationError('Ledger operation schema ID is required');
    }

    return this.client.withRetry(async () => {
      try {
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/ledger_operation_schemas/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (
            data.status?.code === 'NOT FOUND' ||
            data.status?.code === 'ACTION NOT FOUND'
          ) {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch ledger operation schema',
            data.status
          );
        }

        let schemaData: any = null;
        const schemasObj = data.ledger_operation_schemas;
        if (schemasObj) {
          for (const key in schemasObj) {
            if (!isNaN(Number(key)) && schemasObj[key]?.ledger_operation_schema) {
              schemaData = schemasObj[key].ledger_operation_schema;
              break;
            }
          }
        }

        if (!schemaData) {
          return null;
        }

        logger.info('Successfully fetched ledger operation schema from wFirma', {
          schemaId: id,
        });

        return this.mapLedgerOperationSchema(schemaData);
      } catch (error) {
        logger.error('Failed to fetch ledger operation schema from wFirma', {
          error,
          schemaId: id,
        });
        throw error;
      }
    });
  }

  // ============================================
  // PRIVATE MAPPING METHODS
  // ============================================

  private mapLedgerAccountantYear(y: any): WFirmaLedgerAccountantYear {
    return {
      id: String(y.id || ''),
      symbol: y.symbol || '',
      start: y.start ? new Date(y.start) : new Date(),
      stop: y.stop ? new Date(y.stop) : new Date(),
    };
  }

  private mapLedgerOperationSchema(s: any): WFirmaLedgerOperationSchema {
    const schema: WFirmaLedgerOperationSchema = {
      id: String(s.id || ''),
      name: s.name || '',
      category: s.category || '',
      visibility: s.visibility || '',
    };

    // Handle relation - can be just ID string/number or full object
    if (s.ledger_accountant_year) {
      if (typeof s.ledger_accountant_year === 'string' || typeof s.ledger_accountant_year === 'number') {
        schema.ledgerAccountantYearId = String(s.ledger_accountant_year);
      } else if (typeof s.ledger_accountant_year === 'object') {
        schema.ledgerAccountantYearId = String(s.ledger_accountant_year.id);
        // Only map full year object if it has symbol (not just {id})
        if (s.ledger_accountant_year.symbol) {
          schema.ledgerAccountantYear = this.mapLedgerAccountantYear(
            s.ledger_accountant_year
          );
        }
      }
    }

    return schema;
  }
}
