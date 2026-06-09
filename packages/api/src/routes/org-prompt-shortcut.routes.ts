import { Router } from 'express';
import { orgPromptShortcutController } from '../controllers/org-prompt-shortcut.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createOrgShortcutSchema,
  updateOrgShortcutSchema,
  deleteOrgShortcutSchema,
} from '../validators/org-prompt-shortcut.validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  orgPromptShortcutController.getShortcuts.bind(orgPromptShortcutController)
);

router.post(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(createOrgShortcutSchema),
  orgPromptShortcutController.createShortcut.bind(orgPromptShortcutController)
);

router.put(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(updateOrgShortcutSchema),
  orgPromptShortcutController.updateShortcut.bind(orgPromptShortcutController)
);

router.delete(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(deleteOrgShortcutSchema),
  orgPromptShortcutController.deleteShortcut.bind(orgPromptShortcutController)
);

export default router;
