/**
 * Telegram Bot Controller
 * HTTP handlers for Telegram account linking endpoints
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';

interface TelegramLinkData {
  telegramUserId: string;
  telegramUsername: string | null;
  telegramFirstName: string | null;
}

export class TelegramBotController {
  /**
   * POST /api/telegram/link
   * Link a Telegram account using a 6-digit code from the bot.
   */
  async linkAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { code } = req.body;
      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'A valid 6-digit code is required',
        });
        return;
      }

      // Look up linking code in Redis
      const redisKey = `telegram:link:${code}`;
      const linkDataRaw = await redis.get(redisKey);

      if (!linkDataRaw) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid or expired code. Please generate a new one with /link in Telegram.',
        });
        return;
      }

      const linkData: TelegramLinkData = JSON.parse(linkDataRaw);

      // Check if this Telegram user is already linked to another account
      const existingLink = await prisma.telegramLink.findUnique({
        where: { telegramUserId: linkData.telegramUserId },
      });

      if (existingLink) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'This Telegram account is already linked to another user.',
        });
        return;
      }

      // Check if this user already has a linked Telegram account
      const userLink = await prisma.telegramLink.findUnique({
        where: { userId },
      });

      if (userLink) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'Your account is already linked to a Telegram account. Unlink first.',
        });
        return;
      }

      // Create the link
      const telegramLink = await prisma.telegramLink.create({
        data: {
          userId,
          telegramUserId: linkData.telegramUserId,
          telegramUsername: linkData.telegramUsername,
          telegramFirstName: linkData.telegramFirstName,
        },
      });

      // Delete the Redis key (one-time use)
      await redis.del(redisKey);

      logger.info('[TelegramBot] Account linked', {
        userId,
        telegramUserId: linkData.telegramUserId,
      });

      res.status(200).json({
        success: true,
        data: {
          linked: true,
          telegramUsername: telegramLink.telegramUsername,
          telegramFirstName: telegramLink.telegramFirstName,
          linkedAt: telegramLink.linkedAt,
        },
      });
    } catch (error) {
      logger.error('[TelegramBot] Error linking account', {
        error: (error as Error).message,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to link Telegram account',
      });
    }
  }

  /**
   * DELETE /api/telegram/link
   * Unlink the Telegram account.
   */
  async unlinkAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const deleted = await prisma.telegramLink.deleteMany({
        where: { userId },
      });

      if (deleted.count === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'No linked Telegram account found',
        });
        return;
      }

      logger.info('[TelegramBot] Account unlinked', { userId });

      res.status(200).json({
        success: true,
        message: 'Telegram account unlinked',
      });
    } catch (error) {
      logger.error('[TelegramBot] Error unlinking account', {
        error: (error as Error).message,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to unlink Telegram account',
      });
    }
  }

  /**
   * GET /api/telegram/status
   * Get current Telegram link status.
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const link = await prisma.telegramLink.findUnique({
        where: { userId },
        select: {
          telegramUsername: true,
          telegramFirstName: true,
          linkedAt: true,
        },
      });

      if (!link) {
        res.status(200).json({
          success: true,
          data: { linked: false },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          linked: true,
          telegramUsername: link.telegramUsername,
          telegramFirstName: link.telegramFirstName,
          linkedAt: link.linkedAt,
        },
      });
    } catch (error) {
      logger.error('[TelegramBot] Error fetching status', {
        error: (error as Error).message,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch Telegram status',
      });
    }
  }
}

export const telegramBotController = new TelegramBotController();
