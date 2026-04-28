# Stripe Local Development Guide

A detailed guide for local development with Stripe without the need to deploy.

---

## The Problem

Stripe webhooks require a public URL, but your local server (`localhost:3011`) is not accessible from the internet.

## The Solution

There are two ways:
1. **Stripe CLI** (recommended) - official tool
2. **ngrok** - alternative for tunneling

---

## Method 1: Stripe CLI (Recommended)

### Installing Stripe CLI

#### Windows
```powershell
# Via Scoop
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Or download directly
# https://github.com/stripe/stripe-cli/releases/latest
```

#### macOS
```bash
brew install stripe/stripe-cli/stripe
```

#### Linux
```bash
# Debian/Ubuntu
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Verify Installation
```bash
stripe --version
```

### Initial Setup

#### 1. Log in to Stripe
```bash
stripe login
```

This will open a browser for authorization. After authorization you will see:
```
Your pairing code is: xxxxx-xxxxx
This pairing code verifies your authentication with Stripe.
Press Enter to open the browser or visit https://dashboard.stripe.com/stripecli/confirm_auth?t=xxxxx
```

Press Enter and confirm in the browser.

#### 2. Verify Connection
```bash
stripe config --list
```

Should show your test mode API key.

---

## Local Development: Step-by-Step Instructions

### Step 1: Start your backend server

In one terminal:
```bash
cd d:/Work/inprogress/ai/sandbox/accounting-ai-agent
npm run dev
```

Server will start on `http://localhost:3011`

### Step 2: Start Stripe webhook forwarding

In **another terminal**:
```bash
stripe listen --forward-to localhost:3011/api/webhooks/stripe
```

You will see:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**IMPORTANT:** Copy this webhook secret!

### Step 3: Add webhook secret to .env

Open `packages/api/.env` and add/update:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 4: Restart backend

In the first terminal:
- Stop the server (Ctrl+C)
- Start again: `npm run dev`

### Step 5: Start frontend

In a **third terminal**:
```bash
cd d:/Work/inprogress/ai/sandbox/accounting-ai-agent
npm run dev --filter=@accounting-ai-agent/web
```

---

## Local Development Workflow

Now you have 3 processes running:

```
┌─────────────────────┐
│  Terminal 1         │  Backend Server
│  npm run dev        │  http://localhost:3011
└─────────────────────┘

┌─────────────────────┐
│  Terminal 2         │  Stripe CLI
│  stripe listen      │  Forwarding webhooks
└─────────────────────┘

┌─────────────────────┐
│  Terminal 3         │  Frontend Server
│  npm run dev --filter│  http://localhost:3001
└─────────────────────┘
```

### Testing Subscription

1. Open browser: `http://localhost:3001`
2. Log in to your account
3. Go to `/pricing`
4. Click "Upgrade to Pro"
5. Use test card: `4242 4242 4242 4242`
6. Watch the logs in **Terminal 2** (Stripe CLI)

You will see:
```
2024-01-26 10:30:15   --> checkout.session.completed [evt_xxx]
2024-01-26 10:30:15  <--  [200] POST http://localhost:3011/api/webhooks/stripe [evt_xxx]
2024-01-26 10:30:16   --> customer.subscription.created [evt_yyy]
2024-01-26 10:30:16  <--  [200] POST http://localhost:3011/api/webhooks/stripe [evt_yyy]
```

---

## Testing Specific Events

### Triggering Events Manually

```bash
# Successful checkout
stripe trigger checkout.session.completed

# Subscription created
stripe trigger customer.subscription.created

# Payment failed
stripe trigger invoice.payment_failed

# Subscription cancelled
stripe trigger customer.subscription.deleted
```

### View All Available Events
```bash
stripe trigger --help
```

---

## Minimal .env Configuration for Local Development

### Backend (`packages/api/.env`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/accounting_db"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"

# Stripe (TEST MODE)
STRIPE_SECRET_KEY=sk_test_51ABCxxx...xyz
STRIPE_WEBHOOK_SECRET=whsec_xxx...yyy  # <- From stripe listen
STRIPE_PRICE_PRO_MONTHLY=price_1ABCxxx
STRIPE_PRICE_PRO_YEARLY=price_1DEFxxx

# URLs
FRONTEND_URL=http://localhost:3001

# Optional - will use app credentials
OPENAI_API_KEY=sk-proj-xxx

# wFirma (optional for testing)
WFIRMA_ACCESS_KEY=your_test_key
WFIRMA_SECRET_KEY=your_test_secret
WFIRMA_APP_KEY=your_app_key
WFIRMA_COMPANY_ID=your_company_id
```

### Frontend (`packages/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3011
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1ABCxxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_1DEFxxx
```

---

## Method 2: ngrok (Alternative)

If for some reason Stripe CLI doesn't work.

### Installing ngrok

1. Download from [https://ngrok.com/download](https://ngrok.com/download)
2. Unpack and add to PATH

### Usage

```bash
# Start tunnel
ngrok http 3011
```

You will get:
```
Session Status                online
Forwarding                    https://abc123.ngrok.io -> http://localhost:3011
```

### Setting up webhook in Stripe

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Create new endpoint
3. URL: `https://abc123.ngrok.io/api/webhooks/stripe`
4. Select events (see STRIPE_SETUP.md)
5. Copy webhook secret
6. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_from_dashboard
   ```

**Downside:** Each time ngrok restarts the URL changes, you need to update the webhook endpoint.

---

## Debugging

### Checking Webhook Events

#### In Stripe CLI
All events are visible in real-time in the terminal with `stripe listen`

#### In Stripe Dashboard
1. [Developers → Events](https://dashboard.stripe.com/test/events)
2. All test mode events are visible here
3. You can view payload and response

### Checking Server Logs

Your backend code already has logging:
```typescript
logger.info('[Subscription] Processing webhook event', { type: event.type });
```

Check the console where backend is running (Terminal 1).

### Common Problems

#### 1. "Invalid signature" error
```
Error: No signatures found matching the expected signature for payload
```

**Solution:**
- Make sure `STRIPE_WEBHOOK_SECRET` in `.env` matches what `stripe listen` shows
- Restart backend after changing `.env`

#### 2. Webhook events not arriving
```
# Nothing shows in stripe listen
```

**Solution:**
- Make sure backend is running
- Check URL: `stripe listen --forward-to localhost:3011/api/webhooks/stripe`
- Check that webhook route is registered in `index.ts`

#### 3. "Webhook not found" (404)
**Solution:**
- Check that in `index.ts` webhook routes are added **BEFORE** `express.json()`:
  ```typescript
  app.use('/api/webhooks', webhookRoutes);  // BEFORE express.json()
  app.use(express.json());
  ```

---

## Full Workflow

### Morning - Starting Development

```bash
# Terminal 1: Backend
cd d:/Work/inprogress/ai/sandbox/accounting-ai-agent
npm run docker:up        # Start PostgreSQL + Redis
npm run dev             # Start API

# Terminal 2: Stripe
stripe login            # If not logged in yet
stripe listen --forward-to localhost:3011/api/webhooks/stripe

# Terminal 3: Frontend
npm run dev --filter=@accounting-ai-agent/web
```

### Testing

1. Open `http://localhost:3001`
2. Register/login
3. Go to `/pricing`
4. Click "Upgrade to Pro"
5. Enter test card: `4242 4242 4242 4242`
6. Verify that:
   - Checkout completed successfully
   - Redirect to `/subscription/success`
   - Terminal 2 shows webhook events
   - Database updated `subscriptionPlan = 'pro'`

### Checking in Database

```bash
# Connect to DB
npm run prisma:studio
```

Open `User` model and check fields:
- `subscriptionPlan` = "pro"
- `subscriptionStatus` = "active"
- `stripeCustomerId` = "cus_xxx"
- `stripeSubscriptionId` = "sub_xxx"

### Evening - Ending Work

```bash
# Terminal 2: Stripe CLI
Ctrl+C  # Stop stripe listen

# Terminal 1: Backend
Ctrl+C  # Stop dev server
npm run docker:down  # Stop Docker (optional)

# Terminal 3: Frontend
Ctrl+C  # Stop dev server
```

---

## Additional Stripe CLI Commands

### View Latest Events
```bash
stripe events list --limit 10
```

### View Specific Event
```bash
stripe events retrieve evt_xxxxx
```

### View Subscriptions
```bash
stripe subscriptions list
```

### View Customers
```bash
stripe customers list
```

### Cancel Subscription (for testing)
```bash
stripe subscriptions cancel sub_xxxxx
```

---

## Automation (optional)

### Create npm script for simultaneous launch

Add to root `package.json`:
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev\" \"npm run dev --filter=@accounting-ai-agent/web\" \"stripe listen --forward-to localhost:3011/api/webhooks/stripe\"",
    "dev:stripe": "stripe listen --forward-to localhost:3011/api/webhooks/stripe"
  }
}
```

Install `concurrently`:
```bash
npm install -D concurrently
```

Now you can start everything with one command:
```bash
npm run dev:all
```

---

## Checklist Before Starting Development

- [ ] Docker is running (`npm run docker:up`)
- [ ] Database is migrated (`npm run prisma:migrate`)
- [ ] `.env` contains `STRIPE_WEBHOOK_SECRET` from `stripe listen`
- [ ] Backend is running (Terminal 1)
- [ ] Stripe CLI is running (Terminal 2)
- [ ] Frontend is running (Terminal 3)
- [ ] Test card works (`4242 4242 4242 4242`)
- [ ] Webhook events are visible in Stripe CLI

---

## FAQ

### Q: Do I need to run `stripe listen` every time?
**A:** Yes, for each new development session. But the webhook secret stays the same if you use `stripe listen` (not creating an endpoint in the dashboard).

### Q: Can I use production keys locally?
**A:** No! Always use test mode (`sk_test_...`) for local development.

### Q: What if the webhook secret keeps changing?
**A:** When using `stripe listen` the secret stays the same. If using ngrok - yes, the URL and secret change with each restart.

### Q: How to see which subscriptions were created?
**A:**
```bash
stripe subscriptions list
# or
npm run prisma:studio  # View in DB
```

### Q: Can I test subscription cancellation?
**A:** Yes:
```bash
# Find subscription ID
stripe subscriptions list
# Cancel
stripe subscriptions cancel sub_xxxxx
```

---

## Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [ngrok Documentation](https://ngrok.com/docs)

---

## Next Steps

After local development is set up, you can:
1. Test various scenarios (success, cancel, payment failure)
2. Add new subscription features
3. Test UI/UX flows
4. Prepare for production deployment

For deployment see `STRIPE_SETUP.md` section "Switching to Production".
