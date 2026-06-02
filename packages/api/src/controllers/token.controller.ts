import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class TokenController {
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully');

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Token refresh failed', { error: error.message });
        res.status(401).json({ success: false, error: 'Token Refresh Failed', message: error.message });
        return;
      }
      logger.error('Unexpected error during token refresh', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        logger.warn('Logout attempt without authentication');
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await authService.logout(userId);

      logger.info('User logged out successfully', { userId });

      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout failed', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }
}

export const tokenController = new TokenController();
