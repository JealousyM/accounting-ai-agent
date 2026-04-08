import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Rate limiters
const dashboardLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

const usersLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const updateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

const auditLogLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

// Spec: separate limiter for new mutation routes; existing `updateLimiter` (30/15min)
// remains attached to PATCH /users/:id/role.
const adminMutationLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get('/dashboard', dashboardLimiter, adminController.getDashboard.bind(adminController));

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
router.get('/users', usersLimiter, adminController.getUsers.bind(adminController));

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', usersLimiter, adminController.getUserDetail.bind(adminController));

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
router.patch('/users/:id/role', updateLimiter, adminController.updateUserRole.bind(adminController));

/**
 * GET /api/admin/audit-log
 * Get paginated audit log with filters
 */
router.get('/audit-log', auditLogLimiter, adminController.getAuditLog.bind(adminController));

/**
 * DELETE /api/admin/users/:id
 * Soft-delete user
 */
router.delete('/users/:id', adminMutationLimiter, adminController.softDeleteUser.bind(adminController));

/**
 * DELETE /api/admin/users/:id/hard
 * Hard-delete user (irreversible)
 */
router.delete('/users/:id/hard', adminMutationLimiter, adminController.hardDeleteUser.bind(adminController));

/**
 * PATCH /api/admin/users/:id/subscription
 * Change subscription plan
 */
router.patch('/users/:id/subscription', adminMutationLimiter, adminController.updateSubscription.bind(adminController));

/**
 * PATCH /api/admin/users/:id/limits
 * Update usage limits
 */
router.patch('/users/:id/limits', adminMutationLimiter, adminController.updateLimits.bind(adminController));

/**
 * POST /api/admin/users/:id/reset-usage
 * Reset usage counters
 */
router.post('/users/:id/reset-usage', adminMutationLimiter, adminController.resetUsage.bind(adminController));

/**
 * GET /api/admin/users/:id/stats
 * Get deep stats for a user
 */
router.get('/users/:id/stats', usersLimiter, adminController.getUserStats.bind(adminController));

export default router;
