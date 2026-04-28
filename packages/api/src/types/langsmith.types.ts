/**
 * LangSmith Cost Tracking Types
 * Types for AI cost tracking and analytics via LangSmith API
 */

// ============================================
// TIME RANGE TYPES
// ============================================

export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface CostQueryParams {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  userId: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// USER-LEVEL STATISTICS (общая статистика)
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
// CONVERSATION-LEVEL STATISTICS (по чатам)
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
  createdAt: Date;
  lastActive: Date;
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
  timestamp: Date;
}

// ============================================
// RAW LANGSMITH RUN METRICS
// ============================================

export interface LangSmithRunMetrics {
  runId: string;
  name: string;
  runType: 'llm' | 'chain' | 'tool' | 'agent' | 'retriever';
  startTime: Date;
  endTime: Date;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model?: string;
  provider?: string;
  conversationId?: string;
  userId?: string;
  error?: string;
}

// TTS run metrics (from LangSmith traces)
export interface TTSRunMetrics {
  runId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  latencyMs: number;
  characters: number;
  cost: number;
  model: string;
  voice: string;
  conversationId?: string;
  userId?: string;
  source: 'auto_speak' | 'manual_button';
}

// ============================================
// DASHBOARD RESPONSE TYPES
// ============================================

export interface CostDashboardResponse {
  userSummary: UserCostSummary;
  dailyData: DailyCostData[];
  byModel: CostByModel[];
  conversations: ConversationCost[];
  ttsRuns?: TTSRunMetrics[];
  period: {
    start: Date;
    end: Date;
    range: TimeRange;
  };
}

export interface ConversationCostResponse {
  conversation: ConversationCostDetail;
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================
// MODEL PRICING CONFIGURATION
// ============================================

export interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

// TTS pricing (per 1K characters)
export const TTS_PRICING: Record<string, number> = {
  'tts-1': 0.015,    // $0.015 per 1K characters
  'tts-1-hd': 0.030, // $0.030 per 1K characters
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI models (per 1M tokens)
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },

  // Default fallback for unknown models
  'default': { input: 1.00, output: 3.00 },
};

// ============================================
// API RESPONSE WRAPPERS
// ============================================

export interface CostApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
