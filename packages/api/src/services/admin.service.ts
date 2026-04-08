import { PrismaClient, UserRole } from '@prisma/client';
import { langsmithService } from './langsmith.instance';
import { logger } from '../utils/logger';
import { AuditLogService } from './audit-log.service';
import { assertNotSelf, assertNotSoftDeleted, categorizeToolName, ToolCategory } from './admin.helpers';
import type { UserDeepStats, StatsRange } from '../types/admin.types';

function startOfRange(range: 'week' | 'month' | 'year'): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

export interface UserWithCosts {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  costs: {
    totalCost: number;
    totalTokens: number;
    conversationCount: number;
    runCount: number;
    ttsCost: number;
    ttsCharacters: number;
    ttsCalls: number;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalCost: number;
  totalTokens: number;
  totalConversations: number;
  ttsCost: number;
  ttsCharacters: number;
  ttsCalls: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
}

export class AdminService {
  constructor(private prisma: PrismaClient, private auditLog: AuditLogService) {}

  /**
   * Get all users with pagination and their costs
   * Uses single API call to fetch all runs, then maps to users
   */
  async getUsers(params: GetUsersParams): Promise<{ users: UserWithCosts[]; total: number }> {
    const { page = 1, limit = 20, search, role } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    // Fetch users and all costs in parallel (single API call for costs)
    const [users, total, allUserStats] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
      langsmithService.getAllUserStats('year'),
    ]);

    // Map costs to users
    const usersWithCosts: UserWithCosts[] = users.map((user) => {
      const stats = allUserStats.get(user.id);
      return {
        ...user,
        costs: stats
          ? {
              totalCost: stats.totalCost,
              totalTokens: stats.totalTokens,
              conversationCount: stats.conversationCount,
              runCount: stats.runCount,
              ttsCost: stats.ttsCost,
              ttsCharacters: stats.ttsCharacters,
              ttsCalls: stats.ttsCalls,
            }
          : {
              totalCost: 0,
              totalTokens: 0,
              conversationCount: 0,
              runCount: 0,
              ttsCost: 0,
              ttsCharacters: 0,
              ttsCalls: 0,
            },
      };
    });

    return { users: usersWithCosts, total };
  }

  /**
   * Get admin dashboard statistics
   * Uses single API call to fetch all runs and aggregate totals
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    // Fetch user counts and cost totals in parallel (single API call for costs)
    const [totalUsers, totalAdmins, costTotals] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: 'admin', deletedAt: null } }),
      langsmithService.getAdminTotals('year'),
    ]);

    logger.info('Admin dashboard: stats fetched', {
      totalUsers,
      totalAdmins,
      ...costTotals,
    });

    return {
      totalUsers,
      totalAdmins,
      totalCost: costTotals.totalCost,
      totalTokens: costTotals.totalTokens,
      totalConversations: costTotals.totalConversations,
      ttsCost: costTotals.ttsCost,
      ttsCharacters: costTotals.ttsCharacters,
      ttsCalls: costTotals.ttsCalls,
    };
  }

  /**
   * Get detailed user info including subscription, limits, and usage fields.
   * Conversations and cost data are intentionally omitted for privacy.
   */
  async getUserDetail(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, locale: true, createdAt: true, updatedAt: true, deletedAt: true,
        subscriptionPlan: true, subscriptionStatus: true, subscriptionEndDate: true,
        aiMessagesLimit: true, aiMessagesUsed: true,
        wfirmaRequestsLimit: true, wfirmaRequestsUsed: true,
        ttsCharactersUsed: true, ttsCostUsd: true,
      },
    });
    if (!user) return null;
    return { user };
  }

  /**
   * Update user role
   * Guard: actor cannot change their own role.
   */
  async updateUserRole(userId: string, role: UserRole, opts: { actorId: string }): Promise<void> {
    assertNotSelf(opts.actorId, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.auditLog.create({
      userId: opts.actorId,
      action: 'admin.user.updateRole',
      entity: 'User',
      entityId: userId,
      changes: { before: { role: user.role }, after: { role } },
    });

    logger.info('User role updated', { userId, newRole: role, actorId: opts.actorId });
  }

  /**
   * Soft-delete a user by setting deletedAt timestamp.
   * Guards: cannot delete self, cannot delete already-deleted user.
   */
  async softDeleteUser(params: { actorId: string; targetUserId: string }): Promise<void> {
    assertNotSelf(params.actorId, params.targetUserId);
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    assertNotSoftDeleted(user);

    const deletedAt = new Date();
    await this.prisma.user.update({
      where: { id: params.targetUserId },
      data: { deletedAt },
    });
    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.softDelete',
      entity: 'User',
      entityId: params.targetUserId,
      changes: { before: { deletedAt: null }, after: { deletedAt } },
    });
    logger.info('Admin: user soft-deleted', { actorId: params.actorId, targetUserId: params.targetUserId });
  }

  /**
   * Hard-delete a user, permanently removing the record.
   * Works on both soft-deleted and active users.
   * Guard: cannot delete self.
   * Stores a full snapshot of the user row in the audit log before deletion.
   */
  async hardDeleteUser(params: { actorId: string; targetUserId: string }): Promise<void> {
    assertNotSelf(params.actorId, params.targetUserId);
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, subscriptionPlan: true, deletedAt: true, createdAt: true,
      },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    await this.prisma.user.delete({ where: { id: params.targetUserId } });
    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.hardDelete',
      entity: 'User',
      entityId: params.targetUserId,
      changes: { before: user, after: null },
    });
    logger.warn('Admin: user hard-deleted', { actorId: params.actorId, targetUserId: params.targetUserId });
  }

  /**
   * Update a user's subscription plan.
   * Guard: cannot update a soft-deleted user.
   */
  async updateSubscriptionPlan(params: {
    actorId: string;
    targetUserId: string;
    plan: 'free' | 'pro';
  }): Promise<{ id: string; subscriptionPlan: 'free' | 'pro' }> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, deletedAt: true, subscriptionPlan: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    assertNotSoftDeleted(user);

    const updated = await this.prisma.user.update({
      where: { id: params.targetUserId },
      data: { subscriptionPlan: params.plan },
      select: { id: true, subscriptionPlan: true },
    });

    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.updateSubscription',
      entity: 'User',
      entityId: params.targetUserId,
      changes: { before: { subscriptionPlan: user.subscriptionPlan }, after: { subscriptionPlan: params.plan } },
    });

    return updated as { id: string; subscriptionPlan: 'free' | 'pro' };
  }

  /**
   * Update a user's message/request limits.
   * Only fields provided in params are updated.
   * Guard: cannot update a soft-deleted user.
   */
  async updateUserLimits(params: {
    actorId: string;
    targetUserId: string;
    aiMessagesLimit?: number;
    wfirmaRequestsLimit?: number;
  }): Promise<{ id: string; aiMessagesLimit: number; wfirmaRequestsLimit: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, deletedAt: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    assertNotSoftDeleted(user);

    const data: { aiMessagesLimit?: number; wfirmaRequestsLimit?: number } = {};
    if (params.aiMessagesLimit !== undefined) data.aiMessagesLimit = params.aiMessagesLimit;
    if (params.wfirmaRequestsLimit !== undefined) data.wfirmaRequestsLimit = params.wfirmaRequestsLimit;

    const updated = await this.prisma.user.update({
      where: { id: params.targetUserId },
      data,
      select: { id: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
    });

    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.updateLimits',
      entity: 'User',
      entityId: params.targetUserId,
      changes: {
        before: { aiMessagesLimit: user.aiMessagesLimit, wfirmaRequestsLimit: user.wfirmaRequestsLimit },
        after: { aiMessagesLimit: updated.aiMessagesLimit, wfirmaRequestsLimit: updated.wfirmaRequestsLimit },
      },
    });

    return updated;
  }

  /**
   * Reset usage counters for a user.
   * Supports resetting AI messages used, wFirma requests used, or both.
   * Guard: cannot reset counters for a soft-deleted user.
   */
  async resetUsageCounter(params: {
    actorId: string;
    targetUserId: string;
    type: 'ai' | 'wfirma' | 'both';
  }): Promise<{ id: string; aiMessagesUsed: number; wfirmaRequestsUsed: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, deletedAt: true, aiMessagesUsed: true, wfirmaRequestsUsed: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    assertNotSoftDeleted(user);

    const data: { aiMessagesUsed?: number; wfirmaRequestsUsed?: number } = {};
    if (params.type === 'ai' || params.type === 'both') data.aiMessagesUsed = 0;
    if (params.type === 'wfirma' || params.type === 'both') data.wfirmaRequestsUsed = 0;

    const updated = await this.prisma.user.update({
      where: { id: params.targetUserId },
      data,
      select: { id: true, aiMessagesUsed: true, wfirmaRequestsUsed: true },
    });

    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.resetUsage',
      entity: 'User',
      entityId: params.targetUserId,
      changes: {
        before: { aiMessagesUsed: user.aiMessagesUsed, wfirmaRequestsUsed: user.wfirmaRequestsUsed },
        after: { aiMessagesUsed: updated.aiMessagesUsed, wfirmaRequestsUsed: updated.wfirmaRequestsUsed },
        type: params.type,
      },
    });

    return updated;
  }

  /**
   * Get deep aggregated statistics for a single user.
   * Combines Langsmith cost data with DB-level tool/conversation/memory aggregates.
   * No conversation titles, message content, tool args, or memory values are exposed.
   */
  async getUserDeepStats(userId: string, range: StatsRange): Promise<UserDeepStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ttsCharactersUsed: true, ttsCostUsd: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const since = startOfRange(range);

    // IMPORTANT: $queryRaw calls must run in the order [convsByDay, toolsByDay]
    // because tests use mockResolvedValueOnce in that order.
    const [
      cost,
      convsInRange,
      lastConv,
      lastTool,
      toolsGrouped,
      toolsTotal,
      convsByDay,
      toolsByDay,
      memTotal,
      memByCat,
      telegram,
    ] = await Promise.all([
      langsmithService.getDashboardData({ userId, timeRange: range }),
      this.prisma.aIConversation.count({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.aIConversation.aggregate({ where: { userId }, _max: { updatedAt: true } }),
      this.prisma.aIToolUsage.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.aIToolUsage.groupBy({
        by: ['toolName'],
        where: { userId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.aIToolUsage.count({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
        FROM ai_conversations WHERE "userId" = ${userId}::uuid AND "createdAt" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
        FROM ai_tool_usage WHERE "userId" = ${userId}::uuid AND "createdAt" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.aIMemory.count({ where: { userId } }),
      this.prisma.aIMemory.groupBy({ by: ['category'], where: { userId }, _count: { _all: true } }),
      this.prisma.telegramLink.findUnique({ where: { userId }, select: { linkedAt: true } }),
    ]);

    const summary = (cost as any).userSummary;

    const topTools = [...(toolsGrouped as any[])]
      .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
      .slice(0, 10)
      .map((t) => ({ toolName: t.toolName, count: t._count?._all ?? 0 }));

    const byCategoryMap = new Map<ToolCategory, number>();
    for (const t of toolsGrouped as any[]) {
      const cat = categorizeToolName(t.toolName);
      byCategoryMap.set(cat, (byCategoryMap.get(cat) ?? 0) + (t._count?._all ?? 0));
    }

    const dayMap = new Map<string, { toolCalls: number; conversations: number }>();
    for (const r of convsByDay) {
      const k = r.day.toISOString().slice(0, 10);
      const cur = dayMap.get(k) ?? { toolCalls: 0, conversations: 0 };
      cur.conversations = Number(r.cnt);
      dayMap.set(k, cur);
    }
    for (const r of toolsByDay) {
      const k = r.day.toISOString().slice(0, 10);
      const cur = dayMap.get(k) ?? { toolCalls: 0, conversations: 0 };
      cur.toolCalls = Number(r.cnt);
      dayMap.set(k, cur);
    }

    return {
      range,
      cost: {
        totalUsd: summary.totalCost,
        totalTokens: summary.totalTokens,
        promptTokens: summary.promptTokens,
        completionTokens: summary.completionTokens,
        runCount: summary.runCount,
        langsmithConversationCount: summary.conversationCount,
        avgCostPerLangsmithConversation: summary.avgCostPerConversation,
      },
      activityByDay: [...dayMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
      conversations: { totalInRange: convsInRange },
      toolUsage: {
        totalCalls: toolsTotal,
        topTools,
        byCategory: [...byCategoryMap.entries()].map(([category, count]) => ({ category, count })),
      },
      channels: {
        web: { active: true },
        telegram: {
          active: telegram !== null,
          linkedAt: telegram?.linkedAt?.toISOString() ?? null,
        },
      },
      tts: { charactersUsed: user.ttsCharactersUsed, costUsd: user.ttsCostUsd },
      memories: {
        total: memTotal,
        byCategory: (memByCat as any[]).map((m) => ({ category: m.category, count: m._count?._all ?? 0 })),
      },
      lastActivity: {
        lastConversationAt: (lastConv as any)._max.updatedAt?.toISOString() ?? null,
        lastToolCallAt: (lastTool as any)?.createdAt?.toISOString() ?? null,
      },
    };
  }
}
