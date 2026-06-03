/**
 * HR Service - Facade for employee management, contracts, payroll, and absences.
 *
 * All domain logic lives in the four focused services; this class delegates to them
 * so that routes and AI tools need no changes.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EmployeeService } from './employee.service';
import { ContractService } from './contract.service';
import { PayrollService } from './payroll.service';
import { AbsenceService } from './absence.service';
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
import type { PayrollCalculation } from './payroll-calculator';

export class HRService {
  readonly employees: EmployeeService;
  readonly contracts: ContractService;
  readonly payroll: PayrollService;
  readonly absences: AbsenceService;

  constructor(private readonly prisma: PrismaClient) {
    this.employees = new EmployeeService(prisma);
    this.contracts = new ContractService(prisma);
    this.payroll = new PayrollService(prisma);
    this.absences = new AbsenceService(prisma);
  }

  // ------------------------------------------
  // EMPLOYEES
  // ------------------------------------------

  getEmployees(userId: string, filters?: Partial<EmployeeFilters>) {
    return this.employees.getEmployees(userId, filters);
  }

  getEmployeeById(userId: string, id: string) {
    return this.employees.getEmployeeById(userId, id);
  }

  createEmployee(userId: string, data: CreateEmployeeData) {
    return this.employees.createEmployee(userId, data);
  }

  updateEmployee(userId: string, id: string, data: UpdateEmployeeData) {
    return this.employees.updateEmployee(userId, id, data);
  }

  deleteEmployee(userId: string, id: string) {
    return this.employees.deleteEmployee(userId, id);
  }

  // ------------------------------------------
  // CONTRACTS
  // ------------------------------------------

  getContracts(userId: string, filters?: Partial<ContractFilters>) {
    return this.contracts.getContracts(userId, filters);
  }

  getContractById(userId: string, id: string) {
    return this.contracts.getContractById(userId, id);
  }

  createContract(userId: string, data: CreateContractData) {
    return this.contracts.createContract(userId, data);
  }

  updateContract(userId: string, id: string, data: UpdateContractData) {
    return this.contracts.updateContract(userId, id, data);
  }

  terminateContract(userId: string, id: string, endDate: Date) {
    return this.contracts.terminateContract(userId, id, endDate);
  }

  // ------------------------------------------
  // PAYROLL
  // ------------------------------------------

  calculatePayroll(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ): Promise<PayrollCalculation> {
    return this.payroll.calculatePayroll(userId, contractId, period, bonuses, deductions);
  }

  savePayrollRecord(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ) {
    return this.payroll.savePayrollRecord(userId, contractId, period, bonuses, deductions);
  }

  getPayrollRecords(userId: string, filters?: Partial<PayrollFilters>) {
    return this.payroll.getPayrollRecords(userId, filters);
  }

  deletePayrollRecord(userId: string, id: string) {
    return this.payroll.deletePayrollRecord(userId, id);
  }

  // ------------------------------------------
  // ABSENCES
  // ------------------------------------------

  getAbsences(userId: string, filters?: Partial<AbsenceFilters>) {
    return this.absences.getAbsences(userId, filters);
  }

  createAbsence(userId: string, data: CreateAbsenceData) {
    return this.absences.createAbsence(userId, data);
  }

  updateAbsence(userId: string, id: string, data: UpdateAbsenceData) {
    return this.absences.updateAbsence(userId, id, data);
  }

  deleteAbsence(userId: string, id: string) {
    return this.absences.deleteAbsence(userId, id);
  }

  getVacationBalance(userId: string, employeeId: string, year: number) {
    return this.absences.getVacationBalance(userId, employeeId, year);
  }

  // ------------------------------------------
  // SUMMARY (cross-domain)
  // ------------------------------------------

  async getHRSummary(userId: string) {
    logger.info('HRService.getHRSummary', { userId });

    const [employeeCount, activeContracts, latestPayroll] = await Promise.all([
      this.prisma.employee.count({ where: { userId, isActive: true, deletedAt: null } }),
      this.prisma.employmentContract.groupBy({
        by: ['type'],
        where: { status: 'active', employee: { userId, deletedAt: null } },
        _count: { id: true },
      }),
      this.prisma.payrollRecord.aggregate({
        where: { employee: { userId, deletedAt: null } },
        _sum: { totalEmployerCost: true, grossAmount: true, netAmount: true },
        _max: { period: true },
      }),
    ]);

    const contractsByType: Record<string, number> = {};
    for (const row of activeContracts) {
      contractsByType[row.type] = row._count.id;
    }

    let totalMonthlyPayroll = 0;
    const latestPeriod = latestPayroll._max.period;

    if (latestPeriod) {
      const periodPayroll = await this.prisma.payrollRecord.aggregate({
        where: { employee: { userId, deletedAt: null }, period: latestPeriod },
        _sum: { totalEmployerCost: true },
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
}
