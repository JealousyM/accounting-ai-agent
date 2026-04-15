/**
 * wFirma Term Service
 * Handles term (appointment/deadline) CRUD operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaTerm,
  TermFilters,
  TermData,
  TermUpdateData,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaTermService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get list of terms from wFirma
   */
  async findTerms(filters?: TermFilters): Promise<WFirmaTerm[]> {
    logger.info('Fetching terms from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.dateFrom) {
          conditions.push({
            field: 'date',
            operator: 'ge',
            value: this.formatDate(filters.dateFrom),
          });
        }

        if (filters?.dateTo) {
          conditions.push({
            field: 'date',
            operator: 'le',
            value: this.formatDate(filters.dateTo),
          });
        }

        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        if (filters?.groupId) {
          conditions.push({
            field: 'group_id',
            operator: 'eq',
            value: filters.groupId,
          });
        }

        if (filters?.contractorId) {
          conditions.push({
            field: 'contractor_id',
            operator: 'eq',
            value: filters.contractorId,
          });
        }

        if (filters?.search) {
          conditions.push({
            field: 'description',
            operator: 'like',
            value: `%${filters.search}%`,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const termsParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        const builtConditions = this.client.buildConditions(conditions);
          if (builtConditions) {
            termsParams.parameters.conditions = builtConditions;
          }

        const payload = {
          api: {
            terms: termsParams,
          },
        };

        logger.debug('wFirma findTerms payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/terms/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch terms',
            data.status
          );
        }

        let termsData = data.terms?.term;

        if (!termsData) {
          const termsObj = data.terms;
          if (termsObj) {
            termsData = [];
            for (const key in termsObj) {
              if (!isNaN(Number(key)) && termsObj[key]?.term) {
                termsData.push(termsObj[key].term);
              }
            }
          }
        }

        if (!termsData || termsData.length === 0) {
          return [];
        }

        if (!Array.isArray(termsData)) {
          termsData = [termsData];
        }

        const terms: WFirmaTerm[] = termsData.map((t: any) =>
          this.mapTermData(t)
        );

        logger.info('Successfully fetched terms from wFirma', {
          count: terms.length,
        });

        return terms;
      } catch (error) {
        logger.error('Failed to fetch terms from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single term by ID from wFirma
   */
  async getTerm(id: string): Promise<WFirmaTerm | null> {
    logger.info('Fetching term by ID from wFirma', { termId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/terms/get/${id}`,
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
            'Failed to fetch term',
            data.status
          );
        }

        let termData = data.terms?.term;
        if (!termData) {
          const termsObj = data.terms;
          if (termsObj) {
            for (const key in termsObj) {
              if (!isNaN(Number(key)) && termsObj[key]?.term) {
                termData = termsObj[key].term;
                break;
              }
            }
          }
        }

        if (!termData) {
          return null;
        }

        const term = this.mapTermData(termData);

        logger.info('Successfully fetched term by ID', {
          termId: term.id,
        });

        return term;
      } catch (error) {
        logger.error('Failed to fetch term by ID', { error, termId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new term in wFirma
   */
  async createTerm(data: TermData): Promise<WFirmaTerm> {
    logger.info('Creating term in wFirma', { description: data.description });

    return this.client.withRetry(async () => {
      try {
        if (!data.date) {
          throw new WFirmaValidationError('Term date is required');
        }

        const termPayload = this.buildTermPayload(data);

        const payload = {
          api: {
            terms: {
              term: termPayload,
            },
          },
        };

        const queryParams = this.client.buildQueryParams();
        logger.info('wFirma create term REQUEST', {
          url: '/terms/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/terms/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create term RESPONSE', {
          responseData: JSON.stringify(responseData, null, 2),
        });

        if (responseData.status?.code !== 'OK') {
          const errorMessage =
            responseData.status?.message ||
            responseData.status?.code ||
            'Unknown error';
          const errorDetails = responseData.status?.fields
            ? `Fields with errors: ${Object.keys(responseData.status.fields).join(', ')}`
            : '';

          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            `wFirma error: ${errorMessage}. ${errorDetails}`.trim(),
            responseData.status
          );
        }

        let createdTerm = responseData.terms?.['0']?.term;

        if (!createdTerm) {
          createdTerm = responseData.term;
        }

        if (!createdTerm && responseData.terms?.term) {
          createdTerm = responseData.terms.term;
        }

        if (!createdTerm) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No term data in response',
            responseData
          );
        }

        const term = this.mapTermData(createdTerm);

        logger.info('Successfully created term in wFirma', {
          termId: term.id,
        });

        return term;
      } catch (error) {
        logger.error('Failed to create term in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing term in wFirma
   */
  async updateTerm(id: string, data: TermUpdateData): Promise<WFirmaTerm> {
    logger.info('Updating term in wFirma', {
      termId: id,
      updates: Object.keys(data),
    });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term ID is required');
        }

        const termPayload = this.buildTermPayload(data);
        termPayload.id = id;

        const payload = {
          api: {
            terms: {
              term: termPayload,
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/terms/edit/${id}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (
            responseData.status?.code === 'NOT FOUND' ||
            responseData.status?.code === 'ACTION NOT FOUND'
          ) {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Term with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update term',
            responseData.status
          );
        }

        let termData = responseData.terms?.term;
        if (!termData) {
          const termsObj = responseData.terms;
          if (termsObj) {
            for (const key in termsObj) {
              if (!isNaN(Number(key)) && termsObj[key]?.term) {
                termData = termsObj[key].term;
                break;
              }
            }
          }
        }

        if (!termData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No term data in response',
            responseData
          );
        }

        const term = this.mapTermData(termData);

        logger.info('Successfully updated term in wFirma', {
          termId: term.id,
        });

        return term;
      } catch (error) {
        logger.error('Failed to update term in wFirma', {
          error,
          termId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Delete a term from wFirma
   */
  async deleteTerm(id: string): Promise<DeleteResult> {
    logger.info('Deleting term from wFirma', { termId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/terms/delete/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (
            responseData.status?.code === 'NOT FOUND' ||
            responseData.status?.code === 'ACTION NOT FOUND'
          ) {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Term with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete term',
            responseData.status
          );
        }

        logger.info('Successfully deleted term from wFirma', {
          termId: id,
        });

        return {
          success: true,
          id,
          message: `Term ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete term from wFirma', {
          error,
          termId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Map wFirma API term data to WFirmaTerm type
   */
  private mapTermData(t: any): WFirmaTerm {
    return {
      id: t.id || '',
      date: t.date ? new Date(t.date) : new Date(),
      hour: t.hour || undefined,
      description: t.description || undefined,
      groupId: t.group_id || t.term_group_id || undefined,
      type: (t.type || 'normal') as any,
      contractorId: t.contractor_id || undefined,
      contactId: t.contact_id || undefined,
      createdAt: t.created ? new Date(t.created) : undefined,
      updatedAt: t.modified ? new Date(t.modified) : undefined,
    };
  }

  /**
   * Build wFirma API payload from term data
   */
  private buildTermPayload(data: TermData | TermUpdateData): Record<string, any> {
    const payload: Record<string, any> = {};

    if (data.date !== undefined) {
      const date = data.date instanceof Date ? data.date : new Date(data.date);
      payload.date = this.formatDate(date);
    }
    if (data.hour !== undefined) payload.hour = data.hour;
    if (data.description !== undefined) payload.description = data.description;
    if (data.termGroupId !== undefined) payload.term_group_id = data.termGroupId;
    if (data.type !== undefined) payload.type = data.type;
    if (data.contractorId !== undefined) payload.contractor_id = data.contractorId;
    if (data.contactId !== undefined) payload.contact_id = data.contactId;

    return payload;
  }

  /**
   * Format date for wFirma API (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
