import { Request, Response } from 'express';
import { aiMemoryService } from '../services/ai-memory/ai-memory.instance';
import { logger } from '../utils/logger';
import { AIMemoryCategory } from '@prisma/client';

export class AIMemoryController {
  /**
   * GET /api/ai/memory
   */
  async getMemories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { category, page, limit } = req.query;

      const result = await aiMemoryService.getMemories(userId, {
        category: category as AIMemoryCategory | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 50,
        },
      });
    } catch (error) {
      logger.error('Error fetching memories', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch memories',
      });
    }
  }

  /**
   * GET /api/ai/memory/summary
   */
  async getMemorySummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const summary = await aiMemoryService.getMemorySummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error fetching memory summary', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch memory summary',
      });
    }
  }

  /**
   * PUT /api/ai/memory/:id
   */
  async updateMemory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { value, isPinned, isHidden } = req.body;

      const updated = await aiMemoryService.updateMemory(userId, id, {
        value,
        isPinned,
        isHidden,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Memory not found') {
        res.status(404).json({ success: false, error: 'Not Found', message });
        return;
      }
      logger.error('Error updating memory', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update memory',
      });
    }
  }

  /**
   * DELETE /api/ai/memory/:id
   */
  async deleteMemory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await aiMemoryService.deleteMemory(userId, id);

      res.status(200).json({
        success: true,
        message: 'Memory deleted',
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Memory not found') {
        res.status(404).json({ success: false, error: 'Not Found', message });
        return;
      }
      logger.error('Error deleting memory', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete memory',
      });
    }
  }

  /**
   * POST /api/ai/memory/clear
   */
  async clearMemories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { category } = req.body;
      const deleted = await aiMemoryService.clearMemories(userId, category);

      res.status(200).json({
        success: true,
        data: { deleted },
      });
    } catch (error) {
      logger.error('Error clearing memories', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to clear memories',
      });
    }
  }
}

export const aiMemoryController = new AIMemoryController();
