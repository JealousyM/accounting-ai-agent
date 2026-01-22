import { Router } from 'express';
import { credentialsController } from '../controllers/credentials.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  wfirmaCredentialsSchema,
  llmCredentialsSchema,
} from '../validators/credentials.validators';

const router = Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

/**
 * GET /api/credentials
 * Get user's credential settings (masked)
 */
router.get(
  '/',
  authenticate,
  credentialsController.getCredentials.bind(credentialsController)
);

// ============================================
// WFIRMA CREDENTIALS
// ============================================

/**
 * PUT /api/credentials/wfirma
 * Set or update wFirma credentials
 */
router.put(
  '/wfirma',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
  validateRequest(wfirmaCredentialsSchema),
  credentialsController.setWFirmaCredentials.bind(credentialsController)
);

/**
 * DELETE /api/credentials/wfirma
 * Remove wFirma credentials
 */
router.delete(
  '/wfirma',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  credentialsController.removeWFirmaCredentials.bind(credentialsController)
);

// ============================================
// LLM CREDENTIALS
// ============================================

/**
 * PUT /api/credentials/llm
 * Set or update LLM credentials
 */
router.put(
  '/llm',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(llmCredentialsSchema),
  credentialsController.setLLMCredentials.bind(credentialsController)
);

/**
 * DELETE /api/credentials/llm
 * Remove LLM credentials
 */
router.delete(
  '/llm',
  authenticate,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  credentialsController.removeLLMCredentials.bind(credentialsController)
);

export default router;
