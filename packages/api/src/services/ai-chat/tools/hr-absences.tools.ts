/**
 * HR Absence & Summary Tools
 * LangChain tools for absence management and HR overview
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getHRTranslations, Locale } from '../../../i18n';
import { HRService } from '../../hr';
import { AbsenceType } from '../../../types/hr.types';
import { formatAbsencesList, formatHRSummary } from '../formatters';
import { sanitizeForPrompt } from '../utils';

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

**${t.errorReason}:** ${sanitizeForPrompt(error.message)}

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
