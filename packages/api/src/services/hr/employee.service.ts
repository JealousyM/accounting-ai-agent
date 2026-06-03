import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import type { CreateEmployeeData, UpdateEmployeeData, EmployeeFilters } from '../../types/hr.types';

export class EmployeeService {
  constructor(private readonly prisma: PrismaClient) {}

  async getEmployees(userId: string, filters?: Partial<EmployeeFilters>) {
    logger.info('EmployeeService.getEmployees', { userId, filters });

    const {
      search,
      isActive,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters ?? {};

    const where: Prisma.EmployeeWhereInput = { userId, deletedAt: null };

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

  async getEmployeeById(userId: string, id: string) {
    logger.info('EmployeeService.getEmployeeById', { userId, id });

    const employee = await this.prisma.employee.findFirst({
      where: { id, userId, deletedAt: null },
      include: { contracts: true },
    });

    return employee ?? null;
  }

  async createEmployee(userId: string, data: CreateEmployeeData) {
    logger.info('EmployeeService.createEmployee', { userId, firstName: data.firstName, lastName: data.lastName });

    return this.prisma.employee.create({ data: { ...data, userId } });
  }

  async updateEmployee(userId: string, id: string, data: UpdateEmployeeData) {
    logger.info('EmployeeService.updateEmployee', { userId, id });

    const existing = await this.prisma.employee.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) return null;

    return this.prisma.employee.update({ where: { id }, data });
  }

  async deleteEmployee(userId: string, id: string) {
    logger.info('EmployeeService.deleteEmployee', { userId, id });

    const existing = await this.prisma.employee.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) return null;

    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
