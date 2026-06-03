import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserAnalyticsService } from '../services/user-analytics.service';
import { analyticsRangeSchema } from '../types/user-analytics.types';
import { logger } from '../utils/logger';

const service = new UserAnalyticsService(prisma);

export class UserAnalyticsController {
  async getMyAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const parsed = analyticsRangeSchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid range parameter' });
        return;
      }

      const data = await service.getMyAnalytics(userId, parsed.data.range);
      res.status(200).json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get user analytics', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}

export const userAnalyticsController = new UserAnalyticsController();
