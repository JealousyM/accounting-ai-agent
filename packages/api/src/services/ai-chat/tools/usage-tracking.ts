/**
 * wFirma Usage Tracking Helper
 * Utilities for tracking wFirma API usage in AI tools
 */

import { SubscriptionService } from '../../subscription.service';
import { Locale, getCommonTranslations } from '../../../i18n';
import { logger } from '../../../utils/logger';

/**
 * Check if user can make wFirma request
 * Returns error message if limit reached, null if allowed
 */
export async function checkWFirmaLimit(
  subscriptionService: SubscriptionService | undefined,
  userId: string,
  locale: Locale
): Promise<string | null> {
  if (!subscriptionService) {
    return null; // No tracking, allow request
  }

  try {
    const result = await subscriptionService.canMakeWFirmaRequest(userId);
    if (!result.allowed) {
      const t = getCommonTranslations(locale);
      logger.info('[wFirma Usage] Request blocked - limit reached', { userId, reason: result.reason });
      return t.wfirmaLimitReached;
    }
    return null;
  } catch (error) {
    logger.error('[wFirma Usage] Error checking limit', { error, userId });
    return null; // On error, allow request (fail-open)
  }
}

/**
 * Increment wFirma usage after successful request
 */
export async function incrementWFirmaUsage(
  subscriptionService: SubscriptionService | undefined,
  userId: string
): Promise<void> {
  if (!subscriptionService) {
    return; // No tracking
  }

  try {
    await subscriptionService.incrementWFirmaUsage(userId);
    logger.debug('[wFirma Usage] Incremented usage', { userId });
  } catch (error) {
    logger.error('[wFirma Usage] Error incrementing usage', { error, userId });
    // Don't fail the request on tracking error
  }
}
