import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * GET /api/users/locale?email=user@example.com
   * Get user's preferred locale by email
   */
  async getUserLocale(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Email parameter is required',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { locale: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        locale: user.locale || 'en',
      });
    } catch (error) {
      logger.error('Error fetching user locale', { error, email: req.query.email });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }
}

export const userController = new UserController();
