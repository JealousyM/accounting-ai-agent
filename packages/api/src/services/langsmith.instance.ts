/**
 * LangSmith Service Instance
 * Singleton instance of the LangSmith Cost Tracking Service
 */

import { prisma } from '../lib/prisma';
import { LangSmithService } from './langsmith/langsmith.service';

/**
 * Singleton instance of the LangSmith Service
 * Uses the shared prisma client for conversation metadata
 */
export const langsmithService = new LangSmithService(prisma);
