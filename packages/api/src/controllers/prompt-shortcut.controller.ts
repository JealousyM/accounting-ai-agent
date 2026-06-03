import { Request, Response } from 'express';
import { promptShortcutService } from '../services/prompt-shortcut/prompt-shortcut.instance';
import { logger } from '../utils/logger';

export class PromptShortcutController {
  async getShortcuts(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    try {
      const shortcuts = await promptShortcutService.getShortcuts(userId);
      res.json({ success: true, data: shortcuts });
    } catch (error) {
      logger.error('Error fetching shortcuts', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async createShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    try {
      const shortcut = await promptShortcutService.createShortcut(userId, req.body);
      res.status(201).json({ success: true, data: shortcut });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'SHORTCUT_LIMIT_REACHED') {
        res.status(422).json({ success: false, error: 'SHORTCUT_LIMIT_REACHED', limit: (error as any).limit });
        return;
      }
      logger.error('Error creating shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async updateShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    try {
      const updated = await promptShortcutService.updateShortcut(userId, req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Shortcut not found') { res.status(404).json({ success: false, error: 'Not Found' }); return; }
      logger.error('Error updating shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async deleteShortcut(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    try {
      await promptShortcutService.deleteShortcut(userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Shortcut not found') { res.status(404).json({ success: false, error: 'Not Found' }); return; }
      logger.error('Error deleting shortcut', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  async reorderShortcuts(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    try {
      await promptShortcutService.reorderShortcuts(userId, req.body.ids);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error reordering shortcuts', { error, userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}

export const promptShortcutController = new PromptShortcutController();
