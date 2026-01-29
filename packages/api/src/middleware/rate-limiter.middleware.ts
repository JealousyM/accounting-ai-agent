import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { logger } from '../utils/logger';

interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiter middleware using Redis
 * Disabled in test environment for E2E testing
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    statusCode = 429,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    try {
      // Get client identifier (IP address or user ID if authenticated)
      const identifier = req.user?.userId || req.ip || 'unknown';
      const key = `rate_limit:${req.path}:${identifier}`;

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= max) {
        logger.warn('Rate limit exceeded', {
          path: req.path,
          identifier,
          count,
          max,
        });

        res.status(statusCode).json({
          success: false,
          error: 'Too Many Requests',
          message,
          retryAfter: Math.ceil(windowMs / 1000), // seconds
        });
        return;
      }

      // Increment counter
      if (count === 0) {
        // First request in window
        await redis.setEx(key, Math.ceil(windowMs / 1000), '1');
      } else {
        await redis.incr(key);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', (max - count - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error });
      // Don't block request on rate limiter error
      next();
    }
  };
};

/**
 * Global rate limiter for all API routes
 */
export const globalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
});
