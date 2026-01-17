/**
 * Agent Types and Interfaces
 * Base types for the multi-agent architecture
 */

import { StructuredToolInterface } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';

export type Locale = 'pl' | 'en' | 'ru';

export type AgentType =
  | 'contractor'    // Contractor/customer management
  | 'financial'     // Financial analysis and reporting
  | 'invoice'       // Invoice management
  | 'tax'           // Tax compliance and calculations
  | 'router';       // Main orchestrator

export interface AgentContext {
  userId: string;
  locale: Locale;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentConfig {
  name: AgentType;
  description: string;
  systemPrompt: string;
  tools: StructuredToolInterface[];
  maxIterations?: number;
  temperature?: number;
}

export interface AgentResult {
  response: string;
  toolsUsed: string[];
  agentType: AgentType;
  metadata?: Record<string, unknown>;
}

export interface RouterDecision {
  targetAgent: AgentType;
  confidence: number;
  reasoning: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  agentType?: AgentType;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

/**
 * Base interface for all specialized agents
 */
export interface ISpecializedAgent {
  readonly name: AgentType;
  readonly description: string;

  /**
   * Get the system prompt for this agent
   */
  getSystemPrompt(locale: Locale): string;

  /**
   * Get tools available to this agent
   */
  getTools(context: AgentContext): StructuredToolInterface[];

  /**
   * Process a message and return response
   */
  process(
    messages: BaseMessage[],
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResult>;
}

/**
 * Intent categories for routing
 */
export type UserIntent =
  | 'contractor_query'      // Questions about contractors
  | 'contractor_create'     // Create new contractor
  | 'contractor_update'     // Update contractor
  | 'contractor_delete'     // Delete contractor
  | 'financial_query'       // Financial questions
  | 'financial_report'      // Generate reports
  | 'invoice_query'         // Invoice questions
  | 'invoice_create'        // Create invoice
  | 'tax_query'             // Tax questions
  | 'tax_calculation'       // Calculate taxes
  | 'tax_deadline'          // Deadline reminders
  | 'general_query'         // General accounting questions
  | 'unknown';              // Cannot determine intent

/**
 * Agent capabilities mapping
 */
export const AGENT_CAPABILITIES: Record<AgentType, UserIntent[]> = {
  contractor: [
    'contractor_query',
    'contractor_create',
    'contractor_update',
    'contractor_delete',
  ],
  financial: [
    'financial_query',
    'financial_report',
  ],
  invoice: [
    'invoice_query',
    'invoice_create',
  ],
  tax: [
    'tax_query',
    'tax_calculation',
    'tax_deadline',
  ],
  router: [
    'general_query',
    'unknown',
  ],
};
