# Referral Program Design

**Date:** 2026-04-12
**Issue:** AIA-79

## Overview

Referral program where users invite others via unique referral codes. When a referred user subscribes to Pro, both parties receive rewards.

## Rewards

- **Referrer (inviter):** Stripe Customer Balance credit equal to 1 month of Pro (applied automatically on next invoice). Max 10 rewards per calendar year.
- **Referred (invitee):** 20% discount on first month of Pro via Stripe Coupon

## Database Schema

### New enum

```prisma
enum ReferralStatus {
  pending      // registered but hasn't subscribed
  converted    // subscribed to Pro
  revoked      // referred user canceled/charged back within 7 days
}
```

### New model

```prisma
model Referral {
  id             String         @id @default(uuid()) @db.Uuid
  referrerUserId String         @db.Uuid
  referredUserId String?        @unique @db.Uuid
  referralCode   String         // snapshot of the code used at referral time
  status         ReferralStatus @default(pending)
  rewardGranted  Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  convertedAt    DateTime?

  referrer       User           @relation("referrals_made", fields: [referrerUserId], references: [id])
  referred       User?          @relation("referred_by", fields: [referredUserId], references: [id])

  @@index([referrerUserId])
  @@map("referrals")
}
```

### User model additions

```prisma
// New fields on User:
referralCode    String   @unique  // generated in app layer via crypto.randomBytes (8 chars, hex)
referredByCode  String?           // referral code used during registration

// New relations:
referralsMade   Referral[] @relation("referrals_made")
referredBy      Referral?  @relation("referred_by")
```

**Note:** `referralCode` is generated at the application layer (not via Prisma default) using `crypto.randomBytes(4).toString('hex')` in the auth service during user creation. A data migration must backfill codes for existing users.

## Referral Flow

1. **Code generation:** Every user gets a `referralCode` on creation (8-char hex via `crypto.randomBytes`)
2. **Sharing:** User copies link `{FRONTEND_URL}/register?ref=ABC12345`
3. **Registration:** New user registers with `?ref=` param:
   - Validate referral code exists via `POST /api/referral/validate`
   - **Self-referral prevention:** reject if code belongs to user with same email
   - Store `referredByCode` on new User
   - Create Referral record with `status: pending`, snapshot `referralCode`
4. **Conversion:** When referred user subscribes to Pro (`checkout.session.completed` webhook):
   - Check referrer reward cap (max 10 per calendar year)
   - Update Referral `status` to `converted`, set `convertedAt`
   - Apply Stripe Customer Balance credit to referrer (1 month Pro value)
   - Set `rewardGranted: true`
5. **Revocation:** If referred user cancels within 7 days (`customer.subscription.deleted` webhook):
   - Update Referral `status` to `revoked`
   - Reverse Stripe credit (positive balance transaction)

## Reward Mechanism — Stripe Credit

When a referral converts:
1. Look up referrer's `stripeCustomerId`
2. Call `stripe.customers.createBalanceTransaction(customerId, { amount: -monthlyProPrice, currency: 'pln' })` (negative = credit)
3. Stripe automatically deducts credit from next invoice

For the referred user's 20% discount:
- Create a reusable Stripe Coupon `first_month_referral` once (manually in Stripe Dashboard or via seed script)
- During checkout session creation, apply coupon via `discounts: [{ coupon: 'first_month_referral' }]` when user has `referredByCode`

## Validation Schemas (Zod)

```typescript
// referral.validators.ts
export const validateCodeSchema = z.object({
  body: z.object({
    code: z.string().length(8).regex(/^[a-f0-9]+$/),
  }),
});
```

Changes to existing validators:
- `auth.validators.ts`: add optional `referredByCode: z.string().length(8).optional()` to `registerSchema`

## API Endpoints

### `GET /api/referral` (authenticated)
Returns user's referral code, share link, and summary stats.

**Response:**
```json
{
  "referralCode": "abc12345",
  "shareLink": "https://app.example.com/register?ref=abc12345",
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

### `POST /api/referral/validate` (public, rate limited: 10/15min per IP)
Validates a referral code during registration.

**Request:** `{ "code": "abc12345" }`
**Response:** `{ "valid": true, "referrerFirstName": "A." }`

Note: Only first initial shown to minimize PII exposure.

## Service Architecture

- `packages/api/src/services/referral.service.ts` — business logic
- `packages/api/src/services/referral.instance.ts` — singleton export
- `packages/api/src/controllers/referral.controller.ts` — HTTP handlers
- `packages/api/src/routes/referral.routes.ts` — Express routes
- `packages/api/src/validators/referral.validators.ts` — Zod schemas

## Changes to Existing Code

- **Auth service** (`auth.service.ts`): generate `referralCode` during user creation; accept `referredByCode` param, create Referral record
- **Auth validators** (`auth.validators.ts`): add optional `referredByCode` to register schema
- **Subscription service** (`subscription.service.ts`): in `checkout.session.completed` handler, trigger referral conversion logic
- **Subscription service**: in `customer.subscription.deleted` handler, check for revocation (within 7 days)

## Frontend

### Registration page (`/register`)
- Read `?ref=` query param
- Call `/api/referral/validate` to verify code
- Show "Invited by {initial}" badge
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

## Migration Notes

- Data migration: generate `referralCode` for all existing users (`UPDATE users SET referral_code = ... WHERE referral_code IS NULL`)
- Create Stripe Coupon `first_month_referral` (20% off, once, forever duration) in Stripe Dashboard

## Testing

- Unit: ReferralService (create, validate, convert, reward granting, self-referral prevention, reward cap)
- Integration: webhook flow (checkout → conversion → Stripe credit; cancellation → revocation)
- E2E: register with ref code → subscribe → verify referrer gets credit
