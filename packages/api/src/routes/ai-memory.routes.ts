import { Router } from 'express';
import { aiMemoryController } from '../controllers/ai-memory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getMemoriesSchema,
  updateMemorySchema,
  deleteMemorySchema,
  clearMemoriesSchema,
} from '../validators/ai-memory.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/ai/memory
 * List memories with optional filters
 */
router.get(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  validateRequest(getMemoriesSchema),
  aiMemoryController.getMemories.bind(aiMemoryController)
);

/**
 * GET /api/ai/memory/summary
 * Get memory statistics
 */
router.get(
  '/summary',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiMemoryController.getMemorySummary.bind(aiMemoryController)
);

/**
 * PUT /api/ai/memory/:id
 * Update a memory (pin, hide, edit value)
 */
router.put(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(updateMemorySchema),
  aiMemoryController.updateMemory.bind(aiMemoryController)
);

/**
 * DELETE /api/ai/memory/:id
 * Delete a single memory
 */
router.delete(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(deleteMemorySchema),
  aiMemoryController.deleteMemory.bind(aiMemoryController)
);

/**
 * POST /api/ai/memory/clear
 * Clear all or category-specific memories
 */
router.post(
  '/clear',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  validateRequest(clearMemoriesSchema),
  aiMemoryController.clearMemories.bind(aiMemoryController)
);

export default router;
