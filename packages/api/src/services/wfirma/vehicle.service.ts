/**
 * wFirma Vehicle Service
 * Handles vehicle CRUD operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaVehicle,
  VehicleFilters,
  VehicleData,
  VehicleUpdateData,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaVehicleService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get list of vehicles from wFirma
   */
  async findVehicles(filters?: VehicleFilters): Promise<WFirmaVehicle[]> {
    logger.info('Fetching vehicles from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.search) {
          // Search in both name and register fields
          conditions.push({
            field: 'name',
            operator: 'like',
            value: `%${filters.search}%`,
          });
        }

        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        if (filters?.ownership) {
          conditions.push({
            field: 'ownership',
            operator: 'eq',
            value: filters.ownership,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const vehiclesParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        const builtConditions = this.client.buildConditions(conditions);
          if (builtConditions) {
            vehiclesParams.parameters.conditions = builtConditions;
          }

        const payload = {
          api: {
            vehicles: vehiclesParams,
          },
        };

        logger.debug('wFirma findVehicles payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/vehicles/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch vehicles',
            data.status
          );
        }

        let vehiclesData = data.vehicles?.vehicle;

        if (!vehiclesData) {
          const vehiclesObj = data.vehicles;
          if (vehiclesObj) {
            vehiclesData = [];
            for (const key in vehiclesObj) {
              if (!isNaN(Number(key)) && vehiclesObj[key]?.vehicle) {
                vehiclesData.push(vehiclesObj[key].vehicle);
              }
            }
          }
        }

        if (!vehiclesData || vehiclesData.length === 0) {
          return [];
        }

        if (!Array.isArray(vehiclesData)) {
          vehiclesData = [vehiclesData];
        }

        const vehicles: WFirmaVehicle[] = vehiclesData.map((v: any) =>
          this.mapVehicleData(v)
        );

        logger.info('Successfully fetched vehicles from wFirma', {
          count: vehicles.length,
        });

        return vehicles;
      } catch (error) {
        logger.error('Failed to fetch vehicles from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single vehicle by ID from wFirma
   */
  async getVehicle(id: string): Promise<WFirmaVehicle | null> {
    logger.info('Fetching vehicle by ID from wFirma', { vehicleId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Vehicle ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/vehicles/get/${id}`,
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
            'Failed to fetch vehicle',
            data.status
          );
        }

        let vehicleData = data.vehicles?.vehicle;
        if (!vehicleData) {
          const vehiclesObj = data.vehicles;
          if (vehiclesObj) {
            for (const key in vehiclesObj) {
              if (!isNaN(Number(key)) && vehiclesObj[key]?.vehicle) {
                vehicleData = vehiclesObj[key].vehicle;
                break;
              }
            }
          }
        }

        if (!vehicleData) {
          return null;
        }

        const vehicle = this.mapVehicleData(vehicleData);

        logger.info('Successfully fetched vehicle by ID', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
        });

        return vehicle;
      } catch (error) {
        logger.error('Failed to fetch vehicle by ID', { error, vehicleId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new vehicle in wFirma
   */
  async createVehicle(data: VehicleData): Promise<WFirmaVehicle> {
    logger.info('Creating vehicle in wFirma', { name: data.name });

    return this.client.withRetry(async () => {
      try {
        // Validate required fields
        if (!data.name) {
          throw new WFirmaValidationError('Vehicle name is required');
        }
        if (!data.register) {
          throw new WFirmaValidationError('Vehicle registration number is required');
        }
        if (!data.type) {
          throw new WFirmaValidationError('Vehicle type is required');
        }
        if (!data.ownership) {
          throw new WFirmaValidationError('Vehicle ownership is required');
        }

        const vehiclePayload = this.buildVehiclePayload(data);

        const payload = {
          api: {
            vehicles: {
              vehicle: vehiclePayload,
            },
          },
        };

        const queryParams = this.client.buildQueryParams();
        logger.info('wFirma create vehicle REQUEST', {
          url: '/vehicles/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/vehicles/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create vehicle RESPONSE', {
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

        let createdVehicle = responseData.vehicles?.['0']?.vehicle;

        if (!createdVehicle) {
          createdVehicle = responseData.vehicle;
        }

        if (!createdVehicle && responseData.vehicles?.vehicle) {
          createdVehicle = responseData.vehicles.vehicle;
        }

        if (!createdVehicle) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No vehicle data in response',
            responseData
          );
        }

        const vehicle = this.mapVehicleData(createdVehicle);

        logger.info('Successfully created vehicle in wFirma', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
        });

        return vehicle;
      } catch (error) {
        logger.error('Failed to create vehicle in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing vehicle in wFirma
   */
  async updateVehicle(
    id: string,
    data: VehicleUpdateData
  ): Promise<WFirmaVehicle> {
    logger.info('Updating vehicle in wFirma', {
      vehicleId: id,
      updates: Object.keys(data),
    });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Vehicle ID is required');
        }

        const vehiclePayload = this.buildVehiclePayload(data);
        vehiclePayload.id = id;

        const payload = {
          api: {
            vehicles: {
              vehicle: vehiclePayload,
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/vehicles/edit/${id}`,
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
              `Vehicle with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update vehicle',
            responseData.status
          );
        }

        let vehicleData = responseData.vehicles?.vehicle;
        if (!vehicleData) {
          const vehiclesObj = responseData.vehicles;
          if (vehiclesObj) {
            for (const key in vehiclesObj) {
              if (!isNaN(Number(key)) && vehiclesObj[key]?.vehicle) {
                vehicleData = vehiclesObj[key].vehicle;
                break;
              }
            }
          }
        }

        if (!vehicleData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No vehicle data in response',
            responseData
          );
        }

        const vehicle = this.mapVehicleData(vehicleData);

        logger.info('Successfully updated vehicle in wFirma', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
        });

        return vehicle;
      } catch (error) {
        logger.error('Failed to update vehicle in wFirma', {
          error,
          vehicleId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Delete a vehicle from wFirma
   */
  async deleteVehicle(id: string): Promise<DeleteResult> {
    logger.info('Deleting vehicle from wFirma', { vehicleId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Vehicle ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/vehicles/delete/${id}`,
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
              `Vehicle with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete vehicle',
            responseData.status
          );
        }

        logger.info('Successfully deleted vehicle from wFirma', {
          vehicleId: id,
        });

        return {
          success: true,
          id,
          message: `Vehicle ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete vehicle from wFirma', {
          error,
          vehicleId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Map wFirma API vehicle data to WFirmaVehicle type
   */
  private mapVehicleData(v: any): WFirmaVehicle {
    return {
      id: v.id || '',
      name: v.name || '',
      register: v.register || '',
      type: (v.type || 'car') as any,
      ownership: (v.ownership || 'private') as any,
      truckType: v.truck_type as any,
      taxPurpose: v.tax_purpose as any,
      vatLeasingBelowLimit: v.vat_leasing_below_limit === '1' || v.vat_leasing_below_limit === true,
      vatLeasingDate: v.vat_leasing_date ? new Date(v.vat_leasing_date) : undefined,
      vatLeasingValue: v.vat_leasing_value ? parseFloat(v.vat_leasing_value) : undefined,
    };
  }

  /**
   * Build wFirma API payload from vehicle data
   */
  private buildVehiclePayload(
    data: VehicleData | VehicleUpdateData
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.register !== undefined) payload.register = data.register;
    if (data.type !== undefined) payload.type = data.type;
    if (data.ownership !== undefined) payload.ownership = data.ownership;
    if (data.truckType !== undefined) payload.truck_type = data.truckType;
    if (data.taxPurpose !== undefined) payload.tax_purpose = data.taxPurpose;

    if (data.vatLeasingBelowLimit !== undefined) {
      payload.vat_leasing_below_limit = data.vatLeasingBelowLimit ? '1' : '0';
    }

    if (data.vatLeasingDate !== undefined) {
      const date = data.vatLeasingDate instanceof Date
        ? data.vatLeasingDate
        : new Date(data.vatLeasingDate);
      payload.vat_leasing_date = date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    if (data.vatLeasingValue !== undefined) {
      payload.vat_leasing_value = String(data.vatLeasingValue);
    }

    return payload;
  }
}
