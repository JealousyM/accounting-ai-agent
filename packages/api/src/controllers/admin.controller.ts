import { Request, Response } from 'express';
import { adminService } from '../services/admin.instance';
import { auditLogService } from '../services/audit-log.instance';
import { logger } from '../utils/logger';

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

      await adminService.updateUserRole(id, role);
      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update user role', { error, userId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update user role',
      });
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
}

export const adminController = new AdminController();
