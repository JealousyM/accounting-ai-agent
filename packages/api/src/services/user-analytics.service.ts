import { PrismaClient } from '@prisma/client';
import type { AnalyticsRange, UserAnalytics } from '../types/user-analytics.types';

function startOfRange(range: AnalyticsRange): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setDate(d.getDate() - 30);
  else d.setDate(d.getDate() - 365);
  return d;
}

export class UserAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getMyAnalytics(userId: string, range: AnalyticsRange): Promise<UserAnalytics> {
    const since = startOfRange(range);

    const [
      conversationCount,
      toolUsageTotal,
      topToolsRaw,
      convsByDay,
      toolsByDay,
      user,
    ] = await Promise.all([
      this.prisma.aIConversation.count({
        where: { userId, createdAt: { gte: since }, deletedAt: null },
      }),
      this.prisma.aIToolUsage.count({
        where: { userId, createdAt: { gte: since } },
      }),
      this.prisma.aIToolUsage.groupBy({
        by: ['toolName'],
        where: { userId, createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { toolName: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
        FROM ai_conversations
        WHERE "userId" = ${userId}::uuid
          AND "createdAt" >= ${since}
          AND "deletedAt" IS NULL
        GROUP BY day ORDER BY day ASC`,
      this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
        FROM ai_tool_usage
        WHERE "userId" = ${userId}::uuid
          AND "createdAt" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { aiMessagesUsed: true, aiMessagesLimit: true },
      }),
    ]);

    const topTools = topToolsRaw
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .map((t) => ({ toolName: t.toolName, count: t._count._all ?? 0 }));

    const dayMap = new Map<string, { conversations: number; toolCalls: number }>();
    for (const r of convsByDay) {
      const k = r.day.toISOString().slice(0, 10);
      const cur = dayMap.get(k) ?? { conversations: 0, toolCalls: 0 };
      cur.conversations = Number(r.cnt);
      dayMap.set(k, cur);
    }
    for (const r of toolsByDay) {
      const k = r.day.toISOString().slice(0, 10);
      const cur = dayMap.get(k) ?? { conversations: 0, toolCalls: 0 };
      cur.toolCalls = Number(r.cnt);
      dayMap.set(k, cur);
    }

    const activityByDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return {
      range,
      conversations: { totalInRange: conversationCount },
      toolUsage: { totalCalls: toolUsageTotal, topTools },
      activityByDay,
      usageQuota: {
        used: user?.aiMessagesUsed ?? 0,
        limit: user?.aiMessagesLimit ?? 500,
      },
    };
  }
}
