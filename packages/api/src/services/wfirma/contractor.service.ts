/**
 * wFirma Contractor Service
 * Handles contractor CRUD operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaContractor,
  ContractorFilters,
  ContractorData,
  ContractorUpdateData,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaContractorService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get list of contractors from wFirma
   */
  async getContractors(filters?: ContractorFilters): Promise<WFirmaContractor[]> {
    logger.info('Fetching contractors from wFirma', { filters });

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

        if (filters?.nip) {
          conditions.push({
            field: 'nip',
            operator: 'eq',
            value: filters.nip,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const contractorsParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        if (conditions.length > 0) {
          contractorsParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            contractors: contractorsParams,
          },
        };

        logger.debug('wFirma getContractors payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/contractors/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch contractors',
            data.status
          );
        }

        let contractorsData = data.contractors?.contractor;

        if (!contractorsData) {
          const contractorsObj = data.contractors;
          if (contractorsObj) {
            contractorsData = [];
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorsData.push(contractorsObj[key].contractor);
              }
            }
          }
        }

        if (!contractorsData || contractorsData.length === 0) {
          return [];
        }

        if (!Array.isArray(contractorsData)) {
          contractorsData = [contractorsData];
        }

        const contractors: WFirmaContractor[] = contractorsData.map((c: any) => ({
          id: c.id || '',
          name: c.name || c.altname || '',
          nip: c.nip,
          regon: c.regon,
          email: c.email,
          phone: c.phone,
          address: c.street || c.city ? {
            street: c.street || '',
            city: c.city || c.post || '',
            zip: c.zip || '',
            country: c.country || 'PL',
          } : undefined,
          bankAccount: c.account,
          notes: c.notes,
        }));

        logger.info('Successfully fetched contractors from wFirma', {
          count: contractors.length,
        });

        return contractors;
      } catch (error) {
        logger.error('Failed to fetch contractors from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single contractor by ID from wFirma
   */
  async getContractorById(id: string): Promise<WFirmaContractor | null> {
    logger.info('Fetching contractor by ID from wFirma', { contractorId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/contractors/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch contractor',
            data.status
          );
        }

        let contractorData = data.contractors?.contractor;
        if (!contractorData) {
          const contractorsObj = data.contractors;
          if (contractorsObj) {
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorData = contractorsObj[key].contractor;
                break;
              }
            }
          }
        }

        if (!contractorData) {
          return null;
        }

        const contractor: WFirmaContractor = {
          id: contractorData.id || id,
          name: contractorData.name || contractorData.altname || '',
          nip: contractorData.nip,
          regon: contractorData.regon,
          email: contractorData.email,
          phone: contractorData.phone,
          address: contractorData.street || contractorData.city ? {
            street: contractorData.street || '',
            city: contractorData.city || contractorData.post || '',
            zip: contractorData.zip || '',
            country: contractorData.country || 'PL',
          } : undefined,
          bankAccount: contractorData.account,
          notes: contractorData.notes,
        };

        logger.info('Successfully fetched contractor by ID', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to fetch contractor by ID', { error, contractorId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new contractor in wFirma
   */
  async createContractor(data: ContractorData): Promise<WFirmaContractor> {
    logger.info('Creating contractor in wFirma', { name: data.name });

    return this.client.withRetry(async () => {
      try {
        if (!data.name) {
          throw new WFirmaValidationError('Contractor name is required');
        }

        let taxIdType = 'none';
        if (data.nip) {
          taxIdType = 'nip';
        } else if (data.regon) {
          taxIdType = 'regon';
        }

        const contractorData: Record<string, string> = {
          name: data.name,
          altname: data.name,
          country: data.address?.country || 'PL',
          tax_id_type: taxIdType,
        };

        if (data.nip) contractorData.nip = data.nip;
        if (data.regon) contractorData.regon = data.regon;
        if (data.address?.street) contractorData.street = data.address.street;
        if (data.address?.zip) contractorData.zip = data.address.zip;
        if (data.address?.city) {
          contractorData.post = data.address.city;
          contractorData.city = data.address.city;
        }
        if (data.phone) contractorData.phone = data.phone;
        if (data.email) contractorData.email = data.email;
        if (data.bankAccount) contractorData.account = data.bankAccount;
        if (data.notes) contractorData.notes = data.notes;

        const payload = {
          api: {
            contractors: {
              contractor: contractorData,
            },
          },
        };

        const queryParams = this.client.buildQueryParams();
        logger.info('wFirma create contractor REQUEST', {
          url: '/contractors/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/contractors/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create contractor RESPONSE', {
          responseData: JSON.stringify(responseData, null, 2),
        });

        if (responseData.status?.code !== 'OK') {
          const errorMessage = responseData.status?.message
            || responseData.status?.code
            || 'Unknown error';
          const errorDetails = responseData.status?.fields
            ? `Поля с ошибками: ${Object.keys(responseData.status.fields).join(', ')}`
            : '';

          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            `Ошибка wFirma: ${errorMessage}. ${errorDetails}`.trim(),
            responseData.status
          );
        }

        let createdContractor = responseData.contractors?.['0']?.contractor;

        if (!createdContractor) {
          createdContractor = responseData.contractor;
        }

        if (!createdContractor && responseData.contractors?.contractor) {
          createdContractor = responseData.contractors.contractor;
        }

        if (!createdContractor) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No contractor data in response',
            responseData
          );
        }

        const contractor: WFirmaContractor = {
          id: createdContractor.id || '',
          name: createdContractor.name || data.name,
          nip: createdContractor.nip || data.nip,
          regon: createdContractor.regon || data.regon,
          email: createdContractor.email || data.email,
          phone: createdContractor.phone || data.phone,
          address: data.address,
          bankAccount: createdContractor.account || data.bankAccount,
          notes: createdContractor.notes || data.notes,
        };

        logger.info('Successfully created contractor in wFirma', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to create contractor in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing contractor in wFirma
   */
  async updateContractor(id: string, data: ContractorUpdateData): Promise<WFirmaContractor> {
    logger.info('Updating contractor in wFirma', { contractorId: id, updates: Object.keys(data) });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        const contractorPayload: Record<string, unknown> = { id };

        if (data.name !== undefined) {
          contractorPayload.name = data.name;
          contractorPayload.altname = data.name;
        }
        if (data.nip !== undefined) contractorPayload.nip = data.nip;
        if (data.regon !== undefined) contractorPayload.regon = data.regon;
        if (data.email !== undefined) contractorPayload.email = data.email;
        if (data.phone !== undefined) contractorPayload.phone = data.phone;
        if (data.bankAccount !== undefined) contractorPayload.account = data.bankAccount;
        if (data.notes !== undefined) contractorPayload.notes = data.notes;

        if (data.address) {
          if (data.address.street !== undefined) contractorPayload.street = data.address.street;
          if (data.address.city !== undefined) {
            contractorPayload.city = data.address.city;
            contractorPayload.post = data.address.city;
          }
          if (data.address.zip !== undefined) contractorPayload.zip = data.address.zip;
          if (data.address.country !== undefined) contractorPayload.country = data.address.country;
        }

        const payload = {
          api: {
            contractors: {
              contractor: contractorPayload,
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/contractors/edit/${id}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Contractor with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update contractor',
            responseData.status
          );
        }

        let contractorData = responseData.contractors?.contractor;
        if (!contractorData) {
          const contractorsObj = responseData.contractors;
          if (contractorsObj) {
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorData = contractorsObj[key].contractor;
                break;
              }
            }
          }
        }

        if (!contractorData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No contractor data in response',
            responseData
          );
        }

        const contractor: WFirmaContractor = {
          id: contractorData.id || id,
          name: contractorData.name || '',
          nip: contractorData.nip,
          regon: contractorData.regon,
          email: contractorData.email,
          phone: contractorData.phone,
          address: contractorData.street || contractorData.city ? {
            street: contractorData.street || '',
            city: contractorData.city || contractorData.post || '',
            zip: contractorData.zip || '',
            country: contractorData.country || 'PL',
          } : undefined,
          bankAccount: contractorData.account,
          notes: contractorData.notes,
        };

        logger.info('Successfully updated contractor in wFirma', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to update contractor in wFirma', { error, contractorId: id });
        throw error;
      }
    });
  }

  /**
   * Delete a contractor from wFirma
   */
  async deleteContractor(id: string): Promise<DeleteResult> {
    logger.info('Deleting contractor from wFirma', { contractorId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'DELETE',
          url: `/contractors/delete/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Contractor with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete contractor',
            responseData.status
          );
        }

        logger.info('Successfully deleted contractor from wFirma', { contractorId: id });

        return {
          success: true,
          id,
          message: `Contractor ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete contractor from wFirma', { error, contractorId: id });
        throw error;
      }
    });
  }
}
