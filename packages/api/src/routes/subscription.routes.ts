import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/subscription/plans
 * Get available subscription plans (public)
 */
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * GET /api/subscription
 * Get current user's subscription details
 */
router.get('/', authenticate, subscriptionController.getSubscription.bind(subscriptionController));

/**
 * GET /api/subscription/usage
 * Get current usage statistics
 */
router.get(
  '/usage',
  authenticate,
  subscriptionController.getUsage.bind(subscriptionController)
);

/**
 * POST /api/subscription/checkout
 * Create Stripe Checkout session for upgrade
 */
router.post(
  '/checkout',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
  subscriptionController.createCheckoutSession.bind(subscriptionController)
);

/**
 * POST /api/subscription/portal
 * Create Stripe Billing Portal session
 */
router.post(
  '/portal',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  subscriptionController.createPortalSession.bind(subscriptionController)
);

/**
 * POST /api/subscription/cancel
 * Cancel subscription at end of billing period
 */
router.post(
  '/cancel',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), // More restrictive
  subscriptionController.cancelSubscription.bind(subscriptionController)
);

/**
 * PUT /api/subscription/llm-preference
 * Toggle between app keys and own LLM key (Pro only)
 */
router.put(
  '/llm-preference',
  authenticate,
  subscriptionController.setLLMPreference.bind(subscriptionController)
);

export default router;
