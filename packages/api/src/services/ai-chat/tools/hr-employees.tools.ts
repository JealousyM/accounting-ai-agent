/**
 * HR Employee Tools
 * LangChain tools for employee management (CRUD)
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getHRTranslations, Locale } from '../../../i18n';
import { HRService } from '../../hr';
import {
  formatEmployeesList,
  formatEmployeeDetails,
  formatEmployeeCreated,
  formatEmployeeUpdated,
  formatEmployeeDeleted,
} from '../formatters';
import { sanitizeForPrompt } from '../utils';

export function createGetEmployeesTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ search, isActive, limit }: { search?: string; isActive?: boolean; limit?: number }) => {
      try {
        const result = await hrService.getEmployees(userId, {
          search: search || undefined,
          isActive: isActive ?? undefined,
          limit: limit || 20,
        });

        logger.info('Fetched employees for AI tool', { count: result.data.length, total: result.total });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatEmployeesList(result.data as any, locale);
      } catch (error) {
        logger.error('Failed to get employees', { error });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_employees',
      description: 'Get list of employees. Can filter by name/email search, active status. Use when user asks about their employees or staff.',
      schema: z.object({
        search: z.string().nullable().optional().describe('Search by employee name, email, PESEL, or NIP'),
        isActive: z.boolean().nullable().optional().describe('Filter by active status (true = active, false = inactive)'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 20)'),
      }),
    }
  );
}

export function createGetEmployeeDetailsTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ id }: { id: string }) => {
      try {
        const employee = await hrService.getEmployeeById(userId, id);

        if (!employee) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        logger.info('Fetched employee details for AI tool', { employeeId: id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatEmployeeDetails(employee as any, locale);
      } catch (error) {
        logger.error('Failed to get employee details', { error, id });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_employee_details',
      description: 'Get detailed information about a specific employee by their ID. Returns personal data, contact info, and employment details.',
      schema: z.object({
        id: z.string().describe('Employee ID (UUID)'),
      }),
    }
  );
}

export function createAddEmployeeTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      firstName,
      lastName,
      pesel,
      nip,
      email,
      phone,
      street,
      city,
      zip,
      bankAccount,
      taxOffice,
      // position is accepted by schema but belongs to contracts, not employees
      position: _position,
      hiredAt,
    }: {
      firstName: string;
      lastName: string;
      pesel?: string;
      nip?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      zip?: string;
      bankAccount?: string;
      taxOffice?: string;
      position?: string;
      hiredAt?: string;
    }) => {
      try {
        const employeeData: Record<string, unknown> = {
          firstName,
          lastName,
        };

        if (pesel) employeeData.pesel = pesel;
        if (nip) employeeData.nip = nip;
        if (email) employeeData.email = email;
        if (phone) employeeData.phone = phone;
        if (street) employeeData.street = street;
        if (city) employeeData.city = city;
        if (zip) employeeData.zip = zip;
        if (bankAccount) employeeData.bankAccount = bankAccount;
        if (taxOffice) employeeData.taxOffice = taxOffice;
        if (hiredAt) employeeData.hiredAt = new Date(hiredAt);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const employee = await hrService.createEmployee(userId, employeeData as any);

        logger.info('Created employee for AI tool', { employeeId: employee.id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatEmployeeCreated(employee as any, locale);
      } catch (error) {
        logger.error('Failed to create employee', { error });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.errorCreateTitle}

**${t.errorReason}:** ${sanitizeForPrompt(error.message)}

**${t.requiredFields}:**
- firstName
- lastName

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'add_employee',
      description: 'Add a new employee to the system. Required: firstName, lastName. Optional: pesel, nip, email, phone, address fields, bankAccount, taxOffice, position, hiredAt.',
      schema: z.object({
        firstName: z.string().describe('Employee first name (required)'),
        lastName: z.string().describe('Employee last name (required)'),
        pesel: z.string().nullable().optional().describe('PESEL number (Polish national ID)'),
        nip: z.string().nullable().optional().describe('NIP (tax identification number)'),
        email: z.string().nullable().optional().describe('Email address'),
        phone: z.string().nullable().optional().describe('Phone number'),
        street: z.string().nullable().optional().describe('Street address'),
        city: z.string().nullable().optional().describe('City'),
        zip: z.string().nullable().optional().describe('Postal code (e.g., 00-001)'),
        bankAccount: z.string().nullable().optional().describe('Bank account number'),
        taxOffice: z.string().nullable().optional().describe('Tax office name'),
        position: z.string().nullable().optional().describe('Job position/title'),
        hiredAt: z.string().nullable().optional().describe('Hire date (YYYY-MM-DD format)'),
      }),
    }
  );
}

export function createUpdateEmployeeTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      id,
      firstName,
      lastName,
      pesel,
      nip,
      email,
      phone,
      street,
      city,
      zip,
      bankAccount,
      taxOffice,
      // position is accepted by schema but belongs to contracts, not employees
      position: _position,
      hiredAt,
      isActive,
    }: {
      id: string;
      firstName?: string;
      lastName?: string;
      pesel?: string;
      nip?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      zip?: string;
      bankAccount?: string;
      taxOffice?: string;
      position?: string;
      hiredAt?: string;
      isActive?: boolean;
    }) => {
      try {
        const updateData: Record<string, unknown> = {};

        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (pesel !== undefined) updateData.pesel = pesel;
        if (nip !== undefined) updateData.nip = nip;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (street !== undefined) updateData.street = street;
        if (city !== undefined) updateData.city = city;
        if (zip !== undefined) updateData.zip = zip;
        if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
        if (taxOffice !== undefined) updateData.taxOffice = taxOffice;
        if (hiredAt !== undefined) updateData.hiredAt = new Date(hiredAt);
        if (isActive !== undefined && isActive !== null) updateData.isActive = isActive;

        if (Object.keys(updateData).length === 0) {
          const t = getHRTranslations(locale);
          return `Error: ${t.errorUpdate} - No fields specified for update.`;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const employee = await hrService.updateEmployee(userId, id, updateData as any);

        if (!employee) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        logger.info('Updated employee for AI tool', { employeeId: id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatEmployeeUpdated(employee as any, locale);
      } catch (error) {
        logger.error('Failed to update employee', { error, id });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorUpdate} - ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
    {
      name: 'update_employee',
      description: 'Update an existing employee by ID. Specify only the fields that need to be changed.',
      schema: z.object({
        id: z.string().describe('Employee ID (UUID) to update'),
        firstName: z.string().nullable().optional().describe('New first name'),
        lastName: z.string().nullable().optional().describe('New last name'),
        pesel: z.string().nullable().optional().describe('New PESEL number'),
        nip: z.string().nullable().optional().describe('New NIP number'),
        email: z.string().nullable().optional().describe('New email address'),
        phone: z.string().nullable().optional().describe('New phone number'),
        street: z.string().nullable().optional().describe('New street address'),
        city: z.string().nullable().optional().describe('New city'),
        zip: z.string().nullable().optional().describe('New postal code'),
        bankAccount: z.string().nullable().optional().describe('New bank account number'),
        taxOffice: z.string().nullable().optional().describe('New tax office name'),
        position: z.string().nullable().optional().describe('New job position/title'),
        hiredAt: z.string().nullable().optional().describe('New hire date (YYYY-MM-DD format)'),
        isActive: z.boolean().nullable().optional().describe('Set active/inactive status'),
      }),
    }
  );
}

export function createDeleteEmployeeTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ id }: { id: string }) => {
      try {
        const employee = await hrService.deleteEmployee(userId, id);

        if (!employee) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        logger.info('Deleted employee for AI tool', { employeeId: id });
        return formatEmployeeDeleted(id, locale);
      } catch (error) {
        logger.error('Failed to delete employee', { error, id });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorDelete} - ${sanitizeForPrompt(error.message)}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_employee',
      description: 'Delete (soft-delete) an employee by ID. WARNING: This will deactivate the employee and mark them as deleted.',
      schema: z.object({
        id: z.string().describe('Employee ID (UUID) to delete'),
      }),
    }
  );
}
