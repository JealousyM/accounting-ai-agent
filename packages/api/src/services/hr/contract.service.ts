import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import type { CreateContractData, UpdateContractData, ContractFilters } from '../../types/hr.types';

export class ContractService {
  constructor(private readonly prisma: PrismaClient) {}

  async getContracts(userId: string, filters?: Partial<ContractFilters>) {
    logger.info('ContractService.getContracts', { userId, filters });

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

    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (activeOnly) where.status = 'active';

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

  async getContractById(userId: string, id: string) {
    logger.info('ContractService.getContractById', { userId, id });

    const contract = await this.prisma.employmentContract.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
      include: { employee: true },
    });

    return contract ?? null;
  }

  async createContract(userId: string, data: CreateContractData) {
    logger.info('ContractService.createContract', { userId, employeeId: data.employeeId, type: data.type });

    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, userId, deletedAt: null },
    });

    if (!employee) {
      throw new Error(`Employee ${data.employeeId} not found or does not belong to user`);
    }

    return this.prisma.employmentContract.create({
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
  }

  async updateContract(userId: string, id: string, data: UpdateContractData) {
    logger.info('ContractService.updateContract', { userId, id });

    const existing = await this.prisma.employmentContract.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
    });
    if (!existing) return null;

    return this.prisma.employmentContract.update({
      where: { id },
      data,
      include: { employee: true },
    });
  }

  async terminateContract(userId: string, id: string, endDate: Date) {
    logger.info('ContractService.terminateContract', { userId, id, endDate });

    const existing = await this.prisma.employmentContract.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
    });
    if (!existing) return null;

    return this.prisma.employmentContract.update({
      where: { id },
      data: { status: 'terminated', endDate },
      include: { employee: true },
    });
  }
}
