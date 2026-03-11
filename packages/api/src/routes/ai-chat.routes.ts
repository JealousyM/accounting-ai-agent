/**
 * AI Chat Routes
 * API endpoints for AI chat functionality
 */

import { Router } from 'express';
import { aiChatController } from '../controllers/ai-chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { checkAIMessageLimit } from '../middleware/subscription.middleware';
import {
  createConversationSchema,
  getConversationSchema,
  deleteConversationSchema,
  sendMessageSchema,
  shareConversationSchema,
  unshareConversationSchema,
} from '../validators/ai-chat.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * POST /api/ai/conversations
 * Create a new conversation
 */
router.post(
  '/conversations',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }), // 30 per 15 minutes
  validateRequest(createConversationSchema),
  aiChatController.createConversation.bind(aiChatController)
);

/**
 * GET /api/ai/conversations
 * Get user's conversations list
 */
router.get(
  '/conversations',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 per 15 minutes
  aiChatController.getConversations.bind(aiChatController)
);

/**
 * GET /api/ai/conversations/shared
 * Get shared conversations for user's organization
 * IMPORTANT: Must be before /conversations/:id to avoid matching "shared" as an id
 */
router.get(
  '/conversations/shared',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  aiChatController.getSharedConversations.bind(aiChatController)
);

/**
 * GET /api/ai/conversations/:id
 * Get single conversation with messages (supports shared access)
 */
router.get(
  '/conversations/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  validateRequest(getConversationSchema),
  aiChatController.getConversation.bind(aiChatController)
);

/**
 * DELETE /api/ai/conversations/:id
 * Delete conversation
 */
router.delete(
  '/conversations/:id',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(deleteConversationSchema),
  aiChatController.deleteConversation.bind(aiChatController)
);

// ============================================
// SHARING ROUTES
// ============================================

/**
 * POST /api/ai/conversations/:id/share
 * Share conversation with organization
 */
router.post(
  '/conversations/:id/share',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(shareConversationSchema),
  aiChatController.shareConversation.bind(aiChatController)
);

/**
 * POST /api/ai/conversations/:id/unshare
 * Unshare conversation
 */
router.post(
  '/conversations/:id/unshare',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  validateRequest(unshareConversationSchema),
  aiChatController.unshareConversation.bind(aiChatController)
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * POST /api/ai/conversations/:id/messages
 * Send message and get AI response
 *
 * Subscription limits:
 * - Free: requires own LLM key
 * - Pro: 500 messages/month with app keys, unlimited with own key
 * - Admin: unlimited
 */
router.post(
  '/conversations/:id/messages',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 60 }), // 60 messages per 15 minutes
  checkAIMessageLimit, // Check subscription limits
  validateRequest(sendMessageSchema),
  aiChatController.sendMessage.bind(aiChatController)
);

export default router;
