# Subscriptions & Billing

## What this is
Manages Stripe-based subscription plans (`free` / `pro`), webhook processing, Stripe Customer Portal, and usage-based feature gating. Also handles the referral program: unique referral codes, Stripe credits for referrers, and discount coupons for new users.

## Entry points
- `packages/api/src/services/subscription.service.ts` — `SubscriptionService`: create checkout session, portal session, sync subscription status from Stripe webhooks
- `packages/api/src/services/referral.service.ts` — `ReferralService`: generate/validate referral codes, apply coupon, issue Stripe credit
- `packages/api/src/routes/subscription.routes.ts` — `/api/subscription/*` (checkout, portal, status)
- `packages/api/src/routes/referral.routes.ts` — `/api/referral/*` (code, apply)
- `packages/api/src/routes/webhook.routes.ts` — `/api/webhooks/stripe` — Stripe webhook receiver
- `packages/api/src/middleware/subscription.middleware.ts` — `requirePro()` guard for pro-only routes
- `packages/web/src/app/pricing/page.tsx` — pricing page UI
- `packages/web/src/app/subscription/` — checkout success/cancel/manage pages

## Key concepts
- **Plans** — `free` (limited AI messages) and `pro` (unlimited + extra features); stored as `subscriptionPlan` on `User`.
- **Stripe webhook sync** — `webhook.routes.ts` listens for `customer.subscription.updated/deleted` and syncs plan/status to the `User` model.
- **Subscription middleware** — routes wrapped with `requirePro()` return `403` with an upgrade prompt if the user is on the free plan.
- **Referral codes** — 8-character random codes; referrer gets Stripe balance credit (capped at 10 referrals/year); referred user gets a 20% coupon; 7-day revocation window.
- **Stripe config** — `packages/api/src/config/stripe.config.ts` loads price IDs and webhook secret from env.

## Cross-references
- Talks to: Stripe API (checkout sessions, portal, balance credits, coupons)
- Talks to: `database` — `User.subscriptionPlan/Status`, `Referral` model
- Used by: `api-backend` middleware to gate pro routes
- Used by: `web-frontend` pricing and subscription pages

## Where to look first
`packages/api/src/services/subscription.service.ts` for the Stripe checkout flow; `packages/api/src/middleware/subscription.middleware.ts` to understand how features are gated.
