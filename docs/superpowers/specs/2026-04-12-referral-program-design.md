# Referral Program Design

**Date:** 2026-04-12
**Issue:** AIA-79

## Overview

Referral program where users invite others via unique referral codes. When a referred user subscribes to Pro, both parties receive rewards.

## Rewards

- **Referrer (inviter):** Stripe Customer Balance credit equal to 1 month of Pro (applied automatically on next invoice)
- **Referred (invitee):** 20% discount on first month of Pro via Stripe Coupon

## Database Schema

### New enum

```prisma
enum ReferralStatus {
  pending      // registered but hasn't subscribed
  converted    // subscribed to Pro
}
```

### New model

```prisma
model Referral {
  id             String         @id @default(uuid())
  referrerUserId String
  referredUserId String?        @unique
  status         ReferralStatus @default(pending)
  rewardGranted  Boolean        @default(false)
  createdAt      DateTime       @default(now())
  convertedAt    DateTime?

  referrer       User           @relation("referrals_made", fields: [referrerUserId], references: [id])
  referred       User?          @relation("referred_by", fields: [referredUserId], references: [id])

  @@index([referrerUserId])
}
```

### User model additions

```prisma
// New fields on User:
referralCode    String   @unique @default(nanoid(8))
referredByCode  String?  // referral code used during registration

// New relations:
referralsMade   Referral[] @relation("referrals_made")
referredBy      Referral?  @relation("referred_by")
```

## Referral Flow

1. **Code generation:** Every user gets a `referralCode` on creation (8-char nanoid)
2. **Sharing:** User copies link `{FRONTEND_URL}/register?ref=ABC12345`
3. **Registration:** New user registers with `?ref=` param:
   - Validate referral code exists via `POST /api/referral/validate`
   - Store `referredByCode` on new User
   - Create Referral record with `status: pending`
4. **Conversion:** When referred user subscribes to Pro (`checkout.session.completed` webhook):
   - Update Referral `status` to `converted`, set `convertedAt`
   - Apply Stripe Customer Balance credit to referrer (1 month Pro value)
   - Set `rewardGranted: true`

## Reward Mechanism — Stripe Credit (Variant A)

When a referral converts:
1. Look up referrer's `stripeCustomerId`
2. Call `stripe.customers.createBalanceTransaction(customerId, { amount: -monthlyProPrice, currency: 'pln' })` (negative = credit)
3. Stripe automatically deducts credit from next invoice

For the referred user's 20% discount:
- Create a Stripe Coupon (one-time, 20% off, `first_month_referral`)
- Apply via `stripe.subscriptions.update()` or during checkout session creation with `discounts` parameter

## API Endpoints

### `GET /api/referral` (authenticated)
Returns user's referral code, share link, and summary stats.

**Response:**
```json
{
  "referralCode": "ABC12345",
  "shareLink": "https://app.example.com/register?ref=ABC12345",
  "stats": {
    "totalReferred": 5,
    "converted": 2,
    "pending": 3,
    "totalRewardsEarned": 2
  }
}
```

### `GET /api/referral/stats` (authenticated)
Returns detailed list of referrals.

**Response:**
```json
{
  "referrals": [
    {
      "id": "uuid",
      "referredUserName": "John D.",
      "status": "converted",
      "createdAt": "2026-04-10T...",
      "convertedAt": "2026-04-11T..."
    }
  ]
}
```

### `POST /api/referral/validate` (public)
Validates a referral code during registration.

**Request:** `{ "code": "ABC12345" }`
**Response:** `{ "valid": true, "referrerName": "Alex P." }`

## Frontend

### Registration page (`/register`)
- Read `?ref=` query param
- Call `/api/referral/validate` to verify code
- Show "Invited by {name}" badge
- Pass `referredByCode` in registration payload

### Referral page (`/referral`) — new protected page
- Display referral code and share link with copy button
- Stats: total referred, converted, rewards earned
- Table of referrals with status

### Subscription page — addition
- "Invite friends, get 1 month free Pro" banner with link to `/referral`

### Navigation
- Add "Referral" link in sidebar/nav

## i18n

Add keys for `en`, `pl`, `ru`:
- `referral.title`, `referral.description`
- `referral.copyLink`, `referral.copied`
- `referral.stats.*`
- `referral.invitedBy`
- `referral.reward.*`

## Testing

- Unit: ReferralService (create, validate, convert, reward granting)
- Integration: webhook flow (checkout → conversion → Stripe credit)
- E2E: register with ref code → subscribe → verify referrer gets credit
