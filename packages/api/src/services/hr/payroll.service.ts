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
import type { PayrollFilters } from '../../types/hr.types';

export class PayrollService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculatePayroll(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ): Promise<PayrollCalculation> {
    logger.info('PayrollService.calculatePayroll', { userId, contractId, period, bonuses, deductions });

    const contract = await this.prisma.employmentContract.findFirst({
      where: { id: contractId, employee: { userId, deletedAt: null } },
      include: { employee: true },
    });

    if (!contract) {
      throw new Error(`Contract ${contractId} not found or does not belong to user`);
    }

    const grossAmount = Number(contract.baseSalaryGross) + bonuses - deductions;
    const config = getDefaultTaxConfig();
    const costRate = contract.costDeductionRate ? Number(contract.costDeductionRate) / 100 : 0.20;

    switch (contract.type) {
      case 'employment': {
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

  async savePayrollRecord(
    userId: string,
    contractId: string,
    period: string,
    bonuses: number = 0,
    deductions: number = 0,
  ) {
    logger.info('PayrollService.savePayrollRecord', { userId, contractId, period });

    const contract = await this.prisma.employmentContract.findFirst({
      where: { id: contractId, employee: { userId, deletedAt: null } },
      include: { employee: true },
    });

    if (!contract) {
      throw new Error(`Contract ${contractId} not found or does not belong to user`);
    }

    const calculation = await this.calculatePayroll(userId, contractId, period, bonuses, deductions);

    return this.prisma.payrollRecord.create({
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
      include: { employee: true, contract: true },
    });
  }

  async getPayrollRecords(userId: string, filters?: Partial<PayrollFilters>) {
    logger.info('PayrollService.getPayrollRecords', { userId, filters });

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

    if (employeeId) where.employeeId = employeeId;
    if (contractId) where.contractId = contractId;

    if (period) {
      where.period = period;
    } else if (periodFrom || periodTo) {
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

  async deletePayrollRecord(userId: string, id: string) {
    logger.info('PayrollService.deletePayrollRecord', { userId, id });

    const existing = await this.prisma.payrollRecord.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
    });
    if (!existing) return null;

    await this.prisma.payrollRecord.delete({ where: { id } });
    return { success: true, id };
  }

  private async getYtdIncome(employeeId: string, period: string): Promise<number> {
    const year = period.substring(0, 4);
    const periodStart = `${year}-01`;

    const result = await this.prisma.payrollRecord.aggregate({
      where: {
        employeeId,
        period: { gte: periodStart, lt: period },
      },
      _sum: { grossAmount: true },
    });

    return Number(result._sum.grossAmount ?? 0);
  }
}
