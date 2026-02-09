/**
 * HR Service - Facade for employee management, contracts, payroll, and absences.
 *
 * All methods enforce data isolation by filtering on userId. Payroll
 * calculations delegate to the pure calculator functions in
 * payroll-calculator.ts using the default tax configuration.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import { getDefaultTaxConfig } from './tax-config';
import {
  calculateEmploymentPayroll,
  calculateMandatePayroll,
  calculateWorkContractPayroll,
  calculateBoardResolutionPayroll,
  calculateDividendPayroll,
  PayrollCalculation,
} from './payroll-calculator';
import type {
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeFilters,
  CreateContractData,
  UpdateContractData,
  ContractFilters,
  PayrollFilters,
  CreateAbsenceData,
  UpdateAbsenceData,
  AbsenceFilters,
} from '../../types/hr.types';

// ============================================
// HRService
// ============================================

export class HRService {
  constructor(private readonly prisma: PrismaClient) {}

  // ------------------------------------------
  // EMPLOYEES
  // ------------------------------------------

  /**
   * List employees with optional search, pagination, and sorting.
   * Excludes soft-deleted records by default.
   */
  async getEmployees(userId: string, filters?: Partial<EmployeeFilters>) {
    logger.info('HRService.getEmployees', { userId, filters });

    const {
      search,
      isActive,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters ?? {};

    const where: Prisma.EmployeeWhereInput = {
      userId,
      deletedAt: null,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { pesel: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Get a single employee by id, including their contracts.
   */
  async getEmployeeById(userId: string, id: string) {
    logger.info('HRService.getEmployeeById', { userId, id });

    const employee = await this.prisma.employee.findFirst({
      where: { id, userId, deletedAt: null },
      include: { contracts: true },
    });

    if (!employee) {
      return null;
    }

    return employee;
  }

  /**
   * Create a new employee.
   */
  async createEmployee(userId: string, data: CreateEmployeeData) {
    logger.info('HRService.createEmployee', { userId, firstName: data.firstName, lastName: data.lastName });

    const employee = await this.prisma.employee.create({
      data: {
        ...data,
        userId,
      },
    });

    return employee;
  }

  /**
   * Update an existing employee.
   */
  async updateEmployee(userId: string, id: string, data: UpdateEmployeeData) {
    logger.info('HRService.updateEmployee', { userId, id });

    const existing = await this.prisma.employee.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
    });

    return updated;
  }

  /**
   * Soft-delete an employee by setting deletedAt and isActive=false.
   */
  async deleteEmployee(userId: string, id: string) {
    logger.info('HRService.deleteEmployee', { userId, id });

    const existing = await this.prisma.employee.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      return null;
    }

    const deleted = await this.prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return deleted;
  }

  // ------------------------------------------
  // CONTRACTS
  // ------------------------------------------

  /**
   * List contracts with optional filtering by employee, type, and status.
   */
  async getContracts(userId: string, filters?: Partial<ContractFilters>) {
    logger.info('HRService.getContracts', { userId, filters });

    const {
      employeeId,
      type,
      status,
      activeOnly = false,
      limit = 20,
      offset = 0,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = filters ?? {};

    const where: Prisma.EmploymentContractWhereInput = {
      employee: { userId, deletedAt: null },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (activeOnly) {
      where.status = 'active';
    }

    const [data, total] = await Promise.all([
      this.prisma.employmentContract.findMany({
        where,
        include: { employee: true },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      this.prisma.employmentContract.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Get a single contract by id, including its employee.
   */
  async getContractById(userId: string, id: string) {
    logger.info('HRService.getContractById', { userId, id });

    const contract = await this.prisma.employmentContract.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
      include: { employee: true },
    });

    if (!contract) {
      return null;
    }

    return contract;
  }

  /**
   * Create a new contract. Verifies the employee belongs to the user.
   */
  async createContract(userId: string, data: CreateContractData) {
    logger.info('HRService.createContract', { userId, employeeId: data.employeeId, type: data.type });

    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, userId, deletedAt: null },
    });

    if (!employee) {
      throw new Error(`Employee ${data.employeeId} not found or does not belong to user`);
    }

    const contract = await this.prisma.employmentContract.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        status: data.status ?? 'draft',
        position: data.position,
        department: data.department,
        startDate: data.startDate,
        endDate: data.endDate,
        baseSalaryGross: data.baseSalaryGross,
        workHoursPerWeek: data.workHoursPerWeek,
        costDeductionRate: data.costDeductionRate,
        notes: data.notes,
      },
      include: { employee: true },
    });

    return contract;
  }

  /**
   * Update an existing contract.
   */
  async updateContract(userId: string, id: string, data: UpdateContractData) {
    logger.info('HRService.updateContract', { userId, id });

    const existing = await this.prisma.employmentContract.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.employmentContract.update({
      where: { id },
      data,
      include: { employee: true },
    });

    return updated;
  }

  /**
   * Terminate a contract by setting status to 'terminated' and recording the end date.
   */
  async terminateContract(userId: string, id: string, endDate: Date) {
    logger.info('HRService.terminateContract', { userId, id, endDate });

    const existing = await this.prisma.employmentContract.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
    });

    if (!existing) {
      return null;
    }

    const terminated = await this.prisma.employmentContract.update({
      where: { id },
      data: {
        status: 'terminated',
        endDate,
      },
      include: { employee: true },
    });

    return terminated;
  }

  // ------------------------------------------
  // PAYROLL
  // ------------------------------------------

  /**
   * Calculate payroll for a contract and period without saving.
   * Selects the appropriate calculator based on contract type.
   */
  async calculatePayroll(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ): Promise<PayrollCalculation> {
    logger.info('HRService.calculatePayroll', { userId, contractId, period, bonuses, deductions });

    const contract = await this.prisma.employmentContract.findFirst({
      where: {
        id: contractId,
        employee: { userId, deletedAt: null },
      },
      include: { employee: true },
    });

    if (!contract) {
      throw new Error(`Contract ${contractId} not found or does not belong to user`);
    }

    const grossAmount = Number(contract.baseSalaryGross) + bonuses - deductions;
    const config = getDefaultTaxConfig();
    const costRate = contract.costDeductionRate
      ? Number(contract.costDeductionRate) / 100
      : 0.20;

    switch (contract.type) {
      case 'employment': {
        // For employment contracts, compute YTD income for ZUS cap
        const ytdIncome = await this.getYtdIncome(contract.employeeId, period);
        return calculateEmploymentPayroll(grossAmount, config, ytdIncome);
      }

      case 'mandate_contract':
        return calculateMandatePayroll(grossAmount, config, costRate);

      case 'work_contract':
        return calculateWorkContractPayroll(grossAmount, config, costRate);

      case 'board_resolution':
        return calculateBoardResolutionPayroll(grossAmount, config);

      case 'dividend':
        return calculateDividendPayroll(grossAmount, config);

      default:
        throw new Error(`Unsupported contract type: ${contract.type}`);
    }
  }

  /**
   * Calculate payroll AND save the result as a PayrollRecord.
   */
  async savePayrollRecord(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ) {
    logger.info('HRService.savePayrollRecord', { userId, contractId, period });

    const contract = await this.prisma.employmentContract.findFirst({
      where: {
        id: contractId,
        employee: { userId, deletedAt: null },
      },
      include: { employee: true },
    });

    if (!contract) {
      throw new Error(`Contract ${contractId} not found or does not belong to user`);
    }

    const calculation = await this.calculatePayroll(userId, contractId, period, bonuses, deductions);

    const record = await this.prisma.payrollRecord.create({
      data: {
        employeeId: contract.employeeId,
        contractId,
        period,
        grossAmount: calculation.gross,
        bonuses,
        deductions,
        zusEmerytalne: calculation.zusEmployee.emerytalne,
        zusRentowe: calculation.zusEmployee.rentowe,
        zusChorobowe: calculation.zusEmployee.chorobowe,
        zusZdrowotne: calculation.zusEmployee.zdrowotne,
        zusEmerytalneEmployer: calculation.zusEmployer.emerytalne,
        zusRentoweEmployer: calculation.zusEmployer.rentowe,
        zusWypadkowe: calculation.zusEmployer.wypadkowe,
        zusFP: calculation.zusEmployer.fp,
        zusFGSP: calculation.zusEmployer.fgsp,
        taxBase: calculation.taxBase,
        incomeTax: calculation.incomeTax,
        netAmount: calculation.net,
        totalEmployerCost: calculation.totalEmployerCost,
      },
      include: {
        employee: true,
        contract: true,
      },
    });

    return record;
  }

  /**
   * List payroll records with filtering.
   */
  async getPayrollRecords(userId: string, filters?: Partial<PayrollFilters>) {
    logger.info('HRService.getPayrollRecords', { userId, filters });

    const {
      employeeId,
      contractId,
      period,
      periodFrom,
      periodTo,
      isPaid,
      limit = 20,
      offset = 0,
      sortBy = 'period',
      sortOrder = 'desc',
    } = filters ?? {};

    const where: Prisma.PayrollRecordWhereInput = {
      employee: { userId, deletedAt: null },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (period) {
      where.period = period;
    }

    if (periodFrom || periodTo) {
      where.period = {
        ...(periodFrom ? { gte: periodFrom } : {}),
        ...(periodTo ? { lte: periodTo } : {}),
      };
    }

    if (isPaid === true) {
      where.paidAt = { not: null };
    } else if (isPaid === false) {
      where.paidAt = null;
    }

    const [data, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where,
        include: { employee: true, contract: true },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      this.prisma.payrollRecord.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Delete a payroll record.
   */
  async deletePayrollRecord(userId: string, id: string) {
    logger.info('HRService.deletePayrollRecord', { userId, id });

    const existing = await this.prisma.payrollRecord.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
    });

    if (!existing) {
      return null;
    }

    await this.prisma.payrollRecord.delete({ where: { id } });

    return { success: true, id };
  }

  // ------------------------------------------
  // ABSENCES
  // ------------------------------------------

  /**
   * List absences with filtering.
   */
  async getAbsences(userId: string, filters?: Partial<AbsenceFilters>) {
    logger.info('HRService.getAbsences', { userId, filters });

    const {
      employeeId,
      type,
      approved,
      startDateFrom,
      startDateTo,
      year,
      month,
      limit = 20,
      offset = 0,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = filters ?? {};

    const where: Prisma.AbsenceWhereInput = {
      employee: { userId, deletedAt: null },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (approved !== undefined) {
      where.approved = approved;
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {
        ...(startDateFrom ? { gte: startDateFrom } : {}),
        ...(startDateTo ? { lte: startDateTo } : {}),
      };
    }

    if (year) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);

      if (month) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 1);
        where.startDate = { gte: monthStart, lt: monthEnd };
      } else {
        where.startDate = { gte: yearStart, lt: yearEnd };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.absence.findMany({
        where,
        include: { employee: true },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      this.prisma.absence.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Create a new absence. Verifies the employee belongs to the user.
   */
  async createAbsence(userId: string, data: CreateAbsenceData) {
    logger.info('HRService.createAbsence', { userId, employeeId: data.employeeId, type: data.type });

    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, userId, deletedAt: null },
    });

    if (!employee) {
      throw new Error(`Employee ${data.employeeId} not found or does not belong to user`);
    }

    const absence = await this.prisma.absence.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        businessDays: data.businessDays,
        notes: data.notes,
        approved: data.approved ?? false,
      },
      include: { employee: true },
    });

    return absence;
  }

  /**
   * Update an existing absence.
   */
  async updateAbsence(userId: string, id: string, data: UpdateAbsenceData) {
    logger.info('HRService.updateAbsence', { userId, id });

    const existing = await this.prisma.absence.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.absence.update({
      where: { id },
      data,
      include: { employee: true },
    });

    return updated;
  }

  /**
   * Delete an absence record.
   */
  async deleteAbsence(userId: string, id: string) {
    logger.info('HRService.deleteAbsence', { userId, id });

    const existing = await this.prisma.absence.findFirst({
      where: {
        id,
        employee: { userId, deletedAt: null },
      },
    });

    if (!existing) {
      return null;
    }

    await this.prisma.absence.delete({ where: { id } });

    return { success: true, id };
  }

  /**
   * Calculate remaining vacation days for an employee in a given year.
   * Assumes 26 days per year for full-time employment.
   */
  async getVacationBalance(userId: string, employeeId: string, year: number) {
    logger.info('HRService.getVacationBalance', { userId, employeeId, year });

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, userId, deletedAt: null },
    });

    if (!employee) {
      throw new Error(`Employee ${employeeId} not found or does not belong to user`);
    }

    const totalEntitlement = 26;

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const usedAbsences = await this.prisma.absence.aggregate({
      where: {
        employeeId,
        type: 'vacation',
        startDate: { gte: yearStart, lt: yearEnd },
      },
      _sum: {
        businessDays: true,
      },
    });

    const usedDays = usedAbsences._sum.businessDays ?? 0;
    const remaining = totalEntitlement - usedDays;

    return {
      employeeId,
      year,
      totalEntitlement,
      usedDays,
      remaining,
    };
  }

  // ------------------------------------------
  // SUMMARY
  // ------------------------------------------

  /**
   * Get an HR summary: employee count, active contracts by type,
   * and total monthly payroll cost.
   */
  async getHRSummary(userId: string) {
    logger.info('HRService.getHRSummary', { userId });

    const [
      employeeCount,
      activeContracts,
      latestPayroll,
    ] = await Promise.all([
      // Total active employees
      this.prisma.employee.count({
        where: { userId, isActive: true, deletedAt: null },
      }),

      // Active contracts grouped by type
      this.prisma.employmentContract.groupBy({
        by: ['type'],
        where: {
          status: 'active',
          employee: { userId, deletedAt: null },
        },
        _count: { id: true },
      }),

      // Total monthly payroll from the latest period
      this.prisma.payrollRecord.aggregate({
        where: {
          employee: { userId, deletedAt: null },
        },
        _sum: {
          totalEmployerCost: true,
          grossAmount: true,
          netAmount: true,
        },
        _max: {
          period: true,
        },
      }),
    ]);

    const contractsByType: Record<string, number> = {};
    for (const row of activeContracts) {
      contractsByType[row.type] = row._count.id;
    }

    // Get payroll totals for the latest period only
    let totalMonthlyPayroll = 0;
    const latestPeriod = latestPayroll._max.period;

    if (latestPeriod) {
      const periodPayroll = await this.prisma.payrollRecord.aggregate({
        where: {
          employee: { userId, deletedAt: null },
          period: latestPeriod,
        },
        _sum: {
          totalEmployerCost: true,
        },
      });
      totalMonthlyPayroll = Number(periodPayroll._sum.totalEmployerCost ?? 0);
    }

    return {
      employeeCount,
      activeContractsByType: contractsByType,
      latestPeriod: latestPeriod ?? null,
      totalMonthlyPayroll,
    };
  }

  // ------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------

  /**
   * Sum gross amounts from PayrollRecord for the same employee in the same
   * year, for months before the given period. Used as ytdIncome input to the
   * employment payroll calculator for the ZUS annual cap.
   *
   * @param employeeId - The employee uuid
   * @param period     - Current period in "YYYY-MM" format
   * @returns Year-to-date gross income before this period
   */
  private async getYtdIncome(employeeId: string, period: string): Promise<number> {
    const year = period.substring(0, 4);
    const periodStart = `${year}-01`;

    const result = await this.prisma.payrollRecord.aggregate({
      where: {
        employeeId,
        period: {
          gte: periodStart,
          lt: period,
        },
      },
      _sum: {
        grossAmount: true,
      },
    });

    return Number(result._sum.grossAmount ?? 0);
  }
}
