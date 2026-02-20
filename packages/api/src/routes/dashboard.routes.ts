/**
 * Dashboard Routes
 * Aggregated KPI endpoint for the main dashboard
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard/dashboard.instance';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/summary
 * Returns aggregated KPI data from all sources
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const summary = await dashboardService.getSummary(userId);
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to fetch dashboard summary', { error });
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
  }
});

export default router;
