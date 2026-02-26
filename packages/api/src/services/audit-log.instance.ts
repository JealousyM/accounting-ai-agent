import { prisma } from '../lib/prisma';
import { AuditLogService } from './audit-log.service';

export const auditLogService = new AuditLogService(prisma);
