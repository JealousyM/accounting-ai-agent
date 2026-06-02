import { Router } from 'express';
import { authCoreController } from '../controllers/auth-core.controller';
import { oauthController } from '../controllers/oauth.controller';
import { tokenController } from '../controllers/token.controller';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
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

router.get('/config', profileController.getConfig.bind(profileController));

router.post(
  '/register',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  validateRequest(registerSchema),
  authCoreController.register.bind(authCoreController)
);

router.post(
  '/login',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(loginSchema),
  authCoreController.login.bind(authCoreController)
);

router.post(
  '/refresh',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  validateRequest(refreshTokenSchema),
  tokenController.refresh.bind(tokenController)
);

router.post(
  '/forgot-password',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 3 }),
  validateRequest(forgotPasswordSchema),
  authCoreController.forgotPassword.bind(authCoreController)
);

router.post(
  '/reset-password',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  validateRequest(resetPasswordSchema),
  authCoreController.resetPassword.bind(authCoreController)
);

router.get(
  '/llm-models',
  rateLimiter({ windowMs: 60 * 1000, max: 10 }),
  profileController.getPublicLLMModels.bind(profileController)
);

// ============================================
// OAUTH ROUTES
// ============================================

router.post(
  '/oauth/google',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(googleOAuthSchema),
  oauthController.googleOAuth.bind(oauthController)
);

// ============================================
// PROTECTED ROUTES
// ============================================

router.post('/logout', authenticate, tokenController.logout.bind(tokenController));

router.get('/me', authenticate, profileController.me.bind(profileController));

router.patch(
  '/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  profileController.updateProfile.bind(profileController)
);

router.post('/first-login-complete', authenticate, profileController.markFirstLoginComplete.bind(profileController));

router.post(
  '/complete-profile',
  authenticate,
  validateRequest(completeProfileSchema),
  oauthController.completeProfile.bind(oauthController)
);

export default router;
