# Referral Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a referral program where users invite others via unique codes; when the referred user subscribes to Pro, both parties get rewards (referrer: 1 month Stripe credit, referred: 20% first-month discount).

**Architecture:** New `Referral` Prisma model + `ReferralService` following existing singleton pattern. Hooks into auth registration flow and Stripe webhook handlers. New frontend `/referral` page with stats, plus modifications to registration form.

**Tech Stack:** Prisma, Express, Stripe API, Zod, React, Next.js 15, Tailwind CSS, i18n (en/pl/ru)

**Spec:** `docs/superpowers/specs/2026-04-12-referral-program-design.md`

---

## File Map

### New files (Backend)
| File | Responsibility |
|------|---------------|
| `packages/api/src/services/referral.service.ts` | Business logic: validate codes, create referrals, convert, grant rewards |
| `packages/api/src/services/referral.instance.ts` | Singleton export |
| `packages/api/src/controllers/referral.controller.ts` | HTTP handlers for referral endpoints |
| `packages/api/src/routes/referral.routes.ts` | Express route definitions |
| `packages/api/src/validators/referral.validators.ts` | Zod schemas for referral endpoints |
| `packages/api/src/__tests__/referral.service.test.ts` | Unit tests for ReferralService |

### New files (Frontend)
| File | Responsibility |
|------|---------------|
| `packages/web/src/app/referral/page.tsx` | Referral dashboard page |
| `packages/web/src/components/referral/ReferralDashboard.tsx` | Main referral UI: code, link, stats, table |
| `packages/web/src/lib/api/referral.ts` | API client for referral endpoints |
| `packages/web/src/hooks/useReferral.ts` | React hook for referral data |

### Modified files
| File | Change |
|------|--------|
| `packages/api/prisma/schema.prisma` | Add `ReferralStatus` enum, `Referral` model, User fields |
| `packages/api/src/services/auth.service.ts` | Generate `referralCode` on user creation, handle `referredByCode` |
| `packages/api/src/validators/auth.validators.ts` | Add `referredByCode` to register schema |
| `packages/api/src/services/subscription.service.ts` | Trigger referral conversion on checkout, revocation on cancel, apply coupon for referred users |
| `packages/api/src/index.ts` | Register referral routes |
| `packages/web/src/app/subscription/page.tsx` | Add referral banner CTA |
| `packages/web/src/lib/api/auth.ts` | Add `referredByCode` to `RegisterData` |
| `packages/web/src/lib/validations/auth.ts` | Add `referredByCode` to frontend schema |
| `packages/web/src/components/auth/RegistrationForm.tsx` | Read `?ref=` param, show badge, pass code |
| `packages/web/src/i18n/locales/en.json` | Add referral i18n keys |
| `packages/web/src/i18n/locales/pl.json` | Add referral i18n keys |
| `packages/web/src/i18n/locales/ru.json` | Add referral i18n keys |

---

## Task 1: Database Schema — Referral Model + User Fields

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

- [ ] **Step 1: Add ReferralStatus enum after existing enums (~line 40)**

Add after the last enum block:

```prisma
enum ReferralStatus {
  pending
  converted
  revoked
}
```

- [ ] **Step 2: Add Referral model after User model (~line 205)**

```prisma
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

  referrer       User           @relation("referrals_made", fields: [referrerUserId], references: [id])
  referred       User?          @relation("referred_by", fields: [referredUserId], references: [id])

  @@index([referrerUserId])
  @@map("referrals")
}
```

- [ ] **Step 3: Add referral fields to User model**

Add these fields in the User model after `cancelAtPeriodEnd` (~line 156):

```prisma
  // Referral program
  referralCode    String?  @unique  // 8-char hex, generated in app layer
  referredByCode  String?           // referral code used during registration
```

Add these relations at the end of User relations (~line 196):

```prisma
  referralsMade   Referral[] @relation("referrals_made")
  referredBy      Referral?  @relation("referred_by")
```

Add index:
```prisma
  @@index([referralCode])
```

- [ ] **Step 4: Generate Prisma client and create migration**

Run:
```bash
cd packages/api
npx prisma generate
npx prisma migrate dev --name add_referral_program
```

Expected: Migration created successfully, no errors.

- [ ] **Step 5: Backfill referral codes for existing users**

Edit the generated migration SQL file (before committing) to add backfill:

```sql
-- Add at the end of the generated migration file:
UPDATE users SET referral_code = substr(md5(random()::text), 1, 8) WHERE referral_code IS NULL;
ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;
```

Then update schema to make `referralCode` non-nullable:
```prisma
  referralCode    String   @unique  // 8-char hex, generated in app layer
```

Re-run `npx prisma generate`.

- [ ] **Step 6: Commit**

```bash
git add packages/api/prisma/
git commit -m "feat(db): add Referral model and user referral fields (AIA-79)"
```

---

## Task 2: Referral Validators (Zod)

**Files:**
- Create: `packages/api/src/validators/referral.validators.ts`
- Modify: `packages/api/src/validators/auth.validators.ts`

- [ ] **Step 1: Create referral validators**

```typescript
// packages/api/src/validators/referral.validators.ts
import { z } from 'zod';

export const validateCodeSchema = z.object({
  body: z.object({
    code: z.string().length(8, 'Referral code must be 8 characters').regex(/^[a-f0-9]+$/, 'Invalid referral code format'),
  }),
});

export type ValidateCodeInput = z.infer<typeof validateCodeSchema>['body'];
```

- [ ] **Step 2: Add referredByCode to register schema**

In `packages/api/src/validators/auth.validators.ts`, add inside the `registerSchema` body object (after `llmModel` field, ~line 72):

```typescript
    referredByCode: z.string().length(8).optional(),
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/validators/
git commit -m "feat(api): add referral Zod validators and referredByCode to register schema (AIA-79)"
```

---

## Task 3: ReferralService — Core Business Logic

**Files:**
- Create: `packages/api/src/services/referral.service.ts`
- Create: `packages/api/src/services/referral.instance.ts`
- Test: `packages/api/src/__tests__/referral.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/api/src/__tests__/referral.service.test.ts`:

```typescript
import { ReferralService } from '../services/referral.service';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  referral: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
} as any;

// Mock Stripe
const mockStripe = {
  customers: {
    createBalanceTransaction: jest.fn(),
  },
} as any;

describe('ReferralService', () => {
  let service: ReferralService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralService(mockPrisma, mockStripe);
  });

  describe('validateCode', () => {
    it('returns valid=true for existing code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: 'Alex',
        referralCode: 'abc12345',
      });

      const result = await service.validateCode('abc12345');
      expect(result).toEqual({ valid: true, referrerFirstName: 'A.' });
    });

    it('returns valid=false for non-existent code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateCode('nonexist');
      expect(result).toEqual({ valid: false });
    });
  });

  describe('createReferral', () => {
    it('creates referral record on registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'referrer-1',
        referralCode: 'abc12345',
      });
      mockPrisma.referral.create.mockResolvedValue({ id: 'ref-1' });

      await service.createReferral('referred-1', 'abc12345');

      expect(mockPrisma.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerUserId: 'referrer-1',
          referredUserId: 'referred-1',
          referralCode: 'abc12345',
          status: 'pending',
        }),
      });
    });

    it('throws if self-referral', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        referralCode: 'abc12345',
      });

      await expect(service.createReferral('user-1', 'abc12345')).rejects.toThrow(
        'Self-referral is not allowed'
      );
    });
  });

  describe('convertReferral', () => {
    it('converts referral and grants Stripe credit', async () => {
      mockPrisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'referrer-1',
        status: 'pending',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'referrer-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.referral.count.mockResolvedValue(3); // under cap
      mockPrisma.referral.update.mockResolvedValue({});
      mockStripe.customers.createBalanceTransaction.mockResolvedValue({});

      await service.convertReferral('referred-1');

      expect(mockStripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
        'cus_123',
        expect.objectContaining({ amount: expect.any(Number), currency: 'pln' })
      );
      expect(mockPrisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: expect.objectContaining({
          status: 'converted',
          rewardGranted: true,
        }),
      });
    });

    it('skips reward if referrer hit annual cap (10)', async () => {
      mockPrisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'referrer-1',
        status: 'pending',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'referrer-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.referral.count.mockResolvedValue(10); // at cap

      await service.convertReferral('referred-1');

      expect(mockStripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
      expect(mockPrisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: expect.objectContaining({
          status: 'converted',
          rewardGranted: false,
        }),
      });
    });
  });

  describe('checkRevocation', () => {
    it('revokes referral and reverses credit within 7 days', async () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      mockPrisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'referrer-1',
        referredUserId: 'referred-1',
        status: 'converted',
        rewardGranted: true,
        convertedAt: recentDate,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'referrer-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.referral.update.mockResolvedValue({});
      mockStripe.customers.createBalanceTransaction.mockResolvedValue({});

      await service.checkRevocation('referred-1');

      expect(mockStripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
        'cus_123',
        expect.objectContaining({ amount: expect.any(Number), currency: 'pln' })
      );
      expect(mockPrisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { status: 'revoked' },
      });
    });

    it('does nothing after 7-day window', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      mockPrisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'referrer-1',
        status: 'converted',
        rewardGranted: true,
        convertedAt: oldDate,
      });

      await service.checkRevocation('referred-1');

      expect(mockStripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
      expect(mockPrisma.referral.update).not.toHaveBeenCalled();
    });

    it('skips Stripe reversal when rewardGranted is false', async () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockPrisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'referrer-1',
        status: 'converted',
        rewardGranted: false,
        convertedAt: recentDate,
      });
      mockPrisma.referral.update.mockResolvedValue({});

      await service.checkRevocation('referred-1');

      expect(mockStripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
      expect(mockPrisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { status: 'revoked' },
      });
    });
  });

  describe('getReferralInfo', () => {
    it('returns referral code and stats', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        referralCode: 'abc12345',
      });
      mockPrisma.referral.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // converted
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1); // rewardGranted

      const result = await service.getReferralInfo('user-1');

      expect(result).toEqual({
        referralCode: 'abc12345',
        shareLink: expect.stringContaining('ref=abc12345'),
        stats: {
          totalReferred: 5,
          converted: 2,
          pending: 3,
          totalRewardsEarned: 1,
        },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && npx jest src/__tests__/referral.service.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../services/referral.service'`

- [ ] **Step 3: Implement ReferralService**

Create `packages/api/src/services/referral.service.ts`:

```typescript
import { PrismaClient, ReferralStatus } from '@prisma/client';
import Stripe from 'stripe';
import { logger } from '../utils/logger';

const ANNUAL_REWARD_CAP = 10;
const MONTHLY_PRO_PRICE_CENTS = 1499; // PLN 14.99 in grosz
const REVOCATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class ReferralService {
  constructor(
    private prisma: PrismaClient,
    private stripe: Stripe
  ) {}

  /**
   * Validate a referral code. Returns referrer's first initial if valid.
   */
  async validateCode(code: string): Promise<{ valid: boolean; referrerFirstName?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, firstName: true },
    });

    if (!user) {
      return { valid: false };
    }

    const initial = user.firstName ? `${user.firstName.charAt(0)}.` : '?';
    return { valid: true, referrerFirstName: initial };
  }

  /**
   * Create a referral record when a new user registers with a referral code.
   */
  async createReferral(referredUserId: string, referralCode: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      logger.warn('[Referral] Invalid referral code during registration', { referralCode });
      return;
    }

    if (referrer.id === referredUserId) {
      throw new Error('Self-referral is not allowed');
    }

    await this.prisma.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId,
        referralCode,
        status: 'pending',
      },
    });

    logger.info('[Referral] Referral created', {
      referrerId: referrer.id,
      referredId: referredUserId,
      code: referralCode,
    });
  }

  /**
   * Convert a referral when the referred user subscribes to Pro.
   * Grants Stripe credit to referrer if under annual cap.
   */
  async convertReferral(referredUserId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId,
        status: 'pending',
      },
    });

    if (!referral) {
      return; // User was not referred
    }

    const referrer = await this.prisma.user.findUnique({
      where: { id: referral.referrerUserId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!referrer) {
      logger.warn('[Referral] Referrer not found', { referralId: referral.id });
      return;
    }

    // Check annual reward cap
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const rewardsThisYear = await this.prisma.referral.count({
      where: {
        referrerUserId: referrer.id,
        rewardGranted: true,
        convertedAt: { gte: yearStart },
      },
    });

    const canReward = rewardsThisYear < ANNUAL_REWARD_CAP && !!referrer.stripeCustomerId;

    if (canReward) {
      try {
        await this.stripe.customers.createBalanceTransaction(referrer.stripeCustomerId!, {
          amount: -MONTHLY_PRO_PRICE_CENTS,
          currency: 'pln',
          description: `Referral reward: user subscribed via code ${referral.referralCode}`,
        });
        logger.info('[Referral] Stripe credit granted to referrer', {
          referrerId: referrer.id,
          amount: MONTHLY_PRO_PRICE_CENTS,
        });
      } catch (error) {
        logger.error('[Referral] Failed to grant Stripe credit', { error, referralId: referral.id });
        // Still mark as converted, but don't set rewardGranted
        await this.prisma.referral.update({
          where: { id: referral.id },
          data: { status: 'converted', convertedAt: new Date() },
        });
        return;
      }
    }

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'converted',
        rewardGranted: canReward,
        convertedAt: new Date(),
      },
    });

    logger.info('[Referral] Referral converted', {
      referralId: referral.id,
      rewardGranted: canReward,
    });
  }

  /**
   * Revoke a referral if referred user cancels within 7 days.
   * Reverses Stripe credit if reward was granted.
   */
  async checkRevocation(referredUserId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId,
        status: 'converted',
      },
    });

    if (!referral || !referral.convertedAt) {
      return;
    }

    const elapsed = Date.now() - referral.convertedAt.getTime();
    if (elapsed > REVOCATION_WINDOW_MS) {
      return; // Past revocation window
    }

    if (referral.rewardGranted) {
      const referrer = await this.prisma.user.findUnique({
        where: { id: referral.referrerUserId },
        select: { stripeCustomerId: true },
      });

      if (referrer?.stripeCustomerId) {
        try {
          await this.stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
            amount: MONTHLY_PRO_PRICE_CENTS, // positive = debit (reverse credit)
            currency: 'pln',
            description: `Referral reward reversed: referred user canceled within 7 days`,
          });
          logger.info('[Referral] Stripe credit reversed', { referralId: referral.id });
        } catch (error) {
          logger.error('[Referral] Failed to reverse Stripe credit', { error });
        }
      }
    }

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'revoked' },
    });

    logger.info('[Referral] Referral revoked', { referralId: referral.id });
  }

  /**
   * Get user's referral info: code, share link, stats.
   */
  async getReferralInfo(userId: string): Promise<{
    referralCode: string;
    shareLink: string;
    stats: { totalReferred: number; converted: number; pending: number; totalRewardsEarned: number };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      throw new Error('User has no referral code');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const [totalReferred, converted, pending, totalRewardsEarned] = await Promise.all([
      this.prisma.referral.count({ where: { referrerUserId: userId } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, status: 'converted' } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, status: 'pending' } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, rewardGranted: true } }),
    ]);

    return {
      referralCode: user.referralCode,
      shareLink: `${frontendUrl}/register?ref=${user.referralCode}`,
      stats: {
        totalReferred,
        converted,
        pending,
        totalRewardsEarned,
      },
    };
  }

  /**
   * Get detailed list of referrals for a user.
   */
  async getReferralStats(userId: string): Promise<{
    referrals: Array<{
      id: string;
      referredUserName: string;
      status: ReferralStatus;
      createdAt: Date;
      convertedAt: Date | null;
    }>;
  }> {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerUserId: userId },
      include: {
        referred: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserName: r.referred
          ? `${r.referred.firstName || ''} ${(r.referred.lastName || '').charAt(0)}.`.trim()
          : 'Unknown',
        status: r.status,
        createdAt: r.createdAt,
        convertedAt: r.convertedAt,
      })),
    };
  }

  /**
   * Generate a unique 8-char hex referral code.
   */
  async generateReferralCode(): Promise<string> {
    const crypto = await import('crypto');
    let code: string;
    let attempts = 0;

    do {
      code = crypto.randomBytes(4).toString('hex');
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!existing) return code;
      attempts++;
    } while (attempts < 10);

    throw new Error('Failed to generate unique referral code after 10 attempts');
  }
}
```

- [ ] **Step 4: Create singleton instance**

Create `packages/api/src/services/referral.instance.ts`:

```typescript
import { prisma } from '../lib/prisma';
import { getStripe } from '../config/stripe.config';
import { ReferralService } from './referral.service';

export const referralService = new ReferralService(prisma, getStripe());
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/api && npx jest src/__tests__/referral.service.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/referral.service.ts packages/api/src/services/referral.instance.ts packages/api/src/__tests__/referral.service.test.ts
git commit -m "feat(api): add ReferralService with tests (AIA-79)"
```

---

## Task 4: Referral Controller + Routes

**Files:**
- Create: `packages/api/src/controllers/referral.controller.ts`
- Create: `packages/api/src/routes/referral.routes.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Create referral controller**

Create `packages/api/src/controllers/referral.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { referralService } from '../services/referral.instance';
import { logger } from '../utils/logger';

export class ReferralController {
  async getReferralInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const info = await referralService.getReferralInfo(userId);
      res.status(200).json({ success: true, data: info });
    } catch (error) {
      logger.error('Error fetching referral info', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Failed to fetch referral info' });
    }
  }

  async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const stats = await referralService.getReferralStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error fetching referral stats', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Failed to fetch referral stats' });
    }
  }

  async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      const result = await referralService.validateCode(code);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Error validating referral code', { error });
      res.status(500).json({ success: false, error: 'Failed to validate code' });
    }
  }
}

export const referralController = new ReferralController();
```

- [ ] **Step 2: Create referral routes**

Create `packages/api/src/routes/referral.routes.ts`:

```typescript
import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { validateCodeSchema } from '../validators/referral.validators';

const router = Router();

// PUBLIC
router.post(
  '/validate',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  validateRequest(validateCodeSchema),
  referralController.validateCode.bind(referralController)
);

// AUTHENTICATED
router.get('/', authenticate, referralController.getReferralInfo.bind(referralController));
router.get('/stats', authenticate, referralController.getReferralStats.bind(referralController));

export default router;
```

- [ ] **Step 3: Register routes in index.ts**

In `packages/api/src/index.ts`, add import at the top with other route imports:

```typescript
import referralRoutes from './routes/referral.routes';
```

Add route registration after the last `app.use` (~line 120):

```typescript
// Referral
app.use('/api/referral', referralRoutes);
```

- [ ] **Step 4: Verify build compiles**

```bash
cd packages/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/controllers/referral.controller.ts packages/api/src/routes/referral.routes.ts packages/api/src/index.ts
git commit -m "feat(api): add referral controller and routes (AIA-79)"
```

---

## Task 5: Integrate with Auth Registration Flow

**Files:**
- Modify: `packages/api/src/services/auth.service.ts` (~lines 129-224)

- [ ] **Step 1: Import referralService**

At top of `auth.service.ts`, add:

```typescript
import { referralService } from './referral.instance';
```

- [ ] **Step 2: Generate referralCode during user creation**

In the `register()` method, before the `prisma.user.create` call (~line 143), add:

```typescript
    // Generate unique referral code
    const referralCode = await referralService.generateReferralCode();
```

Then in the `prisma.user.create` data object (~line 148), add:

```typescript
        referralCode,
        referredByCode: validated.referredByCode || undefined,
```

- [ ] **Step 3: Create referral record after user creation**

After the user is created (~line 158), add:

```typescript
    // Create referral record if user was referred
    if (validated.referredByCode) {
      try {
        await referralService.createReferral(user.id, validated.referredByCode);
      } catch (error) {
        logger.warn('[Auth] Failed to create referral record', {
          userId: user.id,
          referredByCode: validated.referredByCode,
          error: error instanceof Error ? error.message : error,
        });
        // Non-blocking: registration still succeeds
      }
    }
```

- [ ] **Step 4: Verify build compiles**

```bash
cd packages/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/auth.service.ts
git commit -m "feat(api): integrate referral code generation into auth registration (AIA-79)"
```

---

## Task 6: Integrate with Subscription Webhooks

**Files:**
- Modify: `packages/api/src/services/subscription.service.ts`

- [ ] **Step 1: Import referralService**

At top of `subscription.service.ts`:

```typescript
import { referralService } from './referral.instance';
```

- [ ] **Step 2: Add referral conversion to checkout.session.completed handler**

In the `handleCheckoutCompleted()` method (~line 249-267), after the subscription is synced, add:

```typescript
    // Trigger referral conversion if applicable
    if (user) {
      try {
        await referralService.convertReferral(user.id);
      } catch (error) {
        logger.warn('[Subscription] Referral conversion failed', { userId: user.id, error });
      }
    }
```

- [ ] **Step 3: Add revocation check to subscription deleted handler**

In the `handleSubscriptionDeleted()` method (~line 288-319), after the user is reverted to free plan, add:

```typescript
    // Check if this cancellation should revoke a referral reward
    try {
      await referralService.checkRevocation(user.id);
    } catch (error) {
      logger.warn('[Subscription] Referral revocation check failed', { userId: user.id, error });
    }
```

- [ ] **Step 4: Run existing tests to ensure no regression**

```bash
cd packages/api && npx jest --no-coverage
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/subscription.service.ts
git commit -m "feat(api): integrate referral conversion into Stripe webhook handlers (AIA-79)"
```

---

## Task 7: Apply Stripe Coupon for Referred Users at Checkout

**Files:**
- Modify: `packages/api/src/services/subscription.service.ts` (~line 136, `createCheckoutSession`)

- [ ] **Step 1: Add referral discount to checkout session**

In `subscription.service.ts`, in the `createCheckoutSession()` method, before the `stripe.checkout.sessions.create()` call, look up if the user has a `referredByCode`:

```typescript
    // Check if user was referred — apply first-month discount
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredByCode: true },
    });

    const discounts = user?.referredByCode
      ? [{ coupon: 'first_month_referral' }]
      : undefined;
```

Then add `discounts` to the `stripe.checkout.sessions.create()` params:

```typescript
    const session = await this.stripe.checkout.sessions.create({
      // ... existing params ...
      discounts,
    });
```

Note: The Stripe coupon `first_month_referral` (20% off, once) must be created manually in Stripe Dashboard or via a seed script before this works.

- [ ] **Step 2: Verify build**

```bash
cd packages/api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/subscription.service.ts
git commit -m "feat(api): apply referral discount coupon at checkout for referred users (AIA-79)"
```

---

## Task 8: Frontend — API Client + Hook

**Files:**
- Create: `packages/web/src/lib/api/referral.ts`
- Create: `packages/web/src/hooks/useReferral.ts`
- Modify: `packages/web/src/lib/api/auth.ts`

- [ ] **Step 1: Create referral API client**

Create `packages/web/src/lib/api/referral.ts`:

```typescript
import { apiClient } from './api-client';

export interface ReferralInfo {
  referralCode: string;
  shareLink: string;
  stats: {
    totalReferred: number;
    converted: number;
    pending: number;
    totalRewardsEarned: number;
  };
}

export interface ReferralDetail {
  id: string;
  referredUserName: string;
  status: 'pending' | 'converted' | 'revoked';
  createdAt: string;
  convertedAt: string | null;
}

export interface ReferralStats {
  referrals: ReferralDetail[];
}

export interface ValidateCodeResult {
  valid: boolean;
  referrerFirstName?: string;
}

export async function getReferralInfo(): Promise<ReferralInfo> {
  const response = await apiClient.get('/api/referral');
  return response.data.data;
}

export async function getReferralStats(): Promise<ReferralStats> {
  const response = await apiClient.get('/api/referral/stats');
  return response.data.data;
}

export async function validateReferralCode(code: string): Promise<ValidateCodeResult> {
  const response = await apiClient.post('/api/referral/validate', { code });
  return response.data.data;
}
```

- [ ] **Step 2: Create useReferral hook**

Create `packages/web/src/hooks/useReferral.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getReferralInfo, getReferralStats, type ReferralInfo, type ReferralStats } from '@/lib/api/referral';

export function useReferral() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [infoData, statsData] = await Promise.all([getReferralInfo(), getReferralStats()]);
      setInfo(infoData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { info, stats, isLoading, error, refresh: fetchData };
}
```

- [ ] **Step 3: Add referredByCode to RegisterData**

In `packages/web/src/lib/api/auth.ts`, add to `RegisterData` interface (~line 28):

```typescript
  referredByCode?: string;
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/api/referral.ts packages/web/src/hooks/useReferral.ts packages/web/src/lib/api/auth.ts
git commit -m "feat(web): add referral API client and useReferral hook (AIA-79)"
```

---

## Task 9: Frontend — i18n Keys

**Files:**
- Modify: `packages/web/src/i18n/locales/en.json`
- Modify: `packages/web/src/i18n/locales/pl.json`
- Modify: `packages/web/src/i18n/locales/ru.json`

- [ ] **Step 1: Add English referral keys**

Add to `en.json` at root level:

```json
  "referral": {
    "title": "Referral Program",
    "description": "Invite friends and earn free Pro months",
    "yourCode": "Your referral code",
    "shareLink": "Share link",
    "copyLink": "Copy link",
    "copied": "Copied!",
    "stats": {
      "totalReferred": "Total referred",
      "converted": "Subscribed to Pro",
      "pending": "Pending",
      "rewardsEarned": "Free months earned"
    },
    "table": {
      "name": "Name",
      "status": "Status",
      "date": "Date",
      "convertedAt": "Subscribed"
    },
    "invitedBy": "Invited by {name}",
    "reward": {
      "banner": "Invite friends, get 1 month free Pro!",
      "referrerReward": "You get: 1 month free Pro",
      "referredReward": "They get: 20% off first month"
    },
    "noReferrals": "No referrals yet. Share your link to get started!",
    "status": {
      "pending": "Pending",
      "converted": "Subscribed",
      "revoked": "Revoked"
    }
  }
```

- [ ] **Step 2: Add Polish referral keys**

Add to `pl.json`:

```json
  "referral": {
    "title": "Program poleceń",
    "description": "Zaproś znajomych i zdobądź darmowe miesiące Pro",
    "yourCode": "Twój kod polecenia",
    "shareLink": "Link do udostępnienia",
    "copyLink": "Kopiuj link",
    "copied": "Skopiowano!",
    "stats": {
      "totalReferred": "Zaproszonych",
      "converted": "Subskrybuje Pro",
      "pending": "Oczekujące",
      "rewardsEarned": "Darmowe miesiące"
    },
    "table": {
      "name": "Imię",
      "status": "Status",
      "date": "Data",
      "convertedAt": "Subskrypcja"
    },
    "invitedBy": "Zaproszony przez {name}",
    "reward": {
      "banner": "Zaproś znajomych, zdobądź 1 miesiąc Pro gratis!",
      "referrerReward": "Ty otrzymujesz: 1 miesiąc Pro gratis",
      "referredReward": "Znajomy otrzymuje: 20% zniżki na pierwszy miesiąc"
    },
    "noReferrals": "Brak poleceń. Udostępnij swój link, aby zacząć!",
    "status": {
      "pending": "Oczekujące",
      "converted": "Subskrybuje",
      "revoked": "Anulowane"
    }
  }
```

- [ ] **Step 3: Add Russian referral keys**

Add to `ru.json`:

```json
  "referral": {
    "title": "Реферальная программа",
    "description": "Приглашайте друзей и получайте бесплатные месяцы Pro",
    "yourCode": "Ваш реферальный код",
    "shareLink": "Ссылка для приглашения",
    "copyLink": "Копировать ссылку",
    "copied": "Скопировано!",
    "stats": {
      "totalReferred": "Приглашено",
      "converted": "Подписались на Pro",
      "pending": "Ожидают",
      "rewardsEarned": "Бесплатных месяцев"
    },
    "table": {
      "name": "Имя",
      "status": "Статус",
      "date": "Дата",
      "convertedAt": "Подписка"
    },
    "invitedBy": "Приглашён пользователем {name}",
    "reward": {
      "banner": "Пригласите друзей — получите 1 месяц Pro бесплатно!",
      "referrerReward": "Вы получите: 1 месяц Pro бесплатно",
      "referredReward": "Друг получит: скидку 20% на первый месяц"
    },
    "noReferrals": "Пока нет рефералов. Поделитесь ссылкой, чтобы начать!",
    "status": {
      "pending": "Ожидает",
      "converted": "Подписан",
      "revoked": "Отменён"
    }
  }
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/i18n/locales/
git commit -m "feat(web): add referral i18n keys for en, pl, ru (AIA-79)"
```

---

## Task 10: Frontend — Referral Dashboard Page

**Files:**
- Create: `packages/web/src/app/referral/page.tsx`
- Create: `packages/web/src/components/referral/ReferralDashboard.tsx`

- [ ] **Step 1: Create ReferralDashboard component**

Create `packages/web/src/components/referral/ReferralDashboard.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import { Copy, Check, Users, Trophy, Clock, Gift } from 'lucide-react';
import { useReferral } from '@/hooks/useReferral';
import { useLocale } from '@/contexts/LocaleContext';

export function ReferralDashboard() {
  const { info, stats, isLoading, error } = useReferral();
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (info?.shareLink) {
      await navigator.clipboard.writeText(info.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">{error}</div>
    );
  }

  if (!info) return null;

  const statCards = [
    { label: t('referral.stats.totalReferred'), value: info.stats.totalReferred, icon: Users, color: 'text-blue-500' },
    { label: t('referral.stats.converted'), value: info.stats.converted, icon: Trophy, color: 'text-green-500' },
    { label: t('referral.stats.pending'), value: info.stats.pending, icon: Clock, color: 'text-yellow-500' },
    { label: t('referral.stats.rewardsEarned'), value: info.stats.totalRewardsEarned, icon: Gift, color: 'text-purple-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">{t('referral.title')}</h1>
        <p className="mt-1 text-blue-100">{t('referral.description')}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-white/10 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-200">{t('referral.yourCode')}</p>
            <p className="text-lg font-mono font-bold">{info.referralCode}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 flex items-center gap-2">
            <div className="flex-1 truncate">
              <p className="text-xs text-blue-200">{t('referral.shareLink')}</p>
              <p className="text-sm font-mono truncate">{info.shareLink}</p>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-200">{t('referral.reward.referrerReward')}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-200">{t('referral.reward.referredReward')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Referrals Table */}
      {stats && stats.referrals.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('referral.table.name')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('referral.table.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('referral.table.date')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-4 py-3 text-sm dark:text-white">{referral.referredUserName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        referral.status === 'converted'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : referral.status === 'revoked'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {t(`referral.status.${referral.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('referral.noReferrals')}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create referral page**

Create `packages/web/src/app/referral/page.tsx`:

```typescript
'use client';

import React from 'react';
import { ReferralDashboard } from '@/components/referral/ReferralDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ReferralPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <ReferralDashboard />
      </div>
    </ProtectedRoute>
  );
}
```

- [ ] **Step 3: Verify frontend build**

```bash
cd packages/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/referral/ packages/web/src/components/referral/
git commit -m "feat(web): add referral dashboard page and component (AIA-79)"
```

---

## Task 11: Frontend — Registration Form Integration

**Files:**
- Modify: `packages/web/src/components/auth/RegistrationForm.tsx`
- Modify: `packages/web/src/lib/validations/auth.ts`

- [ ] **Step 1: Add referredByCode to frontend validation schema**

In `packages/web/src/lib/validations/auth.ts`, add to the schema object (before `.refine()`):

```typescript
    referredByCode: z.string().length(8).optional(),
```

- [ ] **Step 2: Modify RegistrationForm to handle ?ref= param**

In `packages/web/src/components/auth/RegistrationForm.tsx`:

Add imports (ensure `useEffect` is in the existing React import if not already there):
```typescript
import { useSearchParams } from 'next/navigation';
import { validateReferralCode } from '@/lib/api/referral';
import { Gift } from 'lucide-react';
```

Inside the component, add after existing `useState` declarations:

```typescript
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Validate referral code on mount
  useEffect(() => {
    if (refCode && refCode.length === 8) {
      validateReferralCode(refCode)
        .then((result) => {
          if (result.valid) {
            setReferrerName(result.referrerFirstName || null);
            setValue('referredByCode', refCode);
          }
        })
        .catch(() => {/* ignore invalid codes */});
    }
  }, [refCode, setValue]);
```

Add before the submit button, a referral badge:

```typescript
  {referrerName && (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <Gift className="w-4 h-4 text-blue-500" />
      <span className="text-sm text-blue-700 dark:text-blue-300">
        {t('referral.invitedBy', { name: referrerName })}
      </span>
    </div>
  )}
```

Add `Gift` to lucide-react imports.

In the form submit handler, ensure `referredByCode` is included in the payload sent to the API.

- [ ] **Step 3: Verify build**

```bash
cd packages/web && npx next build
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/auth/RegistrationForm.tsx packages/web/src/lib/validations/auth.ts
git commit -m "feat(web): integrate referral code into registration form (AIA-79)"
```

---

## Task 12: Frontend — Nav Link + Subscription Banner

**Files:**
- Modify: Navigation component (find via existing nav links)
- Modify: `packages/web/src/app/subscription/page.tsx`

- [ ] **Step 1: Add "Referral" link to navigation**

Find the main navigation component (likely in `packages/web/src/components/chat/ChatHeader.tsx` or sidebar). Add a referral link with the `Gift` lucide icon:

```typescript
import { Gift } from 'lucide-react';

// Add alongside other nav links:
<Link href="/referral" className="...existing nav link classes...">
  <Gift className="w-4 h-4" />
  <span>{t('referral.title')}</span>
</Link>
```

- [ ] **Step 2: Add referral banner to subscription page**

In `packages/web/src/app/subscription/page.tsx` (or `SubscriptionManagement.tsx`), add a banner:

```typescript
import Link from 'next/link';
import { Gift } from 'lucide-react';

// Add after the main subscription content:
<Link
  href="/referral"
  className="block mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
>
  <div className="flex items-center gap-3">
    <Gift className="w-6 h-6 text-blue-500" />
    <div>
      <p className="font-medium text-blue-700 dark:text-blue-300">{t('referral.reward.banner')}</p>
      <p className="text-sm text-blue-500 dark:text-blue-400">{t('referral.reward.referrerReward')}</p>
    </div>
  </div>
</Link>
```

- [ ] **Step 3: Verify build**

```bash
cd packages/web && npx next build
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add referral nav link and subscription page banner (AIA-79)"
```

---

## Task 13: Final Integration + Verification

**Files:** All previously created/modified files

- [ ] **Step 1: Run all backend tests**

```bash
cd packages/api && npm run test
```

Expected: All tests pass.

- [ ] **Step 2: Run frontend build**

```bash
cd packages/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Run full monorepo build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Run linting**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: referral program final integration (AIA-79)"
```
