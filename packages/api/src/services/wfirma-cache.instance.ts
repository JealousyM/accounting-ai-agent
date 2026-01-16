import { WFirmaCacheService } from './wfirma-cache.service';
import { prisma } from '../lib/prisma';

// Export singleton instance
export const wfirmaCacheService = new WFirmaCacheService(prisma);
