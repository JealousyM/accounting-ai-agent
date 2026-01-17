/**
 * AI Chat Types
 * Types for the AI accounting chat agent
 */

// ============================================
// LLM PROVIDER TYPES
// ============================================

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export const DEFAULT_LLM_CONFIG: Record<LLMProvider, LLMConfig> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// ============================================
// MESSAGE TYPES
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: MessageMetadata;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface MessageMetadata {
  model?: string;
  provider?: LLMProvider;
  tokens?: {
    prompt: number;
    completion: number;
  };
  processingTimeMs?: number;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface AIConversationData {
  id: string;
  userId: string;
  title: string;
  topic?: string;
  messages: ChatMessage[];
  graphState?: ConversationGraphState;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ConversationGraphState {
  lastToolCalls?: ToolCall[];
  companyDataCached?: boolean;
  userLanguage?: 'pl' | 'en' | 'ru';
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateConversationRequest {
  title?: string;
}

export interface CreateConversationResponse {
  id: string;
  title: string;
  createdAt: Date;
}

export interface SendMessageRequest {
  content: string;
  provider?: LLMProvider;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ConversationListItem {
  id: string;
  title: string;
  topic?: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TOOL DEFINITIONS
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  error?: string;
}

// ============================================
// WFIRMA TOOL TYPES
// ============================================

export interface GetContractorsArgs {
  search?: string;
  nip?: string;
  limit?: number;
}

export interface GetFinancialSummaryArgs {
  year: number;
}

export interface GetInvoicesArgs {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  limit?: number;
}

// ============================================
// SERVICE TYPES
// ============================================

export interface AIChatServiceConfig {
  defaultProvider: LLMProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

export interface ProcessMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolsUsed?: string[];
}
