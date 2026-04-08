import { Request, Response } from 'express';
import { adminService } from '../services/admin.instance';
import { auditLogService } from '../services/audit-log.instance';
import { logger } from '../utils/logger';
import { subscriptionPlanSchema, limitsSchema, resetUsageSchema, statsRangeSchema } from '../types/admin.types';

function handleServiceError(res: Response, error: any, fallbackMessage: string, ctx: object): void {
  const status = error?.statusCode ?? 500;
  if (status >= 500) logger.error(fallbackMessage, { error, ...ctx });
  res.status(status).json({
    success: false,
    error: status === 400 ? 'Validation Error' : status === 404 ? 'Not Found' : 'Internal Server Error',
    message: error?.message ?? fallbackMessage,
  });
}

export class AdminController {
  /**
   * GET /api/admin/dashboard
   * Get admin dashboard statistics
   */
  async getDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      logger.error('Failed to get admin dashboard', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch dashboard stats',
      });
    }
  }

  /**
   * GET /api/admin/users
   * Get all users with pagination and search
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, role } = req.query;
      const result = await adminService.getUsers({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        search: search as string | undefined,
        role: role as any,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get users', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch users',
      });
    }
  }

  /**
   * GET /api/admin/users/:id
   * Get detailed user information
   */
  async getUserDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.getUserDetail(id);
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get user detail', { error, userId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch user detail',
      });
    }
  }

  /**
   * PATCH /api/admin/users/:id/role
   * Update user role
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['user', 'admin'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid role. Must be "user" or "admin"',
        });
        return;
      }

      await adminService.updateUserRole(id, role, { actorId: req.user!.userId });
      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
      });
    } catch (e) {
      handleServiceError(res, e, 'Failed to update user role', { id: req.params.id });
    }
  }

  /**
   * GET /api/admin/audit-log
   * Paginated audit log with filters
   */
  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, userId, action, entity, dateFrom, dateTo } = req.query;

      const result = await auditLogService.getAll({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        userId: userId as string | undefined,
        action: action as string | undefined,
        entity: entity as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get audit log', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch audit log',
      });
    }
  }

  /**
   * DELETE /api/admin/users/:id
   * Soft-delete user
   */
  async softDeleteUser(req: Request, res: Response): Promise<void> {
    try {
      await adminService.softDeleteUser({ actorId: req.user!.userId, targetUserId: req.params.id });
      res.status(200).json({ success: true, data: { ok: true, mode: 'soft' } });
    } catch (e) { handleServiceError(res, e, 'Failed to soft-delete user', { id: req.params.id }); }
  }

  /**
   * DELETE /api/admin/users/:id/hard
   * Hard-delete user (irreversible)
   */
  async hardDeleteUser(req: Request, res: Response): Promise<void> {
    try {
      await adminService.hardDeleteUser({ actorId: req.user!.userId, targetUserId: req.params.id });
      res.status(200).json({ success: true, data: { ok: true, mode: 'hard' } });
    } catch (e) { handleServiceError(res, e, 'Failed to hard-delete user', { id: req.params.id }); }
  }

  /**
   * PATCH /api/admin/users/:id/subscription
   * Change subscription plan
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { plan } = subscriptionPlanSchema.parse(req.body);
      const data = await adminService.updateSubscriptionPlan({
        actorId: req.user!.userId, targetUserId: req.params.id, plan,
      });
      res.status(200).json({ success: true, data });
    } catch (e: any) {
      if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors?.[0]?.message ?? 'Invalid payload' }, 'Invalid payload', {});
      handleServiceError(res, e, 'Failed to update subscription', { id: req.params.id });
    }
  }

  /**
   * PATCH /api/admin/users/:id/limits
   * Update usage limits
   */
  async updateLimits(req: Request, res: Response): Promise<void> {
    try {
      const body = limitsSchema.parse(req.body);
      const data = await adminService.updateUserLimits({
        actorId: req.user!.userId, targetUserId: req.params.id, ...body,
      });
      res.status(200).json({ success: true, data });
    } catch (e: any) {
      if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors?.[0]?.message ?? 'Invalid payload' }, 'Invalid payload', {});
      handleServiceError(res, e, 'Failed to update limits', { id: req.params.id });
    }
  }

  /**
   * POST /api/admin/users/:id/reset-usage
   * Reset usage counters
   */
  async resetUsage(req: Request, res: Response): Promise<void> {
    try {
      const { type } = resetUsageSchema.parse(req.body);
      const data = await adminService.resetUsageCounter({
        actorId: req.user!.userId, targetUserId: req.params.id, type,
      });
      res.status(200).json({ success: true, data });
    } catch (e: any) {
      if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors?.[0]?.message ?? 'Invalid payload' }, 'Invalid payload', {});
      handleServiceError(res, e, 'Failed to reset usage', { id: req.params.id });
    }
  }

  /**
   * GET /api/admin/users/:id/stats
   * Get deep stats for a user
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { range } = statsRangeSchema.parse({ range: req.query.range });
      const data = await adminService.getUserDeepStats(req.params.id, range);
      res.status(200).json({ success: true, data });
    } catch (e: any) {
      if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: 'Invalid range' }, 'Invalid range', {});
      handleServiceError(res, e, 'Failed to fetch user stats', { id: req.params.id });
    }
  }
}

export const adminController = new AdminController();
