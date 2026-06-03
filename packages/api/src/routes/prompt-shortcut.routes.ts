import { Router } from 'express';
import { promptShortcutController } from '../controllers/prompt-shortcut.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createShortcutSchema,
  updateShortcutSchema,
  deleteShortcutSchema,
  reorderShortcutsSchema,
} from '../validators/prompt-shortcut.validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  promptShortcutController.getShortcuts.bind(promptShortcutController)
);

router.post(
  '/',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(createShortcutSchema),
  promptShortcutController.createShortcut.bind(promptShortcutController)
);

router.put(
  '/reorder',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(reorderShortcutsSchema),
  promptShortcutController.reorderShortcuts.bind(promptShortcutController)
);

router.put(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(updateShortcutSchema),
  promptShortcutController.updateShortcut.bind(promptShortcutController)
);

router.delete(
  '/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(deleteShortcutSchema),
  promptShortcutController.deleteShortcut.bind(promptShortcutController)
);

export default router;
