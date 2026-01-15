import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * User object attached to request
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Extended Request interface with auth data
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
  authUser?: AuthUser;
}

// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      authUser?: AuthUser;
    }
  }
}

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================

/**
 * Extract token from Authorization header
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

/**
 * Authentication middleware (required)
 * Verifies JWT token and attaches user to request
 * Returns 401 if token is missing or invalid
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const token = extractToken(req);

    if (!token) {
      logger.warn('Authentication attempt without token', {
        path: req.path,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    const payload = authService.verifyToken(token);

    // Attach payload to request
    req.user = payload;

    // Optionally fetch full user data from database
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (user) {
        req.authUser = user;
      }
    } catch (dbError) {
      // Log but don't fail if DB lookup fails
      logger.error('Failed to fetch user from database', {
        userId: payload.userId,
        error: dbError,
      });
    }

    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.warn('Token verification failed', {
        error: error.message,
        path: req.path,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      });
      return;
    }

    logger.error('Unexpected error in authentication middleware', { error });
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 * Useful for public endpoints that can be personalized
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without auth
      next();
      return;
    }

    // Try to verify token
    try {
      const payload = authService.verifyToken(token);
      req.user = payload;

      // Try to fetch user data
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (user) {
          req.authUser = user;
        }
      } catch (dbError) {
        logger.error('Failed to fetch user in optional auth', {
          userId: payload.userId,
          error: dbError,
        });
      }
    } catch (tokenError) {
      // Invalid token, but that's okay for optional auth
      logger.debug('Invalid token in optional auth', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
      });
    }

    next();
  } catch (error) {
    // Never fail for optional auth
    logger.error('Unexpected error in optional auth middleware', { error });
    next();
  }
};

/**
 * Require specific user ID
 * Use after authenticateToken to ensure user can only access their own resources
 */
export const requireUserId = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = req.params[userIdParam];

    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (authenticatedUserId !== requestedUserId) {
      logger.warn('User attempted to access another user\'s resources', {
        authenticatedUserId,
        requestedUserId,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
};

/**
 * Alias for authenticateToken (for backward compatibility)
 */
export const authenticate = authenticateToken;

/**
 * Alias for optionalAuth (for backward compatibility)
 */
export const optionalAuthenticate = optionalAuth;
