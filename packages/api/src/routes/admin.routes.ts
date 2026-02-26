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

export default router;
