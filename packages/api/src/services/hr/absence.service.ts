import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import type { CreateAbsenceData, UpdateAbsenceData, AbsenceFilters } from '../../types/hr.types';

export class AbsenceService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAbsences(userId: string, filters?: Partial<AbsenceFilters>) {
    logger.info('AbsenceService.getAbsences', { userId, filters });

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

    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (approved !== undefined) where.approved = approved;

    if (startDateFrom || startDateTo) {
      where.startDate = {
        ...(startDateFrom ? { gte: startDateFrom } : {}),
        ...(startDateTo ? { lte: startDateTo } : {}),
      };
    }

    if (year) {
      if (month) {
        where.startDate = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
      } else {
        where.startDate = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
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

  async createAbsence(userId: string, data: CreateAbsenceData) {
    logger.info('AbsenceService.createAbsence', { userId, employeeId: data.employeeId, type: data.type });

    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, userId, deletedAt: null },
    });

    if (!employee) {
      throw new Error(`Employee ${data.employeeId} not found or does not belong to user`);
    }

    return this.prisma.absence.create({
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
  }

  async updateAbsence(userId: string, id: string, data: UpdateAbsenceData) {
    logger.info('AbsenceService.updateAbsence', { userId, id });

    const existing = await this.prisma.absence.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
    });
    if (!existing) return null;

    return this.prisma.absence.update({ where: { id }, data, include: { employee: true } });
  }

  async deleteAbsence(userId: string, id: string) {
    logger.info('AbsenceService.deleteAbsence', { userId, id });

    const existing = await this.prisma.absence.findFirst({
      where: { id, employee: { userId, deletedAt: null } },
    });
    if (!existing) return null;

    await this.prisma.absence.delete({ where: { id } });
    return { success: true, id };
  }

  async getVacationBalance(userId: string, employeeId: string, year: number) {
    logger.info('AbsenceService.getVacationBalance', { userId, employeeId, year });

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
      _sum: { businessDays: true },
    });

    const usedDays = usedAbsences._sum.businessDays ?? 0;
    const remaining = totalEntitlement - usedDays;

    return { employeeId, year, totalEntitlement, usedDays, remaining };
  }
}
