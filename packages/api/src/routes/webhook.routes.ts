import { Router } from 'express';
import express from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This route uses express.raw() middleware because
 * Stripe requires the raw request body for signature verification.
 * This must be configured BEFORE the global express.json() middleware.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook.bind(webhookController)
);

export default router;
