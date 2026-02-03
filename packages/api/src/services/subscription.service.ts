import Stripe from 'stripe';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { getStripeClient, STRIPE_CONFIG, isStripeConfigured } from '../config/stripe.config';
import {
  SubscriptionDetails,
  UsageLimits,
  PLAN_FEATURES,
  CreateCheckoutRequest,
  CheckoutSessionResponse,
  BillingPortalResponse,
  PricingPlan,
} from '../types/subscription.types';
import { CredentialsService } from './credentials.service';
import { telegramService } from './telegram.instance';
import { logger } from '../utils/logger';

export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly credentialsService: CredentialsService
  ) {}

  /**
   * Get subscription details for a user
   */
  async getSubscriptionDetails(userId: string): Promise<SubscriptionDetails> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        cancelAtPeriodEnd: true,
        useOwnLLMKey: true,
        aiMessagesUsed: true,
        aiMessagesLimit: true,
        aiMessagesResetAt: true,
        wfirmaRequestsUsed: true,
        wfirmaRequestsLimit: true,
        wfirmaRequestsResetAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has their own LLM credentials
    const llmCreds = await this.credentialsService.getLLMCredentials(userId);
    const hasOwnLLMKey = !!llmCreds?.apiKey;

    const features = PLAN_FEATURES[user.subscriptionPlan];

    return {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      features,
      usage: {
        aiMessages: {
          used: user.aiMessagesUsed,
          limit: user.subscriptionPlan === 'pro' && !user.useOwnLLMKey ? user.aiMessagesLimit : null,
          resetAt: user.aiMessagesResetAt,
        },
        wfirmaRequests: {
          used: user.wfirmaRequestsUsed,
          limit: user.subscriptionPlan === 'free' ? user.wfirmaRequestsLimit : null,
          resetAt: user.wfirmaRequestsResetAt,
        },
      },
      currentPeriodEnd: user.subscriptionEndDate,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      useOwnLLMKey: user.useOwnLLMKey,
      hasOwnLLMKey,
    };
  }

  /**
   * Get available pricing plans
   * Note: Names, descriptions and features are localized on the frontend
   */
  async getPlans(): Promise<PricingPlan[]> {
    return [
      {
        id: 'free',
        priceMonthly: 0,
        priceYearly: 0,
      },
      {
        id: 'pro',
        priceMonthly: 1499, // PLN 14.99
        priceYearly: 14900, // PLN 149.00
        highlighted: true,
      },
    ];
  }

  /**
   * Create Stripe Checkout session for upgrade
   */
  async createCheckoutSession(
    userId: string,
    request: CreateCheckoutRequest
  ): Promise<CheckoutSessionResponse> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = getStripeClient();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Determine base URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: request.priceId, quantity: 1 }],
      success_url: request.successUrl || `${baseUrl}${STRIPE_CONFIG.defaultSuccessUrl}`,
      cancel_url: request.cancelUrl || `${baseUrl}${STRIPE_CONFIG.defaultCancelUrl}`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Create Stripe Billing Portal session
   */
  async createBillingPortalSession(userId: string): Promise<BillingPortalResponse> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = getStripeClient();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found for user');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/subscription`,
    });

    return { portalUrl: session.url };
  }

  /**
   * Cancel subscription at end of billing period
   */
  async cancelSubscription(userId: string): Promise<void> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = getStripeClient();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, email: true },
    });

    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { cancelAtPeriodEnd: true },
    });

    telegramService.notifySubscriptionCanceled(user.email);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    logger.info('[Subscription] Processing webhook event', { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.debug('[Subscription] Unhandled webhook event', { type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      logger.error('[Subscription] No userId in checkout session metadata');
      return;
    }

    logger.info('[Subscription] Checkout completed', { userId, sessionId: session.id });

    // Retrieve the subscription from the session
    if (session.subscription && typeof session.subscription === 'string') {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await this.syncSubscription(userId, subscription);
      logger.info('[Subscription] Synced subscription after checkout', { userId, subscriptionId: subscription.id });
    } else {
      logger.warn('[Subscription] No subscription ID in checkout session', { userId, sessionId: session.id });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      // Try to find user by customer ID
      const user = await this.prisma.user.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!user) {
        logger.error('[Subscription] Cannot find user for subscription', {
          subscriptionId: subscription.id,
        });
        return;
      }
      await this.syncSubscription(user.id, subscription);
    } else {
      await this.syncSubscription(userId, subscription);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          { stripeCustomerId: subscription.customer as string },
        ],
      },
    });

    if (!user) {
      logger.warn('[Subscription] User not found for deleted subscription', {
        subscriptionId: subscription.id,
      });
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        subscriptionEndDate: null,
        cancelAtPeriodEnd: false,
      },
    });

    telegramService.notifySubscriptionCanceled(user.email);

    logger.info('[Subscription] Subscription deleted, reverted to free', { userId: user.id });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const user = await this.prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (user) {
      // Reset usage limits on successful payment
      await this.resetUsageLimits(user.id);
      logger.info('[Subscription] Invoice paid, usage limits reset', { userId: user.id });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const user = await this.prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'past_due' },
      });
      logger.warn('[Subscription] Payment failed', { userId: user.id });
    }
  }

  private async syncSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
    const status = this.mapStripeStatus(subscription.status);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    logger.info('[Subscription] Syncing subscription', {
      userId,
      subscriptionId: subscription.id,
      status: subscription.status,
      mappedStatus: status,
      periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: 'pro',
        subscriptionStatus: status,
        stripeSubscriptionId: subscription.id,
        subscriptionEndDate: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    telegramService.notifySubscriptionChanged(user.email, 'pro');

    // Auto-provision default LLM credentials for PRO users
    await this.provisionDefaultLLMCredentials(userId);

    logger.info('[Subscription] Successfully synced subscription to database', {
      userId,
      subscriptionId: subscription.id,
      newPlan: 'pro',
      status,
    });
  }

  /**
   * Provision default LLM credentials for PRO users
   * Called automatically when user upgrades to PRO plan
   */
  private async provisionDefaultLLMCredentials(userId: string): Promise<void> {
    try {
      // Check if user already has LLM credentials
      const existingCreds = await this.credentialsService.getLLMCredentials(userId);

      if (existingCreds?.apiKey) {
        logger.debug('[Subscription] User already has LLM credentials, skipping provisioning', { userId });
        return;
      }

      // Get default provider, key, and model from environment
      const defaultProvider = process.env.DEFAULT_LLM_PROVIDER as 'openai' | 'google';
      const defaultApiKey = process.env.DEFAULT_LLM_API_KEY;
      const defaultModel = process.env.DEFAULT_LLM_MODEL;

      if (!defaultProvider || !defaultApiKey) {
        logger.warn('[Subscription] DEFAULT_LLM_PROVIDER or DEFAULT_LLM_API_KEY not configured, skipping auto-provisioning', { userId });
        return;
      }

      // Validate provider
      if (!['openai', 'google'].includes(defaultProvider)) {
        logger.error('[Subscription] Invalid DEFAULT_LLM_PROVIDER value', { provider: defaultProvider, userId });
        return;
      }

      // Save default credentials to user's database record
      await this.credentialsService.setLLMCredentials(userId, {
        provider: defaultProvider,
        apiKey: defaultApiKey,
        model: defaultModel,
      });

      logger.info('[Subscription] Auto-provisioned default LLM credentials for PRO user', {
        userId,
        provider: defaultProvider
      });
    } catch (error) {
      logger.error('[Subscription] Failed to provision default LLM credentials', {
        userId,
        error: (error as Error).message
      });
      // Don't throw - subscription sync should succeed even if credential provisioning fails
    }
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
        return 'canceled';
      case 'trialing':
        return 'trialing';
      default:
        return 'active';
    }
  }

  /**
   * Check if user can send AI message
   */
  async canSendAIMessage(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string; usage?: UsageLimits['aiMessages'] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionPlan: true,
        useOwnLLMKey: true,
        aiMessagesUsed: true,
        aiMessagesLimit: true,
        aiMessagesResetAt: true,
      },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Admin bypasses all checks
    if (user.role === 'admin') {
      return { allowed: true };
    }

    // Free plan - must have own key (checked in middleware)
    if (user.subscriptionPlan === 'free') {
      const creds = await this.credentialsService.getLLMCredentials(userId);
      if (!creds?.apiKey) {
        return { allowed: false, reason: 'LLM_KEY_REQUIRED' };
      }
      return { allowed: true };
    }

    // Pro with own key - unlimited
    if (user.subscriptionPlan === 'pro' && user.useOwnLLMKey) {
      const creds = await this.credentialsService.getLLMCredentials(userId);
      if (creds?.apiKey) {
        return { allowed: true };
      }
      // Fall through to check app key limits
    }

    // Pro with app keys - check limit
    await this.checkAndResetLimits(userId, 'ai');

    // Re-fetch after potential reset
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiMessagesUsed: true,
        aiMessagesLimit: true,
        aiMessagesResetAt: true,
      },
    });

    if (!updatedUser) {
      return { allowed: false, reason: 'User not found' };
    }

    const usage = {
      used: updatedUser.aiMessagesUsed,
      limit: updatedUser.aiMessagesLimit,
      resetAt: updatedUser.aiMessagesResetAt,
    };

    if (updatedUser.aiMessagesUsed >= updatedUser.aiMessagesLimit) {
      return { allowed: false, reason: 'AI_LIMIT_REACHED', usage };
    }

    return { allowed: true, usage };
  }

  /**
   * Check if user can make wFirma request
   */
  async canMakeWFirmaRequest(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string; usage?: UsageLimits['wfirmaRequests'] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionPlan: true,
        wfirmaRequestsUsed: true,
        wfirmaRequestsLimit: true,
        wfirmaRequestsResetAt: true,
      },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Admin bypasses all checks
    if (user.role === 'admin') {
      return { allowed: true };
    }

    // Pro plan - unlimited
    if (user.subscriptionPlan === 'pro') {
      return { allowed: true };
    }

    // Free plan - check limit
    await this.checkAndResetLimits(userId, 'wfirma');

    // Re-fetch after potential reset
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        wfirmaRequestsUsed: true,
        wfirmaRequestsLimit: true,
        wfirmaRequestsResetAt: true,
      },
    });

    if (!updatedUser) {
      return { allowed: false, reason: 'User not found' };
    }

    const usage = {
      used: updatedUser.wfirmaRequestsUsed,
      limit: updatedUser.wfirmaRequestsLimit,
      resetAt: updatedUser.wfirmaRequestsResetAt,
    };

    if (updatedUser.wfirmaRequestsUsed >= updatedUser.wfirmaRequestsLimit) {
      return { allowed: false, reason: 'WFIRMA_LIMIT_REACHED', usage };
    }

    return { allowed: true, usage };
  }

  /**
   * Increment AI message usage
   */
  async incrementAIUsage(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subscriptionPlan: true, useOwnLLMKey: true },
    });

    // Don't count for admin, free plan, or pro with own key
    if (!user) return;
    if (user.role === 'admin') return;
    if (user.subscriptionPlan === 'free') return;
    if (user.subscriptionPlan === 'pro' && user.useOwnLLMKey) {
      const creds = await this.credentialsService.getLLMCredentials(userId);
      if (creds?.apiKey) return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { aiMessagesUsed: { increment: 1 } },
    });
  }

  /**
   * Increment wFirma request usage
   */
  async incrementWFirmaUsage(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subscriptionPlan: true },
    });

    // Don't count for admin or pro plan
    if (!user) return;
    if (user.role === 'admin') return;
    if (user.subscriptionPlan === 'pro') return;

    await this.prisma.user.update({
      where: { id: userId },
      data: { wfirmaRequestsUsed: { increment: 1 } },
    });
  }

  /**
   * Check and reset limits if needed
   */
  private async checkAndResetLimits(userId: string, type: 'ai' | 'wfirma'): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiMessagesResetAt: true,
        wfirmaRequestsResetAt: true,
      },
    });

    if (!user) return;

    const now = new Date();
    const resetAt = type === 'ai' ? user.aiMessagesResetAt : user.wfirmaRequestsResetAt;

    // If no reset date or reset date is in the past, reset limits
    if (!resetAt || resetAt < now) {
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      if (type === 'ai') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            aiMessagesUsed: 0,
            aiMessagesResetAt: nextReset,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            wfirmaRequestsUsed: 0,
            wfirmaRequestsResetAt: nextReset,
          },
        });
      }

      logger.debug(`[Subscription] Reset ${type} limits for user`, { userId, nextReset });
    }
  }

  /**
   * Reset all usage limits for a user
   */
  async resetUsageLimits(userId: string): Promise<void> {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        aiMessagesUsed: 0,
        aiMessagesResetAt: nextReset,
        wfirmaRequestsUsed: 0,
        wfirmaRequestsResetAt: nextReset,
      },
    });
  }

  /**
   * Toggle use of own LLM key for Pro users
   */
  async setUseOwnLLMKey(userId: string, useOwn: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });

    if (!user || user.subscriptionPlan !== 'pro') {
      throw new Error('Only Pro users can toggle LLM key preference');
    }

    if (useOwn) {
      // Verify user has own key
      const creds = await this.credentialsService.getLLMCredentials(userId);
      if (!creds?.apiKey) {
        throw new Error('No LLM API key configured');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { useOwnLLMKey: useOwn },
    });
  }
}
