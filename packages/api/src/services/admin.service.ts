import { PrismaClient, UserRole } from '@prisma/client';
import { langsmithService } from './langsmith.instance';
import { logger } from '../utils/logger';

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
  constructor(private prisma: PrismaClient) {}

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
   * Get detailed user info with cost history
   */
  async getUserDetail(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        conversations: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) return null;

    let costData = null;
    try {
      costData = await langsmithService.getDashboardData({
        userId,
        timeRange: 'month',
      });
    } catch (error) {
      logger.warn('Failed to fetch cost data for user detail', { userId, error });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      conversations: user.conversations,
      costData,
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    logger.info('User role updated', { userId, newRole: role });
  }
}
