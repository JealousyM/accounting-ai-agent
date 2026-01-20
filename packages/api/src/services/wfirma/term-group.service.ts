/**
 * wFirma Term Group Service
 * Handles term group CRUD operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaTermGroup,
  TermGroupFilters,
  TermGroupData,
  TermGroupUpdateData,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaTermGroupService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get list of term groups from wFirma
   */
  async findTermGroups(filters?: TermGroupFilters): Promise<WFirmaTermGroup[]> {
    logger.info('Fetching term groups from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.search) {
          conditions.push({
            field: 'name',
            operator: 'like',
            value: `%${filters.search}%`,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const termGroupsParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        if (conditions.length > 0) {
          termGroupsParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            term_groups: termGroupsParams,
          },
        };

        logger.debug('wFirma findTermGroups payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/term_groups/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch term groups',
            data.status
          );
        }

        let termGroupsData = data.term_groups?.term_group;

        if (!termGroupsData) {
          const termGroupsObj = data.term_groups;
          if (termGroupsObj) {
            termGroupsData = [];
            for (const key in termGroupsObj) {
              if (!isNaN(Number(key)) && termGroupsObj[key]?.term_group) {
                termGroupsData.push(termGroupsObj[key].term_group);
              }
            }
          }
        }

        if (!termGroupsData || termGroupsData.length === 0) {
          return [];
        }

        if (!Array.isArray(termGroupsData)) {
          termGroupsData = [termGroupsData];
        }

        const termGroups: WFirmaTermGroup[] = termGroupsData.map((tg: any) =>
          this.mapTermGroupData(tg)
        );

        logger.info('Successfully fetched term groups from wFirma', {
          count: termGroups.length,
        });

        return termGroups;
      } catch (error) {
        logger.error('Failed to fetch term groups from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single term group by ID from wFirma
   */
  async getTermGroup(id: string): Promise<WFirmaTermGroup | null> {
    logger.info('Fetching term group by ID from wFirma', { termGroupId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term group ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/term_groups/get/${id}`,
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
            'Failed to fetch term group',
            data.status
          );
        }

        let termGroupData = data.term_groups?.term_group;
        if (!termGroupData) {
          const termGroupsObj = data.term_groups;
          if (termGroupsObj) {
            for (const key in termGroupsObj) {
              if (!isNaN(Number(key)) && termGroupsObj[key]?.term_group) {
                termGroupData = termGroupsObj[key].term_group;
                break;
              }
            }
          }
        }

        if (!termGroupData) {
          return null;
        }

        const termGroup = this.mapTermGroupData(termGroupData);

        logger.info('Successfully fetched term group by ID', {
          termGroupId: termGroup.id,
          termGroupName: termGroup.name,
        });

        return termGroup;
      } catch (error) {
        logger.error('Failed to fetch term group by ID', { error, termGroupId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new term group in wFirma
   */
  async createTermGroup(data: TermGroupData): Promise<WFirmaTermGroup> {
    logger.info('Creating term group in wFirma', { name: data.name });

    return this.client.withRetry(async () => {
      try {
        if (!data.name) {
          throw new WFirmaValidationError('Term group name is required');
        }

        const termGroupPayload = this.buildTermGroupPayload(data);

        const payload = {
          api: {
            term_groups: {
              term_group: termGroupPayload,
            },
          },
        };

        const queryParams = this.client.buildQueryParams();
        logger.info('wFirma create term group REQUEST', {
          url: '/term_groups/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/term_groups/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create term group RESPONSE', {
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

        let createdTermGroup = responseData.term_groups?.['0']?.term_group;

        if (!createdTermGroup) {
          createdTermGroup = responseData.term_group;
        }

        if (!createdTermGroup && responseData.term_groups?.term_group) {
          createdTermGroup = responseData.term_groups.term_group;
        }

        if (!createdTermGroup) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No term group data in response',
            responseData
          );
        }

        const termGroup = this.mapTermGroupData(createdTermGroup);

        logger.info('Successfully created term group in wFirma', {
          termGroupId: termGroup.id,
          termGroupName: termGroup.name,
        });

        return termGroup;
      } catch (error) {
        logger.error('Failed to create term group in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing term group in wFirma
   */
  async updateTermGroup(
    id: string,
    data: TermGroupUpdateData
  ): Promise<WFirmaTermGroup> {
    logger.info('Updating term group in wFirma', {
      termGroupId: id,
      updates: Object.keys(data),
    });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term group ID is required');
        }

        const termGroupPayload = this.buildTermGroupPayload(data);
        termGroupPayload.id = id;

        const payload = {
          api: {
            term_groups: {
              term_group: termGroupPayload,
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/term_groups/edit/${id}`,
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
              `Term group with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update term group',
            responseData.status
          );
        }

        let termGroupData = responseData.term_groups?.term_group;
        if (!termGroupData) {
          const termGroupsObj = responseData.term_groups;
          if (termGroupsObj) {
            for (const key in termGroupsObj) {
              if (!isNaN(Number(key)) && termGroupsObj[key]?.term_group) {
                termGroupData = termGroupsObj[key].term_group;
                break;
              }
            }
          }
        }

        if (!termGroupData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No term group data in response',
            responseData
          );
        }

        const termGroup = this.mapTermGroupData(termGroupData);

        logger.info('Successfully updated term group in wFirma', {
          termGroupId: termGroup.id,
          termGroupName: termGroup.name,
        });

        return termGroup;
      } catch (error) {
        logger.error('Failed to update term group in wFirma', {
          error,
          termGroupId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Delete a term group from wFirma
   */
  async deleteTermGroup(id: string): Promise<DeleteResult> {
    logger.info('Deleting term group from wFirma', { termGroupId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Term group ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/term_groups/delete/${id}`,
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
              `Term group with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete term group',
            responseData.status
          );
        }

        logger.info('Successfully deleted term group from wFirma', {
          termGroupId: id,
        });

        return {
          success: true,
          id,
          message: `Term group ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete term group from wFirma', {
          error,
          termGroupId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Map wFirma API term group data to WFirmaTermGroup type
   */
  private mapTermGroupData(tg: any): WFirmaTermGroup {
    return {
      id: tg.id || '',
      name: tg.name || '',
      isReadonly: tg.is_readonly === '1' || tg.is_readonly === true,
      createdAt: tg.created ? new Date(tg.created) : undefined,
      updatedAt: tg.modified ? new Date(tg.modified) : undefined,
    };
  }

  /**
   * Build wFirma API payload from term group data
   */
  private buildTermGroupPayload(
    data: TermGroupData | TermGroupUpdateData
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.isReadonly !== undefined) {
      payload.is_readonly = data.isReadonly ? '1' : '0';
    }

    return payload;
  }
}
