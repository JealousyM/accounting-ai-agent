import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { validateCodeSchema } from '../validators/referral.validators';

const router = Router();

// PUBLIC
router.post(
  '/validate',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(validateCodeSchema),
  referralController.validateCode.bind(referralController)
);

// AUTHENTICATED
router.get('/', authenticate, referralController.getReferralInfo.bind(referralController));
router.get('/stats', authenticate, referralController.getReferralStats.bind(referralController));

export default router;
