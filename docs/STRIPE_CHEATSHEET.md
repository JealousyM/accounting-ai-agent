# Stripe Development Cheatsheet

Quick reference for daily work.

---

## Daily Startup (3 terminals)

```bash
# Terminal 1: Backend
cd d:/Work/inprogress/ai/sandbox/accounting-ai-agent
npm run docker:up
npm run dev

# Terminal 2: Stripe webhooks
stripe listen --forward-to localhost:3011/api/webhooks/stripe

# Terminal 3: Frontend
npm run dev --filter=@accounting-ai-agent/web
```

---

## Test Data

### Cards
```
Success:   4242 4242 4242 4242
Declined:  4000 0000 0000 0002
No funds:  4000 0000 0000 9995

Expiry: any future date
CVC: any 3 digits
ZIP: any 5 digits
```

---

## Stripe CLI Commands

### Events
```bash
# List recent events
stripe events list --limit 10

# View specific event
stripe events retrieve evt_xxxxx

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### Subscriptions
```bash
# List subscriptions
stripe subscriptions list

# Subscription details
stripe subscriptions retrieve sub_xxxxx

# Cancel subscription
stripe subscriptions cancel sub_xxxxx
```

### Customers
```bash
# List customers
stripe customers list

# Customer details
stripe customers retrieve cus_xxxxx
```

### Products and Prices
```bash
# List products
stripe products list

# List prices
stripe prices list

# Create price
stripe prices create --product=prod_xxxxx --currency=usd --unit-amount=1999 --recurring[interval]=month
```

---

## Environment Variables

### Backend `.env`
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From stripe listen
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
FRONTEND_URL=http://localhost:3001
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_...
```

---

## Useful URLs

### Local
```
Frontend:  http://localhost:3001
Backend:   http://localhost:3011
Pricing:   http://localhost:3001/pricing
Webhook:   http://localhost:3011/api/webhooks/stripe
```

### Stripe Dashboard
```
Test mode:     https://dashboard.stripe.com/test
Products:      https://dashboard.stripe.com/test/products
Webhooks:      https://dashboard.stripe.com/test/webhooks
Events:        https://dashboard.stripe.com/test/events
Customers:     https://dashboard.stripe.com/test/customers
Subscriptions: https://dashboard.stripe.com/test/subscriptions
```

---

## API Endpoints

```
GET  /api/subscription          - Current subscription
GET  /api/subscription/plans    - Available plans
GET  /api/subscription/usage    - Usage stats
POST /api/subscription/checkout - Create checkout
POST /api/subscription/portal   - Open billing portal
POST /api/subscription/cancel   - Cancel subscription
PUT  /api/subscription/llm-preference - Switch LLM key
POST /api/webhooks/stripe       - Stripe webhooks
```

---

## Database Verification

```bash
# Open Prisma Studio
npm run prisma:studio

# Check User model:
# - subscriptionPlan
# - subscriptionStatus
# - stripeCustomerId
# - stripeSubscriptionId
```

---

## Typical Testing Flow

1. Open `http://localhost:3001`
2. Log in to account
3. Go to `/pricing`
4. Click "Upgrade to Pro"
5. Enter `4242 4242 4242 4242`
6. Verify:
   - Redirect to `/subscription/success`
   - Terminal 2 shows webhook events
   - In Prisma Studio `subscriptionPlan = 'pro'`
   - `/subscription` shows Pro plan

---

## Debugging

### Check Webhook
```bash
# Real-time logs
stripe listen --forward-to localhost:3011/api/webhooks/stripe

# Events in dashboard
https://dashboard.stripe.com/test/events
```

### Check Subscription in DB
```bash
npm run prisma:studio
# User → find by email → check subscription fields
```

### Check Server Logs
```bash
# In terminal where npm run dev is running
# Look for: [Subscription] Processing webhook event
```

---

## Common Errors

### Invalid signature
```
❌ No signatures found matching the expected signature
✓ Check STRIPE_WEBHOOK_SECRET in .env
✓ Restart backend after changing .env
```

### Webhook 404
```
❌ Cannot POST /api/webhooks/stripe
✓ Check that webhookRoutes are added BEFORE express.json()
```

### Price not found
```
❌ No such price: price_xxxxx
✓ Check that STRIPE_PRICE_PRO_MONTHLY is in both .env files
✓ Make sure it's a Price ID, not a Product ID
```

---

## Quick Checks

```bash
# Stripe CLI version
stripe --version

# Authentication status
stripe config --list

# Check webhook is working
stripe trigger checkout.session.completed
# Should show event in Terminal 2
```

---

## Cleaning Test Data

```bash
# Delete all test customers
stripe customers list | grep cus_ | xargs -I {} stripe customers delete {}

# Or via Dashboard
https://dashboard.stripe.com/test/customers
# → Select all → Delete
```

---

## Switching Test ↔ Live

```bash
# Check current mode
stripe config --list

# Test mode keys start with sk_test_
# Live mode keys start with sk_live_

# Toggle in Dashboard: switch in top right corner
```

---

## Project Files Reference

### Backend
```
packages/api/src/
├── config/stripe.config.ts          - Stripe client
├── types/subscription.types.ts      - Types
├── services/subscription.service.ts - Logic
├── middleware/subscription.middleware.ts - Checks
├── controllers/subscription.controller.ts - Handlers
├── controllers/webhook.controller.ts - Webhooks
└── routes/
    ├── subscription.routes.ts
    └── webhook.routes.ts
```

### Frontend
```
packages/web/src/
├── lib/api/subscription.ts          - API client
├── hooks/useSubscription.ts         - React hook
├── app/
│   ├── pricing/page.tsx
│   └── subscription/
│       ├── page.tsx
│       ├── success/page.tsx
│       └── cancel/page.tsx
└── components/subscription/
    ├── PricingPlans.tsx
    ├── SubscriptionManagement.tsx
    ├── UsageMeter.tsx
    ├── CurrentPlanBadge.tsx
    └── UpgradeModal.tsx
```

---

## Referral Program

```bash
# Create referral coupon
stripe coupons create --id=first_month_referral --percent-off=20 --duration=once

# List coupons
stripe coupons list

# Check customer balance (referral credits)
stripe customers retrieve cus_xxx --expand='["balance_transactions"]'

# Simulate referral checkout with coupon
stripe checkout sessions create \
  --success-url="http://localhost:3001/subscription/success" \
  --mode=subscription \
  --line-items='[{"price":"price_xxx","quantity":1}]' \
  --discounts='[{"coupon":"first_month_referral"}]'
```

---

## Related Documentation

- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Full setup instructions
- [STRIPE_LOCAL_DEVELOPMENT.md](./STRIPE_LOCAL_DEVELOPMENT.md) - Detailed local development guide
- This file - Quick reference

---

## Keyboard Shortcuts

```
Ctrl+C  - Stop process in terminal
Ctrl+R  - Search command history
↑/↓     - Navigate command history
```
