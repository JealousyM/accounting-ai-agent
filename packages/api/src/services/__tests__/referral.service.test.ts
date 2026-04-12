import { ReferralService } from '../referral.service';

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
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
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
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
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
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);

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
