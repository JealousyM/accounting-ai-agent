/**
 * Help Routes
 * Public routes for accessing help topics (no authentication required)
 */

import { Router } from 'express';
import { helpController } from '../controllers/help.controller';

const router = Router();

// Public routes (no authentication required for help)
router.get('/topics', helpController.getTopics.bind(helpController));
router.get('/topics/:slug', helpController.getTopicBySlug.bind(helpController));
router.get('/categories', helpController.getCategories.bind(helpController));

export default router;
