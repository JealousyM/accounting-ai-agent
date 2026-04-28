import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.instance';
import { SUBSCRIPTION_ERROR_CODES, UsageLimits } from '../types/subscription.types';
import { logger } from '../utils/logger';

// Extend Express Request to include subscription usage
declare global {
  namespace Express {
    interface Request {
      subscriptionUsage?: {
        aiMessages?: UsageLimits['aiMessages'];
        wfirmaRequests?: UsageLimits['wfirmaRequests'];
      };
    }
  }
}

/**
 * Check if user can send AI messages
 * - Admin: always allowed
 * - Free: must have own LLM key
 * - Pro with own key: unlimited
 * - Pro with app keys: check message limit
 */
export const checkAIMessageLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const result = await subscriptionService.canSendAIMessage(userId);

    if (!result.allowed) {
      logger.info('[Subscription] AI message blocked', {
        userId,
        reason: result.reason,
        usage: result.usage,
      });

      const errorCode = result.reason || SUBSCRIPTION_ERROR_CODES.AI_LIMIT_REACHED;

      res.status(403).json({
        success: false,
        error: errorCode,
        message: getErrorMessage(errorCode),
        usage: result.usage,
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Attach usage info for later increment
    req.subscriptionUsage = {
      aiMessages: result.usage,
    };

    next();
  } catch (error) {
    logger.error('[Subscription] Error checking AI message limit', { error });
    // Don't block on errors - fail open
    next();
  }
};

/**
 * Check if user can make wFirma requests
 * - Admin: always allowed
 * - Pro: unlimited
 * - Free: check 30 requests/month limit
 */
export const checkWFirmaLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const result = await subscriptionService.canMakeWFirmaRequest(userId);

    if (!result.allowed) {
      logger.info('[Subscription] wFirma request blocked', {
        userId,
        reason: result.reason,
        usage: result.usage,
      });

      res.status(403).json({
        success: false,
        error: SUBSCRIPTION_ERROR_CODES.WFIRMA_LIMIT_REACHED,
        message: 'Monthly wFirma request limit reached (30 requests)',
        usage: result.usage,
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Attach usage info for later increment
    req.subscriptionUsage = {
      ...req.subscriptionUsage,
      wfirmaRequests: result.usage,
    };

    next();
  } catch (error) {
    logger.error('[Subscription] Error checking wFirma limit', { error });
    // Don't block on errors - fail open
    next();
  }
};

/**
 * Require Pro subscription plan
 */
export const requirePro = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role || req.authUser?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admin bypasses subscription checks
    if (userRole === 'admin') {
      next();
      return;
    }

    const subscription = await subscriptionService.getSubscriptionDetails(userId);

    if (subscription.plan !== 'pro') {
      res.status(403).json({
        success: false,
        error: SUBSCRIPTION_ERROR_CODES.SUBSCRIPTION_REQUIRED,
        message: 'This feature requires a Pro subscription',
        currentPlan: subscription.plan,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('[Subscription] Error checking Pro requirement', { error });
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to verify subscription',
    });
  }
};

/**
 * Increment AI usage after successful response
 * Use this as a response hook or call directly after AI processing
 */
export const incrementAIUsage = async (userId: string): Promise<void> => {
  try {
    await subscriptionService.incrementAIUsage(userId);
  } catch (error) {
    logger.error('[Subscription] Failed to increment AI usage', { userId, error });
  }
};

/**
 * Increment wFirma usage after successful request
 */
export const incrementWFirmaUsage = async (userId: string): Promise<void> => {
  try {
    await subscriptionService.incrementWFirmaUsage(userId);
  } catch (error) {
    logger.error('[Subscription] Failed to increment wFirma usage', { userId, error });
  }
};

/**
 * Get user-friendly error message
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case SUBSCRIPTION_ERROR_CODES.LLM_KEY_REQUIRED:
      return 'Free plan requires your own API key. Please add your OpenAI API key in settings.';
    case SUBSCRIPTION_ERROR_CODES.AI_LIMIT_REACHED:
      return 'You have reached your monthly AI message limit. Upgrade to Pro or add your own API key for unlimited messages.';
    case SUBSCRIPTION_ERROR_CODES.WFIRMA_LIMIT_REACHED:
      return 'You have reached your monthly wFirma request limit (30 requests). Upgrade to Pro for unlimited requests.';
    case SUBSCRIPTION_ERROR_CODES.SUBSCRIPTION_REQUIRED:
      return 'This feature requires a Pro subscription.';
    case SUBSCRIPTION_ERROR_CODES.SUBSCRIPTION_EXPIRED:
      return 'Your subscription has expired. Please renew to continue.';
    default:
      return 'Access denied due to subscription restrictions.';
  }
}
