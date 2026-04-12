import { Request, Response } from 'express';
import { referralService } from '../services/referral.instance';
import { logger } from '../utils/logger';

export class ReferralController {
  async getReferralInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const info = await referralService.getReferralInfo(userId);
      res.status(200).json({ success: true, data: info });
    } catch (error) {
      logger.error('Error fetching referral info', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Failed to fetch referral info' });
    }
  }

  async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const stats = await referralService.getReferralStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error fetching referral stats', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Failed to fetch referral stats' });
    }
  }

  async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      const result = await referralService.validateCode(code);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Error validating referral code', { error });
      res.status(500).json({ success: false, error: 'Failed to validate code' });
    }
  }
}

export const referralController = new ReferralController();
