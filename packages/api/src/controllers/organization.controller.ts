/**
 * Organization Controller
 * HTTP handlers for organization endpoints
 */

import { Request, Response } from 'express';
import { organizationService } from '../services/organization.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class OrganizationController {
  /**
   * GET /api/organization
   * Get user's organization and its members
   */
  async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const org = await organizationService.getUserOrganization(userId);

      res.status(200).json({ success: true, data: org });
    } catch (error) {
      logger.error('Failed to get organization', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch organization' });
    }
  }

  /**
   * PUT /api/organization/name
   * Update organization name (admin only)
   */
  async updateName(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Name is required' });
        return;
      }

      await organizationService.updateOrganizationName(userId, name);
      res.status(200).json({ success: true, message: 'Organization name updated' });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('admin')) {
        res.status(403).json({ success: false, error: 'Forbidden', message: msg });
        return;
      }
      if (msg.includes('already exists')) {
        res.status(409).json({ success: false, error: 'Conflict', message: msg });
        return;
      }
      logger.error('Failed to update organization name', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update organization name' });
    }
  }

  /**
   * POST /api/organization/members/:userId/approve
   */
  async approveMember(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId: targetUserId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.approveMember(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Member approved' });
    } catch (error) {
      this.handleOrgError(res, error, 'approve member');
    }
  }

  /**
   * POST /api/organization/members/:userId/reject
   */
  async rejectMember(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId: targetUserId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.rejectMember(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Member rejected' });
    } catch (error) {
      this.handleOrgError(res, error, 'reject member');
    }
  }

  /**
   * DELETE /api/organization/members/:userId
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId: targetUserId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.removeMember(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Member removed' });
    } catch (error) {
      this.handleOrgError(res, error, 'remove member');
    }
  }

  /**
   * POST /api/organization/members/:userId/promote
   */
  async promoteMember(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId: targetUserId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.promoteMember(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Member promoted to admin' });
    } catch (error) {
      this.handleOrgError(res, error, 'promote member');
    }
  }

  /**
   * POST /api/organization/members/:userId/demote
   */
  async demoteMember(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId: targetUserId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.demoteMember(adminUserId, targetUserId);
      res.status(200).json({ success: true, message: 'Admin demoted to member' });
    } catch (error) {
      this.handleOrgError(res, error, 'demote member');
    }
  }

  /**
   * POST /api/organization/leave
   */
  async leaveOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await organizationService.leaveOrganization(userId);
      res.status(200).json({ success: true, message: 'Left organization' });
    } catch (error) {
      this.handleOrgError(res, error, 'leave organization');
    }
  }

  /**
   * POST /api/organization/join
   * Create or join an organization by name
   */
  async joinOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Organization name is required' });
        return;
      }

      // Check if user already belongs to an organization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (user?.organizationId) {
        res.status(409).json({ success: false, error: 'Conflict', message: 'User already belongs to an organization' });
        return;
      }

      const org = await organizationService.findOrCreateByName(name.trim(), userId);
      res.status(200).json({ success: true, message: 'Organization joined successfully', data: { id: org.id, name: org.name } });
    } catch (error) {
      logger.error('Failed to join organization', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to join organization' });
    }
  }

  private handleOrgError(res: Response, error: unknown, action: string): void {
    const msg = (error as Error).message;
    if (msg.includes('admin') || msg.includes('Forbidden')) {
      res.status(403).json({ success: false, error: 'Forbidden', message: msg });
      return;
    }
    if (msg.includes('does not belong') || msg.includes('not found')) {
      res.status(404).json({ success: false, error: 'Not Found', message: msg });
      return;
    }
    if (msg.includes('Cannot')) {
      res.status(400).json({ success: false, error: 'Bad Request', message: msg });
      return;
    }
    logger.error(`Failed to ${action}`, { error });
    res.status(500).json({ success: false, error: 'Internal Server Error', message: `Failed to ${action}` });
  }
}

export const organizationController = new OrganizationController();
