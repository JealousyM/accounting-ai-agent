import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

/**
 * GET /api/users/locale
 * Get user's preferred locale by email
 */
router.get('/locale', userController.getUserLocale.bind(userController));

export default router;
