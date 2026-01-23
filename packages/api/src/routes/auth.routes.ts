import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  oauthSchema,
  googleOAuthSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
} from '../validators/auth.validators';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/auth/config
 * Get public auth configuration (OAuth visibility settings)
 */
router.get('/config', authController.getConfig.bind(authController));

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post(
  '/login',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
  validateRequest(refreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 3 }), // 3 requests per 15 minutes (strict limit)
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
  validateRequest(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

// ============================================
// OAUTH ROUTES
// ============================================

/**
 * POST /api/auth/oauth/google
 * Google OAuth authentication - accepts access_token for secure server-side verification
 */
router.post(
  '/oauth/google',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(googleOAuthSchema),
  authController.googleOAuth.bind(authController)
);

/**
 * POST /api/auth/oauth/github
 * GitHub OAuth authentication
 */
router.post(
  '/oauth/github',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(oauthSchema),
  authController.githubOAuth.bind(authController)
);

/**
 * POST /api/auth/oauth/github/callback
 * GitHub OAuth callback - exchange code for tokens
 */
router.post(
  '/oauth/github/callback',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  authController.githubOAuthCallback.bind(authController)
);

// ============================================
// PROTECTED ROUTES
// ============================================

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  authController.me.bind(authController)
);

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
router.patch(
  '/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  authController.updateProfile.bind(authController)
);

/**
 * POST /api/auth/first-login-complete
 * Mark first login as complete (hide welcome modal)
 */
router.post(
  '/first-login-complete',
  authenticate,
  authController.markFirstLoginComplete.bind(authController)
);

/**
 * POST /api/auth/complete-profile
 * Complete OAuth user profile with LLM and optional wFirma credentials
 */
router.post(
  '/complete-profile',
  authenticate,
  validateRequest(completeProfileSchema),
  authController.completeProfile.bind(authController)
);

export default router;
