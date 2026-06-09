/**
 * HR Contract Tools
 * LangChain tools for employment contract management
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getHRTranslations, Locale } from '../../../i18n';
import { HRService } from '../../hr';
import { PaymentType } from '../../../types/hr.types';
import { formatContractsList } from '../formatters';
import { sanitizeForPrompt } from '../utils';

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

**${t.errorReason}:** ${sanitizeForPrompt(error.message)}

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
          return `Error: ${t.errorUpdate} - ${sanitizeForPrompt(error.message)}`;
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
