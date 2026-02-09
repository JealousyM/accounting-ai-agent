  /**
 * HR Tools
 * LangChain tools for employee management, contracts, payroll, and absences
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getHRTranslations, Locale } from '../../../i18n';
import { HRService } from '../../hr';
import { PaymentType, AbsenceType } from '../../../types/hr.types';
import {
  formatEmployeesList,
  formatEmployeeDetails,
  formatEmployeeCreated,
  formatEmployeeUpdated,
  formatEmployeeDeleted,
  formatContractsList,
  formatPayrollCalculation,
  formatPayrollRecordCreated,
  formatPayrollRecords,
  formatAbsencesList,
  formatHRSummary,
} from '../formatters';

// ============================================
// 1. GET EMPLOYEES
// ============================================

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

// ============================================
// 2. GET EMPLOYEE DETAILS
// ============================================

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

// ============================================
// 3. ADD EMPLOYEE
// ============================================

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

**${t.errorReason}:** ${error.message}

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

// ============================================
// 4. UPDATE EMPLOYEE
// ============================================

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
          return `Error: ${t.errorUpdate} - ${error.message}`;
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

// ============================================
// 5. DELETE EMPLOYEE
// ============================================

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
          return `Error: ${t.errorDelete} - ${error.message}`;
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

// ============================================
// 6. GET HR CONTRACTS
// ============================================

export function createGetHRContractsTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      employeeId,
      status,
      type,
      limit,
    }: {
      employeeId?: string;
      status?: string;
      type?: string;
      limit?: number;
    }) => {
      try {
        const filters: Record<string, unknown> = {};
        if (employeeId) filters.employeeId = employeeId;
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (limit) filters.limit = limit;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await hrService.getContracts(userId, filters as any);

        logger.info('Fetched HR contracts for AI tool', { count: result.data.length, total: result.total });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatContractsList(result.data as any, locale);
      } catch (error) {
        logger.error('Failed to get HR contracts', { error });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_hr_contracts',
      description: 'Get list of employment contracts. Can filter by employee, status (draft/active/terminated/expired), and type (employment/mandate_contract/work_contract/board_resolution/dividend).',
      schema: z.object({
        employeeId: z.string().nullable().optional().describe('Filter by employee ID (UUID)'),
        status: z.enum(['draft', 'active', 'terminated', 'expired']).nullable().optional().describe('Filter by contract status'),
        type: z.enum(['employment', 'mandate_contract', 'work_contract', 'board_resolution', 'dividend']).nullable().optional().describe('Filter by contract type'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 20)'),
      }),
    }
  );
}

// ============================================
// 7. ADD HR CONTRACT
// ============================================

export function createAddHRContractTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      employeeId,
      type,
      position,
      startDate,
      baseSalaryGross,
      workHoursPerWeek,
      costDeductionRate,
      endDate,
    }: {
      employeeId: string;
      type: string;
      position?: string;
      startDate: string;
      baseSalaryGross: number;
      workHoursPerWeek?: number;
      costDeductionRate?: number;
      endDate?: string;
    }) => {
      try {
        const contractData = {
          employeeId,
          type: type as PaymentType,
          status: 'active' as const,
          position: position || undefined,
          startDate: new Date(startDate),
          baseSalaryGross,
          workHoursPerWeek: workHoursPerWeek || undefined,
          costDeductionRate: costDeductionRate || undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contract = await hrService.createContract(userId, contractData as any);

        logger.info('Created HR contract for AI tool', { contractId: contract.id, employeeId });
        const t = getHRTranslations(locale);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contractsList = formatContractsList([contract] as any, locale);
        return `## ${t.created}

${contractsList}

> ${t.createdHint}`;
      } catch (error) {
        logger.error('Failed to create HR contract', { error, employeeId });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- employeeId
- type
- startDate
- baseSalaryGross

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'add_hr_contract',
      description: 'Create a new employment contract for an employee. Required: employeeId, type, startDate, baseSalaryGross. The contract is created with status "active".',
      schema: z.object({
        employeeId: z.string().describe('Employee ID (UUID) to assign the contract to'),
        type: z.enum(['employment', 'mandate_contract', 'work_contract', 'board_resolution', 'dividend']).describe('Contract type: employment (umowa o prace), mandate_contract (umowa zlecenie), work_contract (umowa o dzielo), board_resolution (uchwala zarzadu), dividend (dywidenda)'),
        position: z.string().nullable().optional().describe('Job position/title for this contract'),
        startDate: z.string().describe('Contract start date (YYYY-MM-DD format)'),
        baseSalaryGross: z.number().describe('Base gross salary in PLN'),
        workHoursPerWeek: z.number().nullable().optional().describe('Work hours per week (e.g., 40)'),
        costDeductionRate: z.number().nullable().optional().describe('Cost deduction rate as percentage (e.g., 20 or 50 for copyright)'),
        endDate: z.string().nullable().optional().describe('Contract end date (YYYY-MM-DD format), if fixed-term'),
      }),
    }
  );
}

// ============================================
// 8. TERMINATE HR CONTRACT
// ============================================

export function createTerminateHRContractTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ id, endDate }: { id: string; endDate: string }) => {
      try {
        const contract = await hrService.terminateContract(userId, id, new Date(endDate));

        if (!contract) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        logger.info('Terminated HR contract for AI tool', { contractId: id });
        const t = getHRTranslations(locale);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contractsList = formatContractsList([contract] as any, locale);
        return `## ${t.terminated}

${contractsList}

> ${t.deletedWarning}`;
      } catch (error) {
        logger.error('Failed to terminate HR contract', { error, id });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorUpdate} - ${error.message}`;
        }
        return `Error: ${t.errorUpdate}`;
      }
    },
    {
      name: 'terminate_hr_contract',
      description: 'Terminate an employment contract by setting its status to "terminated" and recording the end date. Use when an employee is leaving or a contract is ending.',
      schema: z.object({
        id: z.string().describe('Contract ID (UUID) to terminate'),
        endDate: z.string().describe('Contract termination/end date (YYYY-MM-DD format)'),
      }),
    }
  );
}

// ============================================
// 9. CALCULATE PAYROLL
// ============================================

export function createCalculatePayrollTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      contractId,
      period,
      bonuses,
      deductions,
    }: {
      contractId: string;
      period: string;
      bonuses?: number;
      deductions?: number;
    }) => {
      try {
        // Get contract details for display (employee name and contract type)
        const contract = await hrService.getContractById(userId, contractId);

        if (!contract) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        const employeeName = contract.employee
          ? `${contract.employee.firstName} ${contract.employee.lastName}`
          : '-';

        const calculation = await hrService.calculatePayroll(
          userId,
          contractId,
          period,
          bonuses || 0,
          deductions || 0,
        );

        logger.info('Calculated payroll for AI tool', { contractId, period });

        // Map the PayrollCalculation from payroll-calculator to the format expected by the formatter
        const formatterData = {
          grossAmount: calculation.gross,
          zusEmerytalne: calculation.zusEmployee.emerytalne,
          zusRentowe: calculation.zusEmployee.rentowe,
          zusChorobowe: calculation.zusEmployee.chorobowe,
          zusZdrowotne: calculation.zusEmployee.zdrowotne,
          zusEmployeeTotal: calculation.zusEmployee.total,
          zusEmerytalneEmployer: calculation.zusEmployer.emerytalne,
          zusRentoweEmployer: calculation.zusEmployer.rentowe,
          zusWypadkowe: calculation.zusEmployer.wypadkowe,
          zusFP: calculation.zusEmployer.fp,
          zusFGSP: calculation.zusEmployer.fgsp,
          zusEmployerTotal: calculation.zusEmployer.total,
          taxBase: calculation.taxBase,
          incomeTax: calculation.incomeTax,
          netAmount: calculation.net,
          totalEmployerCost: calculation.totalEmployerCost,
        };

        const t = getHRTranslations(locale);
        const typeMap: Record<string, string> = {
          employment: t.employment,
          mandate_contract: t.mandateContract,
          work_contract: t.workContract,
          board_resolution: t.boardResolution,
          dividend: t.dividend,
        };
        const contractTypeName = typeMap[contract.type] || contract.type;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatPayrollCalculation(formatterData as any, employeeName, period, contractTypeName, locale);
      } catch (error) {
        logger.error('Failed to calculate payroll', { error, contractId, period });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorFetch} - ${error.message}`;
        }
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'calculate_payroll',
      description: 'Calculate payroll for a specific contract and period. Shows full breakdown: gross salary, ZUS contributions (employee and employer), income tax, net salary, and total employer cost. Does NOT save the record - use this for preview/estimation.',
      schema: z.object({
        contractId: z.string().describe('Contract ID (UUID) to calculate payroll for'),
        period: z.string().describe('Payroll period in YYYY-MM format (e.g., 2026-02)'),
        bonuses: z.number().nullable().optional().describe('Additional bonuses in PLN (default 0)'),
        deductions: z.number().nullable().optional().describe('Deductions in PLN (default 0)'),
      }),
    }
  );
}

// ============================================
// 9b. SAVE PAYROLL RECORD
// ============================================

export function createSavePayrollRecordTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      contractId,
      period,
      bonuses,
      deductions,
    }: {
      contractId: string;
      period: string;
      bonuses?: number;
      deductions?: number;
    }) => {
      try {
        const contract = await hrService.getContractById(userId, contractId);

        if (!contract) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        const employeeName = contract.employee
          ? `${contract.employee.firstName} ${contract.employee.lastName}`
          : '-';

        const record = await hrService.savePayrollRecord(
          userId,
          contractId,
          period,
          bonuses || 0,
          deductions || 0,
        );

        logger.info('Saved payroll record for AI tool', { contractId, period, recordId: record.id });

        const formatterData = {
          grossAmount: Number(record.grossAmount),
          zusEmerytalne: Number(record.zusEmerytalne),
          zusRentowe: Number(record.zusRentowe),
          zusChorobowe: Number(record.zusChorobowe),
          zusZdrowotne: Number(record.zusZdrowotne),
          zusEmployeeTotal: Number(record.zusEmerytalne) + Number(record.zusRentowe) + Number(record.zusChorobowe) + Number(record.zusZdrowotne),
          zusEmerytalneEmployer: Number(record.zusEmerytalneEmployer),
          zusRentoweEmployer: Number(record.zusRentoweEmployer),
          zusWypadkowe: Number(record.zusWypadkowe),
          zusFP: Number(record.zusFP),
          zusFGSP: Number(record.zusFGSP),
          zusEmployerTotal: Number(record.zusEmerytalneEmployer) + Number(record.zusRentoweEmployer) + Number(record.zusWypadkowe) + Number(record.zusFP) + Number(record.zusFGSP),
          taxBase: Number(record.taxBase),
          incomeTax: Number(record.incomeTax),
          netAmount: Number(record.netAmount),
          totalEmployerCost: Number(record.totalEmployerCost),
        };

        const t = getHRTranslations(locale);
        const typeMap: Record<string, string> = {
          employment: t.employment,
          mandate_contract: t.mandateContract,
          work_contract: t.workContract,
          board_resolution: t.boardResolution,
          dividend: t.dividend,
        };
        const contractTypeName = typeMap[contract.type] || contract.type;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatPayrollRecordCreated(formatterData as any, employeeName, period, contractTypeName, locale);
      } catch (error) {
        logger.error('Failed to save payroll record', { error, contractId, period });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorCreate} - ${error.message}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'save_payroll_record',
      description: 'Calculate payroll AND save the record to the system. Use this when the user wants to create/register/save a payroll entry. This performs the calculation and permanently stores the result in the database.',
      schema: z.object({
        contractId: z.string().describe('Contract ID (UUID) to calculate and save payroll for'),
        period: z.string().describe('Payroll period in YYYY-MM format (e.g., 2026-02)'),
        bonuses: z.number().nullable().optional().describe('Additional bonuses in PLN (default 0)'),
        deductions: z.number().nullable().optional().describe('Deductions in PLN (default 0)'),
      }),
    }
  );
}

// ============================================
// 9c. DELETE PAYROLL RECORD
// ============================================

export function createDeletePayrollRecordTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ id }: { id: string }) => {
      try {
        const result = await hrService.deletePayrollRecord(userId, id);

        if (!result) {
          const t = getHRTranslations(locale);
          return t.notFound;
        }

        logger.info('Deleted payroll record for AI tool', { payrollRecordId: id });
        const t = getHRTranslations(locale);
        return `## ${t.payrollDeleted}

- **${t.id}:** \`${id}\`

> ${t.payrollDeletedWarning}`;
      } catch (error) {
        logger.error('Failed to delete payroll record', { error, id });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `Error: ${t.errorDelete} - ${error.message}`;
        }
        return `Error: ${t.errorDelete}`;
      }
    },
    {
      name: 'delete_payroll_record',
      description: 'Delete a saved payroll record by its ID. WARNING: This permanently removes the record from the database and cannot be undone.',
      schema: z.object({
        id: z.string().describe('Payroll record ID (UUID) to delete'),
      }),
    }
  );
}

// ============================================
// 10. GET PAYROLL RECORDS
// ============================================

export function createGetPayrollRecordsTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      employeeId,
      period,
      periodFrom,
      periodTo,
      limit,
    }: {
      employeeId?: string;
      period?: string;
      periodFrom?: string;
      periodTo?: string;
      limit?: number;
    }) => {
      try {
        const filters: Record<string, unknown> = {};
        if (employeeId) filters.employeeId = employeeId;
        if (period) filters.period = period;
        if (periodFrom) filters.periodFrom = periodFrom;
        if (periodTo) filters.periodTo = periodTo;
        if (limit) filters.limit = limit;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await hrService.getPayrollRecords(userId, filters as any);

        logger.info('Fetched payroll records for AI tool', { count: result.data.length, total: result.total });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatPayrollRecords(result.data as any, locale);
      } catch (error) {
        logger.error('Failed to get payroll records', { error });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_payroll_records',
      description: 'Get list of saved payroll records. Can filter by employee, specific period, or period range. Shows gross, net amounts and payment status.',
      schema: z.object({
        employeeId: z.string().nullable().optional().describe('Filter by employee ID (UUID)'),
        period: z.string().nullable().optional().describe('Filter by exact period (YYYY-MM format)'),
        periodFrom: z.string().nullable().optional().describe('Period range start (YYYY-MM format, inclusive)'),
        periodTo: z.string().nullable().optional().describe('Period range end (YYYY-MM format, inclusive)'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 20)'),
      }),
    }
  );
}

// ============================================
// 11. ADD ABSENCE
// ============================================

export function createAddAbsenceTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      employeeId,
      type,
      startDate,
      endDate,
      businessDays,
      notes,
    }: {
      employeeId: string;
      type: string;
      startDate: string;
      endDate: string;
      businessDays: number;
      notes?: string;
    }) => {
      try {
        const absenceData = {
          employeeId,
          type: type as AbsenceType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          businessDays,
          notes: notes || undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const absence = await hrService.createAbsence(userId, absenceData as any);

        logger.info('Created absence for AI tool', { absenceId: absence.id, employeeId });
        const t = getHRTranslations(locale);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const absencesList = formatAbsencesList([absence] as any, locale);
        return `## ${t.created}

${absencesList}

> ${t.createdHint}`;
      } catch (error) {
        logger.error('Failed to create absence', { error, employeeId });
        const t = getHRTranslations(locale);
        if (error instanceof Error) {
          return `## ${t.errorCreateTitle}

**${t.errorReason}:** ${error.message}

**${t.requiredFields}:**
- employeeId
- type
- startDate
- endDate
- businessDays

${t.tryAgain}`;
        }
        return `Error: ${t.errorCreate}`;
      }
    },
    {
      name: 'add_absence',
      description: 'Record an absence (vacation, sick leave, maternity, unpaid, other) for an employee. Required: employeeId, type, startDate, endDate, businessDays.',
      schema: z.object({
        employeeId: z.string().describe('Employee ID (UUID) to record absence for'),
        type: z.enum(['vacation', 'sick_leave', 'maternity', 'unpaid', 'other']).describe('Absence type: vacation, sick_leave, maternity, unpaid, other'),
        startDate: z.string().describe('Absence start date (YYYY-MM-DD format)'),
        endDate: z.string().describe('Absence end date (YYYY-MM-DD format)'),
        businessDays: z.number().describe('Number of business days of absence'),
        notes: z.string().nullable().optional().describe('Additional notes about the absence'),
      }),
    }
  );
}

// ============================================
// 12. GET ABSENCES
// ============================================

export function createGetAbsencesTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({
      employeeId,
      type,
      year,
      limit,
    }: {
      employeeId?: string;
      type?: string;
      year?: number;
      limit?: number;
    }) => {
      try {
        const filters: Record<string, unknown> = {};
        if (employeeId) filters.employeeId = employeeId;
        if (type) filters.type = type;
        if (year) filters.year = year;
        if (limit) filters.limit = limit;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await hrService.getAbsences(userId, filters as any);

        logger.info('Fetched absences for AI tool', { count: result.data.length, total: result.total });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return formatAbsencesList(result.data as any, locale);
      } catch (error) {
        logger.error('Failed to get absences', { error });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_absences',
      description: 'Get list of employee absences. Can filter by employee, type (vacation/sick_leave/maternity/unpaid/other), and year.',
      schema: z.object({
        employeeId: z.string().nullable().optional().describe('Filter by employee ID (UUID)'),
        type: z.enum(['vacation', 'sick_leave', 'maternity', 'unpaid', 'other']).nullable().optional().describe('Filter by absence type'),
        year: z.number().nullable().optional().describe('Filter by year (e.g., 2026)'),
        limit: z.number().nullable().optional().describe('Maximum number of results (default 20)'),
      }),
    }
  );
}

// ============================================
// 13. GET HR SUMMARY
// ============================================

export function createGetHRSummaryTool(
  hrService: HRService,
  userId: string,
  locale: Locale,
): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const summary = await hrService.getHRSummary(userId);

        logger.info('Fetched HR summary for AI tool', { employeeCount: summary.employeeCount });

        return formatHRSummary({
          totalEmployees: summary.employeeCount,
          activeContractsByType: summary.activeContractsByType,
          totalPayrollFund: summary.totalMonthlyPayroll,
        }, locale);
      } catch (error) {
        logger.error('Failed to get HR summary', { error });
        const t = getHRTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_hr_summary',
      description: 'Get an HR overview/summary: total employees, active contracts by type, and total monthly payroll cost. Use when user asks for a general HR overview or dashboard.',
      schema: z.object({}),
    }
  );
}
