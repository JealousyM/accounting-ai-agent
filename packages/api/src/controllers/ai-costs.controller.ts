/**
 * AI Costs Controller
 * HTTP handlers for AI cost tracking endpoints
 */

import { Request, Response } from 'express';
import { langsmithService } from '../services/langsmith.instance';
import { logger } from '../utils/logger';
import { TimeRange, CostQueryParams } from '../types/langsmith.types';

export class AICostsController {
  /**
   * GET /api/ai/costs/dashboard
   * Get full dashboard data with user summary, daily costs, model breakdown, and conversations
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const params: CostQueryParams = {
        timeRange: (req.query.timeRange as TimeRange) || 'month',
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        userId,
      };

      logger.info('=== AI Costs Dashboard Request ===', {
        userId,
        params,
      });

      const dashboardData = await langsmithService.getDashboardData(params);

      logger.info('=== AI Costs Dashboard Response ===', {
        userId,
        userSummary: dashboardData.userSummary,
        dailyDataCount: dashboardData.dailyData.length,
        byModelCount: dashboardData.byModel.length,
        conversationsCount: dashboardData.conversations.length,
      });

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      logger.error('Failed to get AI costs dashboard', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch AI costs data',
      });
    }
  }

  /**
   * GET /api/ai/costs/summary
   * Get user cost summary only
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const params: CostQueryParams = {
        timeRange: (req.query.timeRange as TimeRange) || 'month',
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        userId,
      };

      const summary = await langsmithService.getUserSummary(params);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Failed to get AI costs summary', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch AI costs summary',
      });
    }
  }

  /**
   * GET /api/ai/costs/daily
   * Get daily cost breakdown
   */
  async getDailyCosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const params: CostQueryParams = {
        timeRange: (req.query.timeRange as TimeRange) || 'month',
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        userId,
      };

      const dailyCosts = await langsmithService.getUserDailyCosts(params);

      res.status(200).json({
        success: true,
        data: dailyCosts,
      });
    } catch (error) {
      logger.error('Failed to get daily AI costs', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch daily AI costs',
      });
    }
  }

  /**
   * GET /api/ai/costs/by-model
   * Get cost breakdown by model
   */
  async getCostsByModel(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const params: CostQueryParams = {
        timeRange: (req.query.timeRange as TimeRange) || 'month',
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        userId,
      };

      const byModel = await langsmithService.getUserCostsByModel(params);

      res.status(200).json({
        success: true,
        data: byModel,
      });
    } catch (error) {
      logger.error('Failed to get AI costs by model', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch AI costs by model',
      });
    }
  }

  /**
   * GET /api/ai/costs/conversations
   * Get all conversations with costs
   */
  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const params: CostQueryParams = {
        timeRange: (req.query.timeRange as TimeRange) || 'month',
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        userId,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const conversations = await langsmithService.getUserConversations(params);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error('Failed to get conversation costs', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch conversation costs',
      });
    }
  }

  /**
   * GET /api/ai/costs/conversations/:id
   * Get detailed cost data for a single conversation
   */
  async getConversationDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const detail = await langsmithService.getConversationDetail(id, userId);

      if (!detail) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Conversation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (error) {
      logger.error('Failed to get conversation detail', {
        error,
        conversationId: req.params.id,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch conversation detail',
      });
    }
  }

  /**
   * GET /api/ai/costs/conversations/:id/runs
   * Get individual runs for a conversation
   */
  async getConversationRuns(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      // Verify conversation belongs to user by trying to get detail
      const detail = await langsmithService.getConversationDetail(id, userId);

      if (!detail) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Conversation not found',
        });
        return;
      }

      const runs = await langsmithService.getConversationRuns(id);

      res.status(200).json({
        success: true,
        data: runs,
      });
    } catch (error) {
      logger.error('Failed to get conversation runs', {
        error,
        conversationId: req.params.id,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch conversation runs',
      });
    }
  }
}

export const aiCostsController = new AICostsController();
