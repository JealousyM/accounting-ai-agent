// IMPORTANT: mock langsmith.instance BEFORE importing admin.service
jest.mock('../langsmith.instance', () => ({
  langsmithService: {
    getDashboardData: jest.fn().mockResolvedValue({
      userSummary: {
        totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
        runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
      },
    }),
    getAllUserStats: jest.fn().mockResolvedValue(new Map()),
    getAdminTotals: jest.fn().mockResolvedValue({
      totalCost: 0, totalTokens: 0, totalConversations: 0,
      ttsCost: 0, ttsCharacters: 0, ttsCalls: 0,
    }),
  },
}));

import { AdminService } from '../admin.service';
import { PrismaClient } from '@prisma/client';
import { langsmithService } from '../langsmith.instance';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  aIConversation: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
  aIToolUsage: { count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  aIMemory: { count: jest.fn(), groupBy: jest.fn() },
  telegramLink: { findUnique: jest.fn() },
  $queryRaw: jest.fn().mockResolvedValue([]),
} as unknown as PrismaClient;

const mockAuditLogService = { create: jest.fn().mockResolvedValue(undefined) };

const ACTOR_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_ID = '00000000-0000-0000-0000-000000000002';

beforeEach(() => jest.clearAllMocks());

describe('AdminService.softDeleteUser', () => {
  it('sets deletedAt on the user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID,
      email: 't@x',
      deletedAt: null,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ACTOR_ID,
        action: 'admin.user.softDelete',
        entity: 'User',
        entityId: TARGET_ID,
      })
    );
  });

  it('rejects self-delete', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });

  it('rejects already-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID,
      email: 't@x',
      deletedAt: new Date(),
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).rejects.toThrow(/soft-deleted/);
  });

  it('throws 404-style error if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).rejects.toThrow(/not found/);
  });
});

describe('AdminService.hardDeleteUser', () => {
  it('deletes a soft-deleted user and audits with snapshot', async () => {
    const userRow = {
      id: TARGET_ID, email: 't@x', firstName: 'T', lastName: 'X',
      role: 'user', subscriptionPlan: 'free', deletedAt: new Date('2026-01-01'),
      createdAt: new Date('2025-01-01'),
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userRow);
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue(userRow);

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID });

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: TARGET_ID } });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.hardDelete',
        entity: 'User',
        entityId: TARGET_ID,
        changes: { before: expect.objectContaining({ id: TARGET_ID, email: 't@x' }), after: null },
      })
    );
  });

  it('works on non-soft-deleted users too', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, email: 't@x', deletedAt: null, createdAt: new Date(),
    });
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue({});
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).resolves.not.toThrow();
  });

  it('rejects self-delete', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });

  it('throws 404 if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).rejects.toThrow(/not found/);
  });
});

describe('AdminService.updateSubscriptionPlan', () => {
  it('updates only subscriptionPlan and audits', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, subscriptionPlan: 'free',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, subscriptionPlan: 'pro',
    });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const result = await svc.updateSubscriptionPlan({
      actorId: ACTOR_ID, targetUserId: TARGET_ID, plan: 'pro',
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { subscriptionPlan: 'pro' },
      select: { id: true, subscriptionPlan: true },
    });
    expect(result).toEqual({ id: TARGET_ID, subscriptionPlan: 'pro' });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.updateSubscription',
        changes: { before: { subscriptionPlan: 'free' }, after: { subscriptionPlan: 'pro' } },
      })
    );
  });

  it('rejects soft-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: new Date(), subscriptionPlan: 'free',
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateSubscriptionPlan({ actorId: ACTOR_ID, targetUserId: TARGET_ID, plan: 'pro' })
    ).rejects.toThrow(/soft-deleted/);
  });

  it('throws 404 if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateSubscriptionPlan({ actorId: ACTOR_ID, targetUserId: TARGET_ID, plan: 'pro' })
    ).rejects.toThrow(/not found/);
  });
});

describe('AdminService.updateUserLimits', () => {
  it('updates only provided fields and audits', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, aiMessagesLimit: 500, wfirmaRequestsLimit: 30,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesLimit: 1000, wfirmaRequestsLimit: 30,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);

    const result = await svc.updateUserLimits({
      actorId: ACTOR_ID, targetUserId: TARGET_ID, aiMessagesLimit: 1000,
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { aiMessagesLimit: 1000 },
      select: { id: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
    });
    expect(result.aiMessagesLimit).toBe(1000);
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.updateLimits',
      })
    );
  });

  it('updates both fields when both provided', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, aiMessagesLimit: 500, wfirmaRequestsLimit: 30,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesLimit: 2000, wfirmaRequestsLimit: 100,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.updateUserLimits({
      actorId: ACTOR_ID, targetUserId: TARGET_ID, aiMessagesLimit: 2000, wfirmaRequestsLimit: 100,
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { aiMessagesLimit: 2000, wfirmaRequestsLimit: 100 },
    }));
  });

  it('rejects soft-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: new Date(), aiMessagesLimit: 500, wfirmaRequestsLimit: 30,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateUserLimits({ actorId: ACTOR_ID, targetUserId: TARGET_ID, aiMessagesLimit: 100 })
    ).rejects.toThrow(/soft-deleted/);
  });

  it('throws 404 if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateUserLimits({ actorId: ACTOR_ID, targetUserId: TARGET_ID, aiMessagesLimit: 100 })
    ).rejects.toThrow(/not found/);
  });
});

describe('AdminService.resetUsageCounter', () => {
  beforeEach(() => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, aiMessagesUsed: 42, wfirmaRequestsUsed: 7,
    });
  });

  it('resets ai only', async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 0, wfirmaRequestsUsed: 7,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'ai' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aiMessagesUsed: 0 } })
    );
  });

  it('resets wfirma only', async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 42, wfirmaRequestsUsed: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'wfirma' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { wfirmaRequestsUsed: 0 } })
    );
  });

  it('resets both', async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 0, wfirmaRequestsUsed: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'both' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aiMessagesUsed: 0, wfirmaRequestsUsed: 0 } })
    );
  });

  it('rejects soft-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: new Date(), aiMessagesUsed: 5, wfirmaRequestsUsed: 5,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'ai' })
    ).rejects.toThrow(/soft-deleted/);
  });
});

describe('AdminService.getUserDetail (privacy)', () => {
  it('does not include conversations array or costData', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, email: 't@x', firstName: null, lastName: null,
      role: 'user', locale: 'en', createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      subscriptionPlan: 'free', subscriptionStatus: 'active', subscriptionEndDate: null,
      aiMessagesLimit: 500, aiMessagesUsed: 0,
      wfirmaRequestsLimit: 30, wfirmaRequestsUsed: 0,
      ttsCharactersUsed: 0, ttsCostUsd: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const result = await svc.getUserDetail(TARGET_ID);
    expect(result?.conversations).toBeUndefined();
    expect(result?.costData).toBeUndefined();
    expect(result?.user.subscriptionPlan).toBe('free');
    expect(result?.user.aiMessagesLimit).toBe(500);
  });

  it('returns null when user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const result = await svc.getUserDetail(TARGET_ID);
    expect(result).toBeNull();
  });
});

describe('AdminService.updateUserRole self-guard', () => {
  it('throws when actorId === targetId', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateUserRole(ACTOR_ID, 'user', { actorId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });

  it('updates role, writes audit log, and rejects missing user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, role: 'user',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.updateUserRole(TARGET_ID, 'admin', { actorId: ACTOR_ID });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { role: 'admin' },
    });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ACTOR_ID,
        action: 'admin.user.updateRole',
        entity: 'User',
        entityId: TARGET_ID,
        changes: { before: { role: 'user' }, after: { role: 'admin' } },
      })
    );
  });

  it('throws 404 if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateUserRole(TARGET_ID, 'admin', { actorId: ACTOR_ID })
    ).rejects.toThrow(/not found/);
  });
});

describe('AdminService.getUserDeepStats', () => {
  beforeEach(() => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, ttsCharactersUsed: 1234, ttsCostUsd: 0.12,
    });
    (mockPrisma.aIConversation.count as jest.Mock).mockResolvedValue(5);
    (mockPrisma.aIConversation.aggregate as jest.Mock).mockResolvedValue({ _max: { updatedAt: new Date('2026-04-01T00:00:00Z') } });
    (mockPrisma.aIToolUsage.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.aIToolUsage.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIToolUsage.findFirst as jest.Mock).mockResolvedValue({ createdAt: new Date('2026-04-02T00:00:00Z') });
    (mockPrisma.aIMemory.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.aIMemory.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);
  });

  it('returns full stats shape', async () => {
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({
      userSummary: {
        totalCost: 12.34, totalTokens: 5000,
        promptTokens: 3000, completionTokens: 2000,
        runCount: 50, conversationCount: 4, avgCostPerConversation: 3.085,
      },
    });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const stats = await svc.getUserDeepStats(TARGET_ID, 'month');

    expect(stats.range).toBe('month');
    expect(stats.cost).toEqual({
      totalUsd: 12.34, totalTokens: 5000,
      promptTokens: 3000, completionTokens: 2000,
      runCount: 50, langsmithConversationCount: 4,
      avgCostPerLangsmithConversation: 3.085,
    });
    expect(stats.conversations.totalInRange).toBe(5);
    expect(stats.tts).toEqual({ charactersUsed: 1234, costUsd: 0.12 });
    expect(stats.channels.web.active).toBe(true);
    expect(stats.channels.telegram.active).toBe(false);
    expect(stats.lastActivity.lastConversationAt).toBe(new Date('2026-04-01T00:00:00Z').toISOString());
    expect(stats.lastActivity.lastToolCallAt).toBe(new Date('2026-04-02T00:00:00Z').toISOString());
  });

  it('aggregates tool usage by category', async () => {
    (mockPrisma.aIToolUsage.groupBy as jest.Mock).mockResolvedValue([
      { toolName: 'wfirma_list_invoices', _count: { _all: 10 } },
      { toolName: 'ksef_send_invoice', _count: { _all: 3 } },
      { toolName: 'random_tool', _count: { _all: 2 } },
    ]);
    (mockPrisma.aIToolUsage.count as jest.Mock).mockResolvedValue(15);
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({
      userSummary: {
        totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
        runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
      },
    });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const stats = await svc.getUserDeepStats(TARGET_ID, 'week');

    expect(stats.toolUsage.totalCalls).toBe(15);
    expect(stats.toolUsage.topTools[0]).toEqual({ toolName: 'wfirma_list_invoices', count: 10 });
    const cats = Object.fromEntries(stats.toolUsage.byCategory.map((c) => [c.category, c.count]));
    expect(cats).toMatchObject({ wfirma: 10, ksef: 3, other: 2 });
  });

  it('merges activityByDay from $queryRaw conv + tool day buckets', async () => {
    (mockPrisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ day: new Date('2026-04-01T00:00:00Z'), cnt: 2n }])  // convs
      .mockResolvedValueOnce([                                                       // tools
        { day: new Date('2026-04-01T00:00:00Z'), cnt: 5n },
        { day: new Date('2026-04-02T00:00:00Z'), cnt: 1n },
      ]);
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({
      userSummary: {
        totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
        runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
      },
    });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const stats = await svc.getUserDeepStats(TARGET_ID, 'week');

    expect(stats.activityByDay).toEqual([
      { date: '2026-04-01', toolCalls: 5, conversations: 2 },
      { date: '2026-04-02', toolCalls: 1, conversations: 0 },
    ]);
  });

  it('throws 404 if user missing', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({
      userSummary: {
        totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
        runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
      },
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(svc.getUserDeepStats(TARGET_ID, 'month')).rejects.toThrow(/not found/);
  });
});
