import { prisma } from '../../lib/prisma';
import { AIMemoryService } from './ai-memory.service';

export const aiMemoryService = new AIMemoryService(prisma);
