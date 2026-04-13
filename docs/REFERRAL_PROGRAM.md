# Referral Program

The referral program lets users invite others to the platform. When a referred user subscribes to the Pro plan, both the referrer and the referred user receive rewards.

## How It Works

1. **Every user gets a unique referral code** (8-character hex, generated at registration)
2. **Share the link:** `https://app.eksiegowy.ai/register?ref=YOUR_CODE`
3. **New user registers** via the referral link — referral is tracked automatically
4. **When the referred user subscribes to Pro:**
   - **Referrer** receives a Stripe Customer Balance credit equal to 1 month of Pro (PLN 14.99)
   - **Referred user** gets 20% off their first month via Stripe coupon

## Rewards

| Recipient | Reward | Condition |
|-----------|--------|-----------|
| Referrer | PLN 14.99 Stripe credit | Referred user subscribes to Pro |
| Referred | 20% off first month | Applied automatically at checkout |

### Limits

- **Annual cap:** Maximum 10 reward credits per referrer per calendar year
- **Revocation:** If the referred user cancels within 7 days of subscribing, the referral is revoked and the Stripe credit is reversed

## Referral Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Referred user registered but hasn't subscribed to Pro |
| `converted` | Referred user subscribed to Pro |
| `revoked` | Referred user canceled within 7 days |

## User Interface

### Referral Dashboard (`/referral`)

- View your referral code and share link (with copy button)
- Stats: total referred, converted, pending, rewards earned
- Table of all referrals with status and dates

### Registration Page

- When visiting `/register?ref=CODE`, the referral code is validated
- A "Invited by {name}" badge appears if the code is valid
- The referral code is stored with the new user's account

### Subscription Page

- A "Invite friends, get 1 month free Pro!" banner links to the referral dashboard

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral` | Required | Get referral code, share link, and stats |
| GET | `/api/referral/stats` | Required | Get detailed list of referrals |
| POST | `/api/referral/validate` | Public | Validate a referral code (rate limited: 10/15min) |

## Database Schema

### Referral Model

```
model Referral {
  id             String         @id @default(uuid()) @db.Uuid
  referrerUserId String         @db.Uuid
  referredUserId String?        @unique @db.Uuid
  referralCode   String         // snapshot of code used
  status         ReferralStatus @default(pending)
  rewardGranted  Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  convertedAt    DateTime?
  @@map("referrals")
}
```

### User Fields

- `referralCode` — unique 8-character hex code (generated via `crypto.randomBytes`)
- `referredByCode` — the referral code used during registration (nullable)

## Stripe Integration

### Referrer Reward (Balance Credit)

When a referral converts, the system calls:
```
stripe.customers.createBalanceTransaction(customerId, {
  amount: -1499,  // PLN 14.99 credit (negative = credit)
  currency: 'pln'
})
```

### Referred User Discount (Coupon)

A reusable Stripe coupon `first_month_referral` (20% off, once) is applied at checkout:
```
stripe.checkout.sessions.create({
  discounts: [{ coupon: 'first_month_referral' }],
  ...
})
```

### Prerequisite

Create the Stripe coupon before the feature is live:
```bash
stripe coupons create --id=first_month_referral --percent-off=20 --duration=once
```

## Implementation Details

### Files

**Backend:**
- `packages/api/src/services/referral.service.ts` — business logic
- `packages/api/src/services/referral.instance.ts` — singleton
- `packages/api/src/controllers/referral.controller.ts` — HTTP handlers
- `packages/api/src/routes/referral.routes.ts` — Express routes
- `packages/api/src/validators/referral.validators.ts` — Zod schemas

**Frontend:**
- `packages/web/src/app/referral/page.tsx` — referral dashboard page
- `packages/web/src/components/referral/ReferralDashboard.tsx` — dashboard component
- `packages/web/src/lib/api/referral.ts` — API client
- `packages/web/src/hooks/useReferral.ts` — React hook

**Modified:**
- `auth.service.ts` — generates referralCode, handles referredByCode
- `subscription.service.ts` — triggers conversion on checkout, revocation on cancel, applies coupon
- `RegistrationForm.tsx` — reads `?ref=` param, shows badge

### i18n

Translation keys in `packages/web/src/i18n/locales/{en,pl,ru}.json` under the `referral` namespace.
