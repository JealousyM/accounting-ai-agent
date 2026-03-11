import { Router } from 'express';
import { telegramBotController } from '../controllers/telegram-bot.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/telegram/link
 * Link Telegram account using a 6-digit code
 */
router.post(
  '/link',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  telegramBotController.linkAccount.bind(telegramBotController)
);

/**
 * DELETE /api/telegram/link
 * Unlink Telegram account
 */
router.delete(
  '/link',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  telegramBotController.unlinkAccount.bind(telegramBotController)
);

/**
 * GET /api/telegram/status
 * Get current Telegram link status
 */
router.get(
  '/status',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  telegramBotController.getStatus.bind(telegramBotController)
);

export default router;
