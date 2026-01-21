/**
 * AI Costs Routes
 * API endpoints for AI cost tracking and analytics
 */

import { Router } from 'express';
import { aiCostsController } from '../controllers/ai-costs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// USER-LEVEL COST ROUTES (общая статистика)
// ============================================

/**
 * GET /api/ai/costs/dashboard
 * Get full dashboard data: user summary, daily costs, model breakdown, conversations
 */
router.get(
  '/dashboard',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 60 }), // 60 per 15 minutes
  aiCostsController.getDashboard.bind(aiCostsController)
);

/**
 * GET /api/ai/costs/summary
 * Get user cost summary only
 */
router.get(
  '/summary',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getSummary.bind(aiCostsController)
);

/**
 * GET /api/ai/costs/daily
 * Get daily cost breakdown
 */
router.get(
  '/daily',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getDailyCosts.bind(aiCostsController)
);

/**
 * GET /api/ai/costs/by-model
 * Get cost breakdown by model
 */
router.get(
  '/by-model',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getCostsByModel.bind(aiCostsController)
);

// ============================================
// CONVERSATION-LEVEL COST ROUTES (по чатам)
// ============================================

/**
 * GET /api/ai/costs/conversations
 * Get all conversations with costs
 */
router.get(
  '/conversations',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getConversations.bind(aiCostsController)
);

/**
 * GET /api/ai/costs/conversations/:id
 * Get detailed cost data for a single conversation
 */
router.get(
  '/conversations/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getConversationDetail.bind(aiCostsController)
);

/**
 * GET /api/ai/costs/conversations/:id/runs
 * Get individual runs for a conversation
 */
router.get(
  '/conversations/:id/runs',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiCostsController.getConversationRuns.bind(aiCostsController)
);

export default router;
