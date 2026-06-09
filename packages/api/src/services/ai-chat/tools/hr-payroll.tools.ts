/**
 * HR Payroll Tools
 * LangChain tools for payroll calculation and record management
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getHRTranslations, Locale } from '../../../i18n';
import { HRService } from '../../hr';
import {
  formatPayrollCalculation,
  formatPayrollRecordCreated,
  formatPayrollRecords,
} from '../formatters';
import { sanitizeForPrompt } from '../utils';

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
          return `Error: ${t.errorFetch} - ${sanitizeForPrompt(error.message)}`;
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
          return `Error: ${t.errorCreate} - ${sanitizeForPrompt(error.message)}`;
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
          return `Error: ${t.errorDelete} - ${sanitizeForPrompt(error.message)}`;
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
