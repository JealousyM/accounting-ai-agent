import { Request, Response } from 'express';
import { orgPromptShortcutService } from '../services/org-prompt-shortcut/org-prompt-shortcut.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

async function resolveActiveMembership(
  userId: string
): Promise<{ organizationId: string; isAdmin: boolean } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, orgRole: true, orgMembershipStatus: true },
  });
  if (!user?.organizationId || user.orgMembershipStatus !== 'active') return null;
  return { organizationId: user.organizationId, isAdmin: user.orgRole === 'admin' };
}

export class OrgPromptShortcutController {
  async getShortcuts(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const membership = await resolveActiveMembership(userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'NOT_ORG_MEMBER' });
      return;
    }

    try {
      const shortcuts = await orgPromptShortcutService.getShortcuts(membership.organizationId);
      res.json({ success: true, data: shortcuts });
    } catch (error) {
      logger.error('Error fetching org shortcuts', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async createShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const membership = await resolveActiveMembership(userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'NOT_ORG_MEMBER' });
      return;
    }
    if (!membership.isAdmin) {
      res.status(403).json({ success: false, error: 'NOT_ORG_ADMIN' });
      return;
    }

    try {
      const shortcut = await orgPromptShortcutService.createShortcut(
        membership.organizationId,
        userId,
        req.body
      );
      res.status(201).json({ success: true, data: shortcut });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ORG_SHORTCUT_LIMIT_REACHED') {
        res.status(422).json({ success: false, error: 'ORG_SHORTCUT_LIMIT_REACHED', limit: (error as any).limit });
        return;
      }
      logger.error('Error creating org shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async updateShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const membership = await resolveActiveMembership(userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'NOT_ORG_MEMBER' });
      return;
    }
    if (!membership.isAdmin) {
      res.status(403).json({ success: false, error: 'NOT_ORG_ADMIN' });
      return;
    }

    try {
      const updated = await orgPromptShortcutService.updateShortcut(
        membership.organizationId,
        userId,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Shortcut not found') { res.status(404).json({ success: false, error: 'Not Found' }); return; }
      logger.error('Error updating org shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async deleteShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const membership = await resolveActiveMembership(userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'NOT_ORG_MEMBER' });
      return;
    }
    if (!membership.isAdmin) {
      res.status(403).json({ success: false, error: 'NOT_ORG_ADMIN' });
      return;
    }

    try {
      await orgPromptShortcutService.deleteShortcut(membership.organizationId, userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Shortcut not found') { res.status(404).json({ success: false, error: 'Not Found' }); return; }
      logger.error('Error deleting org shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}

export const orgPromptShortcutController = new OrgPromptShortcutController();
