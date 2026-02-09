/**
 * HR Service Singleton Instance
 */

import { HRService } from './hr.service';
import { prisma } from '../../lib/prisma';

export const hrService = new HRService(prisma);
