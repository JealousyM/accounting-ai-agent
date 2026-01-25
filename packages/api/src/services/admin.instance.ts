import { prisma } from '../lib/prisma';
import { AdminService } from './admin.service';

export const adminService = new AdminService(prisma);
