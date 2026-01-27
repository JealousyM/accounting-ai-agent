import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// Re-export Prisma types
export { SubscriptionPlan, SubscriptionStatus };

// Subscription features by plan
export interface SubscriptionFeatures {
  aiMessagesLimit: number | null; // null = unlimited
  wfirmaRequestsLimit: number | null; // null = unlimited
  wfirmaIntegration: boolean;
  prioritySupport: boolean;
  requiresOwnLLMKey: boolean;
}

// Plan features configuration
export const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    aiMessagesLimit: null, // Unlimited when using own key
    wfirmaRequestsLimit: 30,
    wfirmaIntegration: true, // Limited to 30 requests
    prioritySupport: false,
    requiresOwnLLMKey: true, // Must provide own key
  },
  pro: {
    aiMessagesLimit: 500, // When using app keys
    wfirmaRequestsLimit: null, // Unlimited
    wfirmaIntegration: true,
    prioritySupport: true,
    requiresOwnLLMKey: false, // App keys included
  },
};

// Usage limits response
export interface UsageLimits {
  aiMessages: {
    used: number;
    limit: number | null;
    resetAt: Date | null;
  };
  wfirmaRequests: {
    used: number;
    limit: number | null;
    resetAt: Date | null;
  };
}

// Subscription details for API response
export interface SubscriptionDetails {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  usage: UsageLimits;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  useOwnLLMKey: boolean;
  hasOwnLLMKey: boolean;
}

// Pricing plan for frontend
// Note: name, description, and features are localized on the frontend
export interface PricingPlan {
  id: SubscriptionPlan;
  priceMonthly: number; // In cents (grosze)
  priceYearly: number; // In cents (grosze)
  highlighted?: boolean;
}

// Checkout session request
export interface CreateCheckoutRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

// Checkout session response
export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

// Billing portal response
export interface BillingPortalResponse {
  portalUrl: string;
}

// Stripe webhook event types we handle
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

// Error codes for subscription
export const SUBSCRIPTION_ERROR_CODES = {
  LLM_KEY_REQUIRED: 'LLM_KEY_REQUIRED',
  AI_LIMIT_REACHED: 'AI_LIMIT_REACHED',
  WFIRMA_LIMIT_REACHED: 'WFIRMA_LIMIT_REACHED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

export type SubscriptionErrorCode =
  (typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES];
