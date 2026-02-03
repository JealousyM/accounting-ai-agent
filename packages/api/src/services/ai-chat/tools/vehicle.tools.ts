/**
 * Vehicle Tools
 * LangChain tools for vehicle CRUD operations
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getVehicleTranslations, Locale } from '../../../i18n';
import { WFirmaIntegrationService } from '../../wfirma';
import { WFirmaCacheService } from '../../wfirma-cache.service';
import { SubscriptionService } from '../../subscription.service';
import { checkWFirmaLimit, incrementWFirmaUsage } from './usage-tracking';
import {
  formatVehiclesList,
  formatVehicleDetails,
  formatVehicleCreated,
  formatVehicleUpdated,
  formatVehicleDeleted,
} from '../formatters';

/**
 * Tool to get list of vehicles from wFirma
 */
export function createGetVehiclesTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      search,
      type,
      ownership,
      limit,
    }: {
      search?: string;
      type?: string;
      ownership?: string;
      limit?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const vehicles = await wfirmaService.findVehicles({
          search,
          type: type as any,
          ownership: ownership as any,
          limit: limit || 100,
        });

        await incrementWFirmaUsage(subscriptionService, userId);

        logger.info('Fetched vehicles for AI tool', { count: vehicles.length });
        return formatVehiclesList(vehicles, locale);
      } catch (error) {
        logger.error('Failed to get vehicles', { error });
        const t = getVehicleTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_vehicles',
      description:
        'Get list of vehicles from wFirma. Can filter by type (truck/car/motor/motor-bike), ownership (leasing/private/other), or search by name/registration number.',
      schema: z.object({
        search: z
          .string()
          .nullable().optional()
          .describe('Search by vehicle name or registration number'),
        type: z
          .enum(['truck', 'car', 'motor', 'motor-bike'])
          .nullable().optional()
          .describe('Filter by vehicle type'),
        ownership: z
          .enum(['leasing', 'private', 'other'])
          .nullable().optional()
          .describe('Filter by ownership form'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 100)'),
      }),
    }
  );
}

/**
 * Tool to get vehicle details by ID or registration number
 */
export function createGetVehicleDetailsTool(
  wfirmaService: WFirmaIntegrationService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      vehicleId,
      register,
    }: {
      vehicleId?: string;
      register?: string;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getVehicleTranslations(locale);

        // Get vehicle by ID or search by register
        let vehicle = null;

        if (vehicleId) {
          vehicle = await wfirmaService.getVehicle(vehicleId);
        } else if (register) {
          // Search by register
          const vehicles = await wfirmaService.findVehicles({
            search: register,
            limit: 10,
          });

          if (vehicles.length === 0) {
            return t.notFoundByRegister;
          }

          // Try to find exact match by register
          const exactMatch = vehicles.find(
            (v) => v.register.toLowerCase() === register.toLowerCase()
          );

          if (exactMatch) {
            vehicle = exactMatch;
          } else if (vehicles.length === 1) {
            vehicle = vehicles[0];
          } else {
            return `${t.notFoundByRegister}\n\n${formatVehiclesList(vehicles, locale)}`;
          }
        }

        if (!vehicle) {
          return vehicleId ? t.notFoundById : t.notFoundByRegister;
        }

        await incrementWFirmaUsage(subscriptionService, userId);

        return formatVehicleDetails(vehicle, locale);
      } catch (error) {
        logger.error('Failed to get vehicle details', { error });
        const t = getVehicleTranslations(locale);
        return `Error: ${t.errorFetchDetails}`;
      }
    },
    {
      name: 'get_vehicle_details',
      description:
        'Get detailed information about a specific vehicle by ID or registration number. If registration number provided, will search for exact match.',
      schema: z.object({
        vehicleId: z.string().nullable().optional().describe('Vehicle ID from wFirma'),
        register: z
          .string()
          .nullable().optional()
          .describe('Vehicle registration number (e.g., WA12345)'),
      }),
    }
  );
}

/**
 * Tool to create a new vehicle in wFirma
 */
export function createAddVehicleTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      name,
      register,
      type,
      ownership,
      truckType,
      taxPurpose,
      vatLeasingBelowLimit,
      vatLeasingDate,
      vatLeasingValue,
    }: {
      name: string;
      register: string;
      type: string;
      ownership: string;
      truckType?: string;
      taxPurpose?: string;
      vatLeasingBelowLimit?: boolean;
      vatLeasingDate?: string;
      vatLeasingValue?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const vehicleData = {
          name,
          register,
          type: type as any,
          ownership: ownership as any,
          truckType: truckType as any,
          taxPurpose: taxPurpose as any,
          vatLeasingBelowLimit,
          vatLeasingDate: vatLeasingDate ? new Date(vatLeasingDate) : undefined,
          vatLeasingValue,
        };

        const vehicle = await wfirmaService.createVehicle(vehicleData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'vehicle');

        return formatVehicleCreated(vehicle, locale);
      } catch (error) {
        logger.error('Failed to create vehicle', { error });
        const t = getVehicleTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- name (Vehicle name)
- register (Registration number)
- type (truck/car/motor/motor-bike)
- ownership (leasing/private/other)

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'add_vehicle',
      description:
        'Create a new vehicle in wFirma. Required: name, register, type, ownership. Optional: truckType (for trucks), taxPurpose, leasing information.',
      schema: z.object({
        name: z.string().describe('Vehicle name/description (required)'),
        register: z.string().describe('Registration number (e.g., WA12345) (required)'),
        type: z
          .enum(['truck', 'car', 'motor', 'motor-bike'])
          .describe('Vehicle type (required)'),
        ownership: z
          .enum(['leasing', 'private', 'other'])
          .describe('Ownership form (required)'),
        truckType: z
          .enum(['normal', 'quasi'])
          .nullable().optional()
          .describe('Truck type: normal (above 3.5t) or quasi (below 3.5t)'),
        taxPurpose: z
          .enum(['mixed', 'company'])
          .nullable().optional()
          .describe('Usage: mixed or company only'),
        vatLeasingBelowLimit: z
          .boolean()
          .nullable().optional()
          .describe('Is vehicle value below 150k PLN?'),
        vatLeasingDate: z
          .string()
          .nullable().optional()
          .describe('Lease agreement date in YYYY-MM-DD format'),
        vatLeasingValue: z
          .number()
          .nullable().optional()
          .describe('Vehicle value (for leasing)'),
      }),
    }
  );
}

/**
 * Tool to update an existing vehicle in wFirma
 */
export function createUpdateVehicleTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      vehicleId,
      register,
      name,
      newRegister,
      type,
      ownership,
      truckType,
      taxPurpose,
      vatLeasingBelowLimit,
      vatLeasingDate,
      vatLeasingValue,
    }: {
      vehicleId?: string;
      register?: string;
      name?: string;
      newRegister?: string;
      type?: string;
      ownership?: string;
      truckType?: string;
      taxPurpose?: string;
      vatLeasingBelowLimit?: boolean;
      vatLeasingDate?: string;
      vatLeasingValue?: number;
    }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getVehicleTranslations(locale);

        // Find vehicle by ID or register
        let targetVehicleId = vehicleId;

        if (!targetVehicleId && register) {
          const vehicles = await wfirmaService.findVehicles({
            search: register,
            limit: 10,
          });

          if (vehicles.length === 0) {
            return t.notFoundByRegister;
          }

          const exactMatch = vehicles.find(
            (v) => v.register.toLowerCase() === register.toLowerCase()
          );

          if (exactMatch) {
            targetVehicleId = exactMatch.id;
          } else if (vehicles.length === 1) {
            targetVehicleId = vehicles[0].id;
          } else {
            return `${t.notFoundByRegister}\n\n${formatVehiclesList(vehicles, locale)}`;
          }
        }

        if (!targetVehicleId) {
          return t.notFoundById;
        }

        // Build update data
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (newRegister !== undefined) updateData.register = newRegister;
        if (type !== undefined) updateData.type = type;
        if (ownership !== undefined) updateData.ownership = ownership;
        if (truckType !== undefined) updateData.truckType = truckType;
        if (taxPurpose !== undefined) updateData.taxPurpose = taxPurpose;
        if (vatLeasingBelowLimit !== undefined)
          updateData.vatLeasingBelowLimit = vatLeasingBelowLimit;
        if (vatLeasingDate !== undefined)
          updateData.vatLeasingDate = new Date(vatLeasingDate);
        if (vatLeasingValue !== undefined) updateData.vatLeasingValue = vatLeasingValue;

        const vehicle = await wfirmaService.updateVehicle(targetVehicleId, updateData);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'vehicle');

        return formatVehicleUpdated(vehicle, locale);
      } catch (error) {
        logger.error('Failed to update vehicle', { error });
        const t = getVehicleTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorUpdate}

**${t.errorReason}:** ${error.message}

${t.tryAgain}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
    {
      name: 'update_vehicle',
      description:
        'Update an existing vehicle in wFirma. Identify vehicle by vehicleId or register. All fields are optional - only provided fields will be updated.',
      schema: z.object({
        vehicleId: z.string().nullable().optional().describe('Vehicle ID (if known)'),
        register: z
          .string()
          .nullable().optional()
          .describe('Current registration number (to find vehicle)'),
        name: z.string().nullable().optional().describe('New vehicle name'),
        newRegister: z.string().nullable().optional().describe('New registration number'),
        type: z
          .enum(['truck', 'car', 'motor', 'motor-bike'])
          .nullable().optional()
          .describe('New vehicle type'),
        ownership: z
          .enum(['leasing', 'private', 'other'])
          .nullable().optional()
          .describe('New ownership form'),
        truckType: z.enum(['normal', 'quasi']).nullable().optional().describe('New truck type'),
        taxPurpose: z.enum(['mixed', 'company']).nullable().optional().describe('New usage purpose'),
        vatLeasingBelowLimit: z
          .boolean()
          .nullable().optional()
          .describe('Update value below 150k PLN'),
        vatLeasingDate: z
          .string()
          .nullable().optional()
          .describe('New lease date (YYYY-MM-DD)'),
        vatLeasingValue: z.number().nullable().optional().describe('New vehicle value'),
      }),
    }
  );
}

/**
 * Tool to delete a vehicle from wFirma
 */
export function createDeleteVehicleTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ vehicleId, register }: { vehicleId?: string; register?: string }) => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        const t = getVehicleTranslations(locale);

        // Find vehicle by ID or register
        let targetVehicle = null;
        let targetVehicleId = vehicleId;

        if (!targetVehicleId && register) {
          const vehicles = await wfirmaService.findVehicles({
            search: register,
            limit: 10,
          });

          if (vehicles.length === 0) {
            return t.notFoundByRegister;
          }

          const exactMatch = vehicles.find(
            (v) => v.register.toLowerCase() === register.toLowerCase()
          );

          if (exactMatch) {
            targetVehicle = exactMatch;
            targetVehicleId = exactMatch.id;
          } else if (vehicles.length === 1) {
            targetVehicle = vehicles[0];
            targetVehicleId = vehicles[0].id;
          } else {
            return `${t.notFoundByRegister}\n\n${formatVehiclesList(vehicles, locale)}`;
          }
        } else if (targetVehicleId) {
          targetVehicle = await wfirmaService.getVehicle(targetVehicleId);
        }

        if (!targetVehicle || !targetVehicleId) {
          return vehicleId ? t.notFoundById : t.notFoundByRegister;
        }

        await wfirmaService.deleteVehicle(targetVehicleId);

        await incrementWFirmaUsage(subscriptionService, userId);

        await cacheService.invalidateCache(userId, 'vehicle');

        return formatVehicleDeleted(targetVehicle, locale);
      } catch (error) {
        logger.error('Failed to delete vehicle', { error });
        const t = getVehicleTranslations(locale);
        if (error instanceof Error) {
          return `## ❌ ${t.errorDelete}

**${t.errorReason}:** ${error.message}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_vehicle',
      description:
        'Delete a vehicle from wFirma. WARNING: This action cannot be undone. Identify vehicle by vehicleId or register.',
      schema: z.object({
        vehicleId: z.string().nullable().optional().describe('Vehicle ID (if known)'),
        register: z
          .string()
          .nullable().optional()
          .describe('Registration number (to find vehicle)'),
      }),
    }
  );
}
