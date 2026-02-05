/**
 * AI Costs Types
 * Frontend types for AI cost tracking dashboard
 */

// ============================================
// TIME RANGE
// ============================================

export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

// ============================================
// USER-LEVEL STATISTICS
// ============================================

export interface UserCostSummary {
  userId: string;
  totalCost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  runCount: number;
  conversationCount: number;
  avgCostPerRun: number;
  avgCostPerConversation: number;
  avgLatencyMs: number;
  // TTS costs (separate from LLM)
  ttsCost: number;
  ttsCharacters: number;
  ttsCalls: number;
}

export interface DailyCostData {
  date: string;
  cost: number;
  tokens: number;
  runs: number;
}

export interface CostByModel {
  model: string;
  provider: string;
  cost: number;
  tokens: number;
  runs: number;
  percentage: number;
}

// ============================================
// CONVERSATION-LEVEL STATISTICS
// ============================================

export interface ConversationCost {
  conversationId: string;
  title?: string;
  cost: number;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  messageCount: number;
  runCount: number;
  avgCostPerMessage: number;
  primaryModel?: string;
  createdAt: string;
  lastActive: string;
}

export interface ConversationCostDetail {
  conversation: ConversationCost;
  dailyData: DailyCostData[];
  byModel: CostByModel[];
  runs: RunCostDetail[];
}

export interface RunCostDetail {
  runId: string;
  name: string;
  runType: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  latencyMs: number;
  timestamp: string;
}

// ============================================
// DASHBOARD RESPONSE
// ============================================

export interface CostDashboardData {
  userSummary: UserCostSummary;
  dailyData: DailyCostData[];
  byModel: CostByModel[];
  conversations: ConversationCost[];
  period: {
    start: string;
    end: string;
    range: TimeRange;
  };
}

// ============================================
// API RESPONSE WRAPPER
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
