import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeClient, STRIPE_CONFIG, isStripeConfigured } from '../config/stripe.config';
import { subscriptionService } from '../services/subscription.instance';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * POST /api/webhooks/stripe
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    if (!isStripeConfigured()) {
      logger.warn('[Webhook] Stripe not configured, ignoring webhook');
      res.status(200).json({ received: true });
      return;
    }

    const stripe = getStripeClient();
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      logger.warn('[Webhook] No Stripe signature in request');
      res.status(400).json({ error: 'No signature' });
      return;
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      logger.error('[Webhook] Webhook secret not configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      // Note: req.body should be raw buffer for signature verification
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[Webhook] Signature verification failed', { error: message });
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    logger.info('[Webhook] Received event', { type: event.type, id: event.id });

    try {
      // Process the event
      await subscriptionService.handleWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('[Webhook] Error processing event', {
        type: event.type,
        id: event.id,
        error,
      });

      // Return 200 to prevent Stripe from retrying
      // Log the error for investigation
      res.status(200).json({ received: true, error: 'Processing failed' });
    }
  }
}

export const webhookController = new WebhookController();
