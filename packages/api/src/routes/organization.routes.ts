/**
 * Organization Routes
 * API endpoints for organization management
 */

import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/organization
 * Get user's organization, members, and pending members (admin only sees pending)
 */
router.get(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 60 }),
  organizationController.getOrganization.bind(organizationController)
);

/**
 * POST /api/organization/join
 * Create or join an organization by name
 */
router.post(
  '/join',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  organizationController.joinOrganization.bind(organizationController)
);

/**
 * PUT /api/organization/name
 * Update organization name (admin only)
 */
router.put(
  '/name',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  organizationController.updateName.bind(organizationController)
);

/**
 * POST /api/organization/withdraw
 * Cancel a pending join request
 */
router.post(
  '/withdraw',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  organizationController.withdrawRequest.bind(organizationController)
);

/**
 * POST /api/organization/leave
 * Leave organization
 */
router.post(
  '/leave',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  organizationController.leaveOrganization.bind(organizationController)
);

/**
 * POST /api/organization/members/:userId/approve
 * Approve pending member (admin only)
 */
router.post(
  '/members/:userId/approve',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  organizationController.approveMember.bind(organizationController)
);

/**
 * POST /api/organization/members/:userId/reject
 * Reject pending member (admin only)
 */
router.post(
  '/members/:userId/reject',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  organizationController.rejectMember.bind(organizationController)
);

/**
 * DELETE /api/organization/members/:userId
 * Remove member (admin only)
 */
router.delete(
  '/members/:userId',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  organizationController.removeMember.bind(organizationController)
);

/**
 * POST /api/organization/members/:userId/promote
 * Promote member to admin (admin only)
 */
router.post(
  '/members/:userId/promote',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  organizationController.promoteMember.bind(organizationController)
);

/**
 * POST /api/organization/members/:userId/demote
 * Demote admin to member (admin only)
 */
router.post(
  '/members/:userId/demote',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  organizationController.demoteMember.bind(organizationController)
);

export default router;
