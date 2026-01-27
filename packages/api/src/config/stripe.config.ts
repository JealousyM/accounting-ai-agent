/**
 * Stripe configuration
 * Manages Stripe SDK initialization and pricing configuration
 */

import Stripe from 'stripe';

// Initialize Stripe client (lazy initialization)
let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  return stripeClient;
};

// Check if Stripe is configured
export const isStripeConfigured = (): boolean => {
  return !!process.env.STRIPE_SECRET_KEY;
};

// Stripe configuration
export const STRIPE_CONFIG = {
  // Webhook secret for verifying webhook signatures
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Price IDs from Stripe Dashboard
  prices: {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    proYearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },

  // Customer Portal configuration ID
  portalConfigurationId: process.env.STRIPE_PORTAL_CONFIGURATION_ID || '',

  // Default URLs for checkout
  defaultSuccessUrl:
    process.env.STRIPE_SUCCESS_URL || '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
  defaultCancelUrl: process.env.STRIPE_CANCEL_URL || '/subscription/cancel',
};

// Pricing display info (amounts in cents)
export const PRICING_INFO = {
  pro: {
    monthly: {
      amount: 1499,
      currency: 'pln',
      interval: 'month' as const,
    },
    yearly: {
      amount: 14900,
      currency: 'pln',
      interval: 'year' as const,
    },
  },
};

// Validate Stripe configuration
export const validateStripeConfig = (): { valid: boolean; missing: string[] } => {
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

  const optional = ['STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_YEARLY'];

  const missing = required.filter((key) => !process.env[key]);
  const missingOptional = optional.filter((key) => !process.env[key]);

  if (missingOptional.length > 0) {
    console.warn(
      `[Stripe] Optional config missing: ${missingOptional.length} price IDs not configured`
    );
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};
