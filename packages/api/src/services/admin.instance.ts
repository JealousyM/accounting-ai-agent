import { prisma } from '../lib/prisma';
import { AdminService } from './admin.service';
import { auditLogService } from './audit-log.instance';

export const adminService = new AdminService(prisma, auditLogService);
