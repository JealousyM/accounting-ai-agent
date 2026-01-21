/**
 * LangSmith Service
 * Fetches cost and usage data from LangSmith API
 * Provides user-level and conversation-level cost analytics
 */

import { Client, Run } from 'langsmith';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import {
  LangSmithRunMetrics,
  UserCostSummary,
  DailyCostData,
  CostByModel,
  ConversationCost,
  ConversationCostDetail,
  RunCostDetail,
  CostQueryParams,
  CostDashboardResponse,
  MODEL_PRICING,
} from '../../types/langsmith.types';

export class LangSmithService {
  private client: Client;
  private prisma: PrismaClient;
  private projectName: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    this.client = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
    });

    this.projectName = process.env.LANGCHAIN_PROJECT || 'accounting-ai-agent';

    logger.info('LangSmithService initialized', {
      projectName: this.projectName,
      hasApiKey: !!process.env.LANGCHAIN_API_KEY,
    });
  }

  // ============================================
  // USER-LEVEL METHODS (общая статистика)
  // ============================================

  /**
   * Get full dashboard data for a user
   */
  async getDashboardData(params: CostQueryParams): Promise<CostDashboardResponse> {
    const { start, end } = this.getDateRange(params);

    logger.debug('Getting dashboard data', { userId: params.userId, start, end });

    // Fetch all runs for user in parallel
    const runs = await this.fetchUserRuns(params);

    // Calculate all metrics
    const userSummary = this.calculateUserSummary(runs, params.userId);
    const dailyData = this.calculateDailyCosts(runs);
    const byModel = this.calculateCostsByModel(runs);
    const conversations = await this.calculateConversationCosts(runs, params.userId);

    return {
      userSummary,
      dailyData,
      byModel,
      conversations,
      period: {
        start,
        end,
        range: params.timeRange,
      },
    };
  }

  /**
   * Get user cost summary only
   */
  async getUserSummary(params: CostQueryParams): Promise<UserCostSummary> {
    const runs = await this.fetchUserRuns(params);
    return this.calculateUserSummary(runs, params.userId);
  }

  /**
   * Get daily cost breakdown for user
   */
  async getUserDailyCosts(params: CostQueryParams): Promise<DailyCostData[]> {
    const runs = await this.fetchUserRuns(params);
    return this.calculateDailyCosts(runs);
  }

  /**
   * Get costs by model for user
   */
  async getUserCostsByModel(params: CostQueryParams): Promise<CostByModel[]> {
    const runs = await this.fetchUserRuns(params);
    return this.calculateCostsByModel(runs);
  }

  /**
   * Get all conversations with costs for user
   */
  async getUserConversations(params: CostQueryParams): Promise<ConversationCost[]> {
    const runs = await this.fetchUserRuns(params);
    return this.calculateConversationCosts(runs, params.userId);
  }

  // ============================================
  // CONVERSATION-LEVEL METHODS (по чатам)
  // ============================================

  /**
   * Get detailed cost data for a single conversation
   */
  async getConversationDetail(
    conversationId: string,
    userId: string
  ): Promise<ConversationCostDetail | null> {
    // Verify conversation belongs to user
    const conversation = await this.prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
    });

    if (!conversation) {
      return null;
    }

    // Fetch runs for this conversation
    const runs = await this.fetchConversationRuns(conversationId);

    if (runs.length === 0) {
      // Return empty detail with conversation info
      return {
        conversation: {
          conversationId,
          title: conversation.title,
          cost: 0,
          tokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          messageCount: ((conversation.messages as any[]) || []).filter(
            (m: any) => m.role === 'user' || m.role === 'assistant'
          ).length,
          runCount: 0,
          avgCostPerMessage: 0,
          createdAt: conversation.createdAt,
          lastActive: conversation.updatedAt,
        },
        dailyData: [],
        byModel: [],
        runs: [],
      };
    }

    // Calculate conversation cost summary
    const conversationCost = this.calculateSingleConversationCost(
      runs,
      conversationId,
      conversation.title,
      conversation.messages as any[],
      conversation.createdAt,
      conversation.updatedAt
    );

    // Calculate daily data within conversation
    const dailyData = this.calculateDailyCosts(runs);

    // Calculate model breakdown for conversation
    const byModel = this.calculateCostsByModel(runs);

    // Convert runs to detail format
    const runDetails: RunCostDetail[] = runs.map(run => ({
      runId: run.runId,
      name: run.name,
      runType: run.runType,
      model: run.model || 'unknown',
      provider: run.provider || 'unknown',
      promptTokens: run.promptTokens,
      completionTokens: run.completionTokens,
      totalTokens: run.totalTokens,
      inputCost: run.inputCost,
      outputCost: run.outputCost,
      totalCost: run.totalCost,
      latencyMs: run.latencyMs,
      timestamp: run.startTime,
    }));

    return {
      conversation: conversationCost,
      dailyData,
      byModel,
      runs: runDetails,
    };
  }

  /**
   * Get runs for a specific conversation
   */
  async getConversationRuns(conversationId: string): Promise<RunCostDetail[]> {
    const runs = await this.fetchConversationRuns(conversationId);

    return runs.map(run => ({
      runId: run.runId,
      name: run.name,
      runType: run.runType,
      model: run.model || 'unknown',
      provider: run.provider || 'unknown',
      promptTokens: run.promptTokens,
      completionTokens: run.completionTokens,
      totalTokens: run.totalTokens,
      inputCost: run.inputCost,
      outputCost: run.outputCost,
      totalCost: run.totalCost,
      latencyMs: run.latencyMs,
      timestamp: run.startTime,
    }));
  }

  // ============================================
  // PRIVATE - LANGSMITH API FETCHING
  // ============================================

  /**
   * Fetch all LLM runs for a user from LangSmith
   */
  private async fetchUserRuns(params: CostQueryParams): Promise<LangSmithRunMetrics[]> {
    const { start, end } = this.getDateRange(params);
    const metrics: LangSmithRunMetrics[] = [];

    logger.info('=== LangSmith fetchUserRuns START === ', {
      userId: params.userId,
      start: start.toISOString(),
      end: end.toISOString(),
      projectName: this.projectName,
      filter: `has(tags, "user:${params.userId}")`,
    });

    try {
      // First, try to fetch ALL runs without filter to see what's available
      logger.info('Fetching ALL LLM runs (no filter) to debug...');
      const allRuns = this.client.listRuns({
        projectName: this.projectName,
        startTime: start,
        runType: 'llm',
      });

      let allRunsCount = 0;
      const allRunsSample: Array<{ id: string; name: string; tags: string[] | null | undefined }> = [];
      for await (const run of allRuns) {
        allRunsCount++;
        if (allRunsSample.length < 5) {
          allRunsSample.push({
            id: run.id,
            name: run.name,
            tags: run.tags,
          });
        }
      }

      logger.info('ALL LLM runs found (without user filter)', {
        count: allRunsCount,
        sampleRuns: allRunsSample,
      });

      // Now fetch with user filter
      const runs = this.client.listRuns({
        projectName: this.projectName,
        startTime: start,
        runType: 'llm',
        filter: `has(tags, "user:${params.userId}")`,
      });

      for await (const run of runs) {
        logger.debug('Processing run from LangSmith', {
          runId: run.id,
          name: run.name,
          runType: run.run_type,
          tags: run.tags,
          promptTokens: run.prompt_tokens,
          completionTokens: run.completion_tokens,
          totalTokens: run.total_tokens,
        });

        const metric = this.convertRunToMetrics(run);
        if (metric) {
          metrics.push(metric);
        }
      }

      logger.info('=== LangSmith fetchUserRuns END ===', {
        userId: params.userId,
        metricsCount: metrics.length,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to fetch LangSmith runs', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: params.userId
      });
      // Return empty array on error instead of throwing
      return [];
    }
  }

  /**
   * Fetch runs for a specific conversation
   */
  private async fetchConversationRuns(conversationId: string): Promise<LangSmithRunMetrics[]> {
    const metrics: LangSmithRunMetrics[] = [];

    logger.debug('Fetching LangSmith runs for conversation', {
      conversationId,
      projectName: this.projectName,
    });

    try {
      const runs = this.client.listRuns({
        projectName: this.projectName,
        runType: 'llm',
        filter: `has(tags, "conv:${conversationId}")`,
      });

      for await (const run of runs) {
        const metric = this.convertRunToMetrics(run);
        if (metric) {
          metrics.push(metric);
        }
      }

      logger.info('Fetched LangSmith runs for conversation', {
        conversationId,
        count: metrics.length,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to fetch LangSmith runs for conversation', {
        error,
        conversationId,
      });
      return [];
    }
  }

  /**
   * Convert LangSmith Run to our metrics format
   */
  private convertRunToMetrics(run: Run): LangSmithRunMetrics | null {
    const promptTokens = run.prompt_tokens || 0;
    const completionTokens = run.completion_tokens || 0;

    // Extract model name from run metadata
    const model = this.extractModelName(run);
    const provider = this.detectProvider(model);

    // Calculate costs
    const costs = this.calculateCost(model, promptTokens, completionTokens);

    // Extract conversation ID from tags
    const conversationId = this.extractTagValue(run.tags || [], 'conv:');
    const userId = this.extractTagValue(run.tags || [], 'user:');

    // Calculate latency
    const startTime = run.start_time ? new Date(run.start_time) : new Date();
    const endTime = run.end_time ? new Date(run.end_time) : new Date();
    const latencyMs = endTime.getTime() - startTime.getTime();

    return {
      runId: run.id,
      name: run.name,
      runType: run.run_type as LangSmithRunMetrics['runType'],
      startTime,
      endTime,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens: run.total_tokens || promptTokens + completionTokens,
      inputCost: costs.inputCost,
      outputCost: costs.outputCost,
      totalCost: costs.totalCost,
      model,
      provider,
      conversationId,
      userId,
      error: run.error || undefined,
    };
  }

  // ============================================
  // PRIVATE - CALCULATIONS
  // ============================================

  /**
   * Calculate user summary from runs
   */
  private calculateUserSummary(runs: LangSmithRunMetrics[], userId: string): UserCostSummary {
    const conversationIds = new Set<string>();
    let totalCost = 0;
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalLatency = 0;

    for (const run of runs) {
      totalCost += run.totalCost;
      totalTokens += run.totalTokens;
      promptTokens += run.promptTokens;
      completionTokens += run.completionTokens;
      totalLatency += run.latencyMs;

      if (run.conversationId) {
        conversationIds.add(run.conversationId);
      }
    }

    const runCount = runs.length;
    const conversationCount = conversationIds.size;

    return {
      userId,
      totalCost,
      totalTokens,
      promptTokens,
      completionTokens,
      runCount,
      conversationCount,
      avgCostPerRun: runCount > 0 ? totalCost / runCount : 0,
      avgCostPerConversation: conversationCount > 0 ? totalCost / conversationCount : 0,
      avgLatencyMs: runCount > 0 ? totalLatency / runCount : 0,
    };
  }

  /**
   * Calculate daily cost breakdown
   */
  private calculateDailyCosts(runs: LangSmithRunMetrics[]): DailyCostData[] {
    const dailyMap = new Map<string, DailyCostData>();

    for (const run of runs) {
      const dateKey = run.startTime.toISOString().split('T')[0];

      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        cost: 0,
        tokens: 0,
        runs: 0,
      };

      existing.cost += run.totalCost;
      existing.tokens += run.totalTokens;
      existing.runs += 1;

      dailyMap.set(dateKey, existing);
    }

    // Sort by date ascending
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate costs by model
   */
  private calculateCostsByModel(runs: LangSmithRunMetrics[]): CostByModel[] {
    const modelMap = new Map<string, CostByModel>();
    let totalCost = 0;

    for (const run of runs) {
      const modelKey = run.model || 'unknown';

      const existing = modelMap.get(modelKey) || {
        model: run.model || 'unknown',
        provider: run.provider || 'unknown',
        cost: 0,
        tokens: 0,
        runs: 0,
        percentage: 0,
      };

      existing.cost += run.totalCost;
      existing.tokens += run.totalTokens;
      existing.runs += 1;
      totalCost += run.totalCost;

      modelMap.set(modelKey, existing);
    }

    // Calculate percentages
    const results = Array.from(modelMap.values());
    for (const item of results) {
      item.percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
    }

    // Sort by cost descending
    return results.sort((a, b) => b.cost - a.cost);
  }

  /**
   * Calculate conversation costs from runs
   */
  private async calculateConversationCosts(
    runs: LangSmithRunMetrics[],
    userId: string
  ): Promise<ConversationCost[]> {
    // Group runs by conversation ID
    const convMap = new Map<string, LangSmithRunMetrics[]>();

    for (const run of runs) {
      if (run.conversationId) {
        const existing = convMap.get(run.conversationId) || [];
        existing.push(run);
        convMap.set(run.conversationId, existing);
      }
    }

    // Fetch conversation metadata from database
    const conversationIds = Array.from(convMap.keys());

    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = await this.prisma.aIConversation.findMany({
      where: {
        id: { in: conversationIds },
        userId,
        deletedAt: null,
      },
    });

    // Create a map for quick lookup
    const convMetaMap = new Map(conversations.map(c => [c.id, c]));

    // Calculate costs for each conversation
    const results: ConversationCost[] = [];

    for (const [convId, convRuns] of convMap) {
      const meta = convMetaMap.get(convId);
      if (!meta) continue; // Skip if conversation not found in DB

      const cost = this.calculateSingleConversationCost(
        convRuns,
        convId,
        meta.title,
        meta.messages as any[],
        meta.createdAt,
        meta.updatedAt
      );

      results.push(cost);
    }

    // Sort by lastActive descending
    return results.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }

  /**
   * Calculate cost for a single conversation
   */
  private calculateSingleConversationCost(
    runs: LangSmithRunMetrics[],
    conversationId: string,
    title: string,
    messages: any[],
    createdAt: Date,
    updatedAt: Date
  ): ConversationCost {
    let cost = 0;
    let tokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    const modelCounts = new Map<string, number>();

    for (const run of runs) {
      cost += run.totalCost;
      tokens += run.totalTokens;
      promptTokens += run.promptTokens;
      completionTokens += run.completionTokens;

      const model = run.model || 'unknown';
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    }

    // Find primary model (most used)
    let primaryModel: string | undefined;
    let maxCount = 0;
    for (const [model, count] of modelCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryModel = model;
      }
    }

    // Count messages (user + assistant only)
    const messageCount = (messages || []).filter(
      (m: any) => m.role === 'user' || m.role === 'assistant'
    ).length;

    return {
      conversationId,
      title,
      cost,
      tokens,
      promptTokens,
      completionTokens,
      messageCount,
      runCount: runs.length,
      avgCostPerMessage: messageCount > 0 ? cost / messageCount : 0,
      primaryModel,
      createdAt,
      lastActive: updatedAt,
    };
  }

  // ============================================
  // PRIVATE - HELPERS
  // ============================================

  /**
   * Calculate date range based on TimeRange
   */
  private getDateRange(params: CostQueryParams): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (params.timeRange) {
      case 'day':
        start = new Date(end);
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start = new Date(end);
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(end);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'custom':
        start = params.startDate ? new Date(params.startDate) : new Date(end);
        start.setMonth(start.getMonth() - 1);
        if (params.endDate) {
          return { start, end: new Date(params.endDate) };
        }
        break;
      default:
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
    }

    return { start, end };
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(
    model: string | undefined,
    promptTokens: number,
    completionTokens: number
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = MODEL_PRICING[model || ''] || MODEL_PRICING['default'];

    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Extract model name from run
   */
  private extractModelName(run: Run): string | undefined {
    // Try different locations where model name might be stored
    const extra = run.extra as Record<string, any> | undefined;

    return (
      extra?.metadata?.model ||
      extra?.invocation_params?.model ||
      extra?.invocation_params?.model_name ||
      extra?.model ||
      undefined
    );
  }

  /**
   * Detect provider from model name
   */
  private detectProvider(model: string | undefined): string {
    if (!model) return 'unknown';

    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('gemini')) return 'google';

    return 'unknown';
  }

  /**
   * Extract tag value by prefix
   */
  private extractTagValue(tags: string[], prefix: string): string | undefined {
    const tag = tags.find(t => t.startsWith(prefix));
    return tag ? tag.slice(prefix.length) : undefined;
  }
}
