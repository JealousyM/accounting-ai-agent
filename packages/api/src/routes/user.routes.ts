import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { userAnalyticsController } from '../controllers/user-analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

/**
 * GET /api/users/locale
 * Get user's preferred locale by email
 */
router.get('/locale', userController.getUserLocale.bind(userController));

/**
 * GET /api/users/me/analytics
 * Get personal AI usage analytics for the authenticated user
 */
router.get(
  '/me/analytics',
  authenticateToken,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 60 }),
  userAnalyticsController.getMyAnalytics.bind(userAnalyticsController)
);

export default router;
