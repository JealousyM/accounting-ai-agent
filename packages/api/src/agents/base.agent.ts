/**
 * Base Agent Class
 * Abstract base class for all specialized agents
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { logger } from '../utils/logger';
import {
  AgentType,
  AgentContext,
  AgentResult,
  ISpecializedAgent,
  Locale,
} from './types';

export type LLMProvider = 'openai' | 'anthropic';

const LLM_CONFIG = {
  openai: {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
  },
  anthropic: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

/**
 * Abstract base class for specialized agents
 */
export abstract class BaseAgent implements ISpecializedAgent {
  abstract readonly name: AgentType;
  abstract readonly description: string;

  protected readonly provider: LLMProvider;
  protected readonly maxIterations: number;

  constructor(provider: LLMProvider = 'openai', maxIterations: number = 10) {
    this.provider = provider;
    this.maxIterations = maxIterations;
  }

  /**
   * Get localized system prompt - must be implemented by subclasses
   */
  abstract getSystemPrompt(locale: Locale): string;

  /**
   * Get tools for this agent - must be implemented by subclasses
   */
  abstract getTools(context: AgentContext): StructuredToolInterface[];

  /**
   * Create the LLM model
   */
  protected createModel(): ChatOpenAI | ChatAnthropic {
    if (this.provider === 'anthropic') {
      return new ChatAnthropic({
        modelName: LLM_CONFIG.anthropic.model,
        maxTokens: LLM_CONFIG.anthropic.maxTokens,
        temperature: LLM_CONFIG.anthropic.temperature,
      });
    }

    return new ChatOpenAI({
      modelName: LLM_CONFIG.openai.model,
      maxTokens: LLM_CONFIG.openai.maxTokens,
      temperature: LLM_CONFIG.openai.temperature,
    });
  }

  /**
   * Process a message through the agent
   */
  async process(
    existingMessages: BaseMessage[],
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    try {
      const model = this.createModel();
      const tools = this.getTools(context);
      const modelWithTools = model.bindTools(tools);
      const toolNode = new ToolNode(tools);

      // Define the agent node
      const callModel = async (state: typeof MessagesAnnotation.State) => {
        const response = await modelWithTools.invoke(state.messages);
        return { messages: [response] };
      };

      // Router function
      const shouldContinue = (state: typeof MessagesAnnotation.State) => {
        const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
        if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
          lastMessage.tool_calls.forEach((tc: { name: string }) => {
            if (!toolsUsed.includes(tc.name)) {
              toolsUsed.push(tc.name);
            }
          });
          return 'tools';
        }
        return END;
      };

      // Build the graph
      const workflow = new StateGraph(MessagesAnnotation)
        .addNode('agent', callModel)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addConditionalEdges('agent', shouldContinue, ['tools', END])
        .addEdge('tools', 'agent');

      const graph = workflow.compile();

      // Prepare messages
      const systemPrompt = this.getSystemPrompt(context.locale);
      const langchainMessages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...existingMessages,
        new HumanMessage(userMessage),
      ];

      // Run the graph
      const result = await graph.invoke(
        { messages: langchainMessages },
        { recursionLimit: this.maxIterations }
      );

      // Extract response
      const lastMessage = result.messages[result.messages.length - 1];
      const response = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

      logger.info(`Agent ${this.name} processed message`, {
        agentType: this.name,
        toolsUsed,
        duration: Date.now() - startTime,
        locale: context.locale,
      });

      return {
        response,
        toolsUsed,
        agentType: this.name,
        metadata: {
          duration: Date.now() - startTime,
          provider: this.provider,
        },
      };
    } catch (error) {
      logger.error(`Agent ${this.name} error`, { error, context });
      throw error;
    }
  }
}
