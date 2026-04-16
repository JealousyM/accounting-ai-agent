/**
 * Setup Stripe for production (live mode) — idempotent.
 *
 * Creates (or reuses) Pro product, monthly/yearly PLN prices,
 * webhook endpoint, and referral coupon. Prints env lines for .env.production.
 *
 * Usage (from packages/api):
 *   STRIPE_SECRET_KEY=sk_live_... WEBHOOK_URL=https://eksiegowyai.pl/api/webhooks/stripe \
 *     npx ts-node --transpile-only src/scripts/setup-stripe-live.ts
 */

import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error('STRIPE_SECRET_KEY is required');
  process.exit(1);
}
const webhookUrl = process.env.WEBHOOK_URL || 'https://eksiegowyai.pl/api/webhooks/stripe';

const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });

const PRO_PRODUCT_NAME = 'eKsięgowyAI Pro';
const PRO_PRODUCT_DESC =
  'Pełny dostęp do asystenta AI dla księgowości z integracją wFirma i KSeF';
const COUPON_ID = 'first_month_referral';

const PRICE_MONTHLY_PLN = 1499; // PLN 14.99
const PRICE_YEARLY_PLN = 14900; // PLN 149.00

async function findOrCreateProduct(): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `active:'true' AND metadata['tier']:'pro' AND metadata['app']:'accounting-ai-agent'`,
  });
  if (existing.data.length > 0) {
    console.log(`Reusing product ${existing.data[0].id} (${existing.data[0].name})`);
    return existing.data[0];
  }
  const created = await stripe.products.create({
    name: PRO_PRODUCT_NAME,
    description: PRO_PRODUCT_DESC,
    metadata: { tier: 'pro', app: 'accounting-ai-agent' },
  });
  console.log(`Created product ${created.id}`);
  return created;
}

async function findOrCreatePrice(
  productId: string,
  interval: 'month' | 'year',
  amount: number,
): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  const match = prices.data.find(
    (p) =>
      p.currency === 'pln' &&
      p.unit_amount === amount &&
      p.recurring?.interval === interval,
  );
  if (match) {
    console.log(`Reusing ${interval}ly price ${match.id}`);
    return match;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: 'pln',
    unit_amount: amount,
    recurring: { interval },
    metadata: { tier: 'pro', billing: interval === 'month' ? 'monthly' : 'yearly' },
  });
  console.log(`Created ${interval}ly price ${created.id}`);
  return created;
}

async function findOrCreateWebhook(): Promise<{ id: string; secret: string | null }> {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((e) => e.url === webhookUrl);
  if (existing) {
    console.log(`Reusing webhook ${existing.id} (secret cannot be revealed — reuse existing or roll)`);
    return { id: existing.id, secret: null };
  }
  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ],
    description: 'accounting-ai-agent production webhook',
  });
  console.log(`Created webhook ${created.id}`);
  return { id: created.id, secret: created.secret || null };
}

async function findOrCreateCoupon(): Promise<Stripe.Coupon> {
  try {
    const existing = await stripe.coupons.retrieve(COUPON_ID);
    console.log(`Reusing coupon ${existing.id} (${existing.percent_off}% off)`);
    return existing;
  } catch (err: unknown) {
    if (err instanceof Stripe.errors.StripeError && err.statusCode === 404) {
      const created = await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 20,
        duration: 'once',
        name: 'First month 20% off (referral)',
      });
      console.log(`Created coupon ${created.id}`);
      return created;
    }
    throw err;
  }
}

async function main() {
  const mode = secret!.startsWith('sk_live_') ? 'LIVE' : 'TEST';
  console.log(`Stripe mode: ${mode}\nWebhook URL: ${webhookUrl}\n`);

  const product = await findOrCreateProduct();
  const monthly = await findOrCreatePrice(product.id, 'month', PRICE_MONTHLY_PLN);
  const yearly = await findOrCreatePrice(product.id, 'year', PRICE_YEARLY_PLN);
  const webhook = await findOrCreateWebhook();
  const coupon = await findOrCreateCoupon();

  console.log('\n----- Copy to .env.production -----');
  console.log(`STRIPE_SECRET_KEY=${secret}`);
  if (webhook.secret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  } else {
    console.log(
      `# STRIPE_WEBHOOK_SECRET=<unchanged — webhook already existed; retrieve from dashboard or roll>`,
    );
  }
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${monthly.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${yearly.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=${monthly.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=${yearly.id}`);
  console.log(`# Coupon: ${coupon.id}`);
  console.log(`# Webhook endpoint: ${webhook.id}`);
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
