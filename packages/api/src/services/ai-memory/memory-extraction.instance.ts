import { prisma } from '../../lib/prisma';
import { aiMemoryService } from './ai-memory.instance';
import { AIMemoryExtractionService } from './memory-extraction.service';

export const memoryExtractionService = new AIMemoryExtractionService(aiMemoryService, prisma);
