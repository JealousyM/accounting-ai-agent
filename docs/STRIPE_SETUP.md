# Stripe Setup Guide

This guide explains how to set up Stripe integration and obtain all necessary environment variables.

## Prerequisites

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Complete account verification (if required)

---

## 1. Get Stripe API Keys

### Step 1.1: Navigate to API Keys
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in the left sidebar
3. Click **API keys**

### Step 1.2: Get Secret Key
1. In the **Standard keys** section, find **Secret key**
2. Click **Reveal test key** (or **Reveal live key** for production)
3. Copy the key (starts with `sk_test_...` for test mode or `sk_live_...` for production)
4. Add to `packages/api/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key_here
   ```

⚠️ **Security:** Never commit this key to git. It should only be in `.env` (which is in `.gitignore`).

---

## 2. Create Products and Prices

### Step 2.1: Create Pro Product
1. Go to [Products](https://dashboard.stripe.com/products)
2. Click **+ Add product**
3. Fill in:
   - **Name:** Pro Plan
   - **Description:** Full access with included API credits
   - **Pricing model:** Standard pricing
4. Click **Add pricing**

### Step 2.2: Create Monthly Price
1. In the pricing section:
   - **Price:** PLN19.99
   - **Billing period:** Monthly
   - **Currency:** PLN
2. Click **Save product**
3. Copy the **Price ID** (starts with `price_...`)
4. Add to both files:

   **Backend** (`packages/api/.env`):
   ```env
   STRIPE_PRICE_PRO_MONTHLY=price_1234567890abcdef
   ```

   **Frontend** (`packages/web/.env.local`):
   ```env
   NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1234567890abcdef
   ```

### Step 2.3: Create Yearly Price
1. Click on your **Pro Plan** product
2. Click **+ Add another price**
3. Fill in:
   - **Price:** PLN199.00
   - **Billing period:** Yearly
   - **Currency:** PLN
4. Click **Save**
5. Copy the **Price ID**
6. Add to both files:

   **Backend** (`packages/api/.env`):
   ```env
   STRIPE_PRICE_PRO_YEARLY=price_9876543210zyxwvu
   ```

   **Frontend** (`packages/web/.env.local`):
   ```env
   NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_9876543210zyxwvu
   ```

---

## 3. Set Up Webhooks

### Step 3.1: Create Webhook Endpoint
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Fill in:
   - **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
     - For local development: Use [ngrok](https://ngrok.com) or [Stripe CLI](https://stripe.com/docs/stripe-cli)
     - Example: `https://abc123.ngrok.io/api/webhooks/stripe`
4. Click **Select events**

### Step 3.2: Select Events to Listen
Select these events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.paid`
- ✅ `invoice.payment_failed`

Click **Add events** → **Add endpoint**

### Step 3.3: Get Webhook Secret
1. Click on your newly created webhook endpoint
2. Click **Reveal** in the **Signing secret** section
3. Copy the secret (starts with `whsec_...`)
4. Add to `packages/api/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

---

## 4. Configure Customer Portal (Optional but Recommended)

### Step 4.1: Enable Customer Portal
1. Go to [Customer Portal Settings](https://dashboard.stripe.com/settings/billing/portal)
2. Click **Activate**
3. Configure:
   - **Allowed actions:**
     - ✅ Cancel subscriptions
     - ✅ Update payment methods
     - ✅ View invoice history
   - **Cancellation behavior:** Choose your preference (immediate or end of period)
4. Click **Save**

### Step 4.2: Get Configuration ID (Optional)
If you created a custom configuration:
1. The configuration ID will be shown (starts with `bpc_...`)
2. Add to `packages/api/.env`:
   ```env
   STRIPE_PORTAL_CONFIGURATION_ID=bpc_your_configuration_id
   ```

---

## 5. Additional Configuration

### Step 5.1: Frontend URL
Add to `packages/api/.env`:
```env
FRONTEND_URL=http://localhost:3001
```

Change this to your production URL when deploying.

### Step 5.2: Success/Cancel URLs (Optional)
You can customize redirect URLs. Add to `packages/api/.env`:
```env
STRIPE_SUCCESS_URL=/subscription/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=/subscription/cancel
```

---

## Complete Environment Files

### Backend `.env` (packages/api/.env)
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC123...XYZ
STRIPE_WEBHOOK_SECRET=whsec_abc123...xyz
STRIPE_PRICE_PRO_MONTHLY=price_1ABC123...XYZ
STRIPE_PRICE_PRO_YEARLY=price_1DEF456...UVW

# Optional
STRIPE_PORTAL_CONFIGURATION_ID=bpc_1GHI789...RST
STRIPE_SUCCESS_URL=/subscription/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=/subscription/cancel
FRONTEND_URL=http://localhost:3001

# ... your other environment variables
```

### Frontend `.env.local` (packages/web/.env.local)
```env
# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1ABC123...XYZ
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_1DEF456...UVW

# ... your other environment variables
```

---

## Local Development

For detailed instructions on local development with Stripe, see:

👉 **[STRIPE_LOCAL_DEVELOPMENT.md](./STRIPE_LOCAL_DEVELOPMENT.md)**

Quick start:
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3011/api/webhooks/stripe

# Terminal 3: Start frontend
npm run dev --filter=@accounting-ai-agent/web
```

Copy the webhook secret from Terminal 2 to `packages/api/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Test Cards

Use these test card numbers in Stripe Checkout:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

- **Expiry:** Any future date
- **CVC:** Any 3 digits
- **ZIP:** Any 5 digits

---

## Verification Checklist

Before going live, verify:

- [ ] Backend has `STRIPE_SECRET_KEY` in `.env`
- [ ] Backend has `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] Backend has both price IDs in `.env`
- [ ] Frontend has both price IDs in `.env.local`
- [ ] Webhook endpoint is created and active
- [ ] Webhook endpoint URL points to your server
- [ ] All required webhook events are selected
- [ ] Customer Portal is configured
- [ ] Test subscription flow works with test card
- [ ] Webhook events are being received (check Stripe Dashboard → Events)

---

## Switching to Production

When ready to go live:

1. **Switch Stripe to Live Mode:**
   - Toggle from **Test mode** to **Live mode** in Stripe Dashboard

2. **Get Live Keys:**
   - Get live Secret Key (starts with `sk_live_...`)
   - Create new webhook endpoint with live mode
   - Get new webhook secret

3. **Update Environment:**
   - Update `STRIPE_SECRET_KEY` with live key
   - Update `STRIPE_WEBHOOK_SECRET` with live secret
   - Price IDs remain the same if you created them in live mode

4. **Verify Live Webhook:**
   - Send a test webhook from Stripe Dashboard
   - Confirm your server receives it

---

## Troubleshooting

### Webhook not receiving events
- Check that webhook URL is publicly accessible
- Verify webhook secret is correct
- Check server logs for webhook errors
- In Stripe Dashboard → Webhooks → Click on your endpoint → Check "Events" tab

### "Invalid signature" error
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint
- Verify webhook route uses `express.raw()` middleware (already configured in `webhook.routes.ts`)

### Checkout not redirecting
- Verify `FRONTEND_URL` is set correctly
- Check price IDs are valid and match the product

### Price IDs not found
- Ensure you copied the Price ID, not the Product ID
- Price IDs start with `price_`, Product IDs start with `prod_`

---

## Referral Coupon Setup

The referral program requires a Stripe coupon for referred users' first-month discount.

### Create the Coupon

In the Stripe Dashboard:
1. Go to **Products → Coupons → + New**
2. Set:
   - **ID:** `first_month_referral`
   - **Type:** Percentage
   - **Discount:** 20%
   - **Duration:** Once
   - **Max redemptions:** Leave empty (unlimited)
3. Click **Create coupon**

Or via Stripe CLI:
```bash
stripe coupons create --id=first_month_referral --percent-off=20 --duration=once
```

### How It Works

- When a user with `referredByCode` creates a checkout session, the coupon is automatically applied via `discounts: [{ coupon: 'first_month_referral' }]`
- Referrer receives a Stripe Customer Balance credit equal to 1 month Pro (PLN 14.99)
- Max 10 reward credits per referrer per calendar year
- If referred user cancels within 7 days, the credit is reversed

---

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
