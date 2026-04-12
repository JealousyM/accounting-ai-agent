import { PrismaClient, ReferralStatus } from '@prisma/client';
import { getStripeClient } from '../config/stripe.config';
import { logger } from '../utils/logger';

const ANNUAL_REWARD_CAP = 10;
const MONTHLY_PRO_PRICE_CENTS = 1499;
const REVOCATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export class ReferralService {
  constructor(private prisma: PrismaClient) {}

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

  async convertReferral(referredUserId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId,
        status: 'pending',
      },
    });

    if (!referral) {
      return;
    }

    const referrer = await this.prisma.user.findUnique({
      where: { id: referral.referrerUserId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!referrer) {
      logger.warn('[Referral] Referrer not found', { referralId: referral.id });
      return;
    }

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
        await getStripeClient().customers.createBalanceTransaction(referrer.stripeCustomerId!, {
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
      return;
    }

    if (referral.rewardGranted) {
      const referrer = await this.prisma.user.findUnique({
        where: { id: referral.referrerUserId },
        select: { stripeCustomerId: true },
      });

      if (referrer?.stripeCustomerId) {
        try {
          await getStripeClient().customers.createBalanceTransaction(referrer.stripeCustomerId, {
            amount: MONTHLY_PRO_PRICE_CENTS,
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
