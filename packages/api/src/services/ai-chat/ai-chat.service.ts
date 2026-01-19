/**
 * AI Chat Service
 * Provides AI-powered accounting chat with wFirma integration
 * Built with LangChain, LangGraph, and LangSmith
 */

import { PrismaClient, AIConversation } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { logger } from '../../utils/logger';
import { WFirmaIntegrationService } from '../wfirma';
import { WFirmaCacheService } from '../wfirma-cache.service';
import {
  LLMProvider,
  ChatMessage,
  AIConversationData,
  ConversationListItem,
  ProcessMessageResult,
  DEFAULT_LLM_CONFIG,
  ConversationGraphState,
} from '../../types/ai-chat.types';

// Import from local modules
import { SYSTEM_PROMPT } from './constants';
import { detectLocale, generateConversationTitle, generateTitleFromMessage } from './utils';
import { createAllTools } from './tools';

export class AIChatService {
  private readonly prisma: PrismaClient;
  private readonly wfirmaService: WFirmaIntegrationService;
  private readonly cacheService: WFirmaCacheService;
  private readonly defaultProvider: LLMProvider;

  constructor(
    prisma: PrismaClient,
    wfirmaService: WFirmaIntegrationService,
    cacheService: WFirmaCacheService
  ) {
    this.prisma = prisma;
    this.wfirmaService = wfirmaService;
    this.cacheService = cacheService;

    // Set default provider
    this.defaultProvider = (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai';

    // Check for LangSmith tracing
    if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
      logger.info('LangSmith tracing enabled');
    }

    logger.info('AIChatService initialized with LangGraph', {
      defaultProvider: this.defaultProvider,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    });
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string): Promise<AIConversation> {
    const conversationTitle = title || generateConversationTitle();

    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        title: conversationTitle,
        messages: [] as any,
        graphState: {} as any,
      },
    });

    logger.info('Created new conversation', { conversationId: conversation.id, userId });

    return conversation;
  }

  /**
   * Send a message and get AI response using LangGraph
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    provider?: LLMProvider
  ): Promise<ProcessMessageResult> {
    const startTime = Date.now();
    const selectedProvider = provider || this.defaultProvider;

    // Get conversation
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Parse existing messages
    const existingMessages = (conversation.messages as any[]) as ChatMessage[];

    // Create user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Build LangGraph agent and run
    const { response, toolsUsed } = await this.runAgent(
      existingMessages,
      content,
      userId,
      selectedProvider
    );

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      metadata: {
        provider: selectedProvider,
        model: DEFAULT_LLM_CONFIG[selectedProvider].model,
      },
    };

    // Update messages array
    const updatedMessages = [...existingMessages, userMessage, assistantMessage];

    // Update conversation title if it's the first user message
    const userMessages = updatedMessages.filter(m => m.role === 'user');
    let newTitle = conversation.title;
    if (userMessages.length === 1) {
      newTitle = generateTitleFromMessage(content);
    }

    // Update conversation in database
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        title: newTitle,
        messages: updatedMessages as any,
        updatedAt: new Date(),
      },
    });

    const processingTimeMs = Date.now() - startTime;
    logger.info('Message processed with LangGraph', {
      conversationId,
      userId,
      provider: selectedProvider,
      processingTimeMs,
      toolsUsed,
    });

    return {
      userMessage,
      assistantMessage,
      toolsUsed,
    };
  }

  /**
   * Get user's conversations list
   */
  async getConversations(userId: string, limit: number = 50): Promise<ConversationListItem[]> {
    const conversations = await this.prisma.aIConversation.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return conversations.map(conv => {
      const messages = (conv.messages as any[]) as ChatMessage[];
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

      return {
        id: conv.id,
        title: conv.title,
        topic: conv.topic || undefined,
        lastMessage: lastUserMessage?.content?.substring(0, 100),
        messageCount: messages.filter(m => m.role !== 'system').length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });
  }

  /**
   * Get single conversation with messages
   */
  async getConversation(conversationId: string, userId: string): Promise<AIConversationData | null> {
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) return null;

    const messages = (conversation.messages as any[]) as ChatMessage[];

    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      topic: conversation.topic || undefined,
      messages,
      graphState: conversation.graphState as ConversationGraphState,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      deletedAt: conversation.deletedAt || undefined,
    };
  }

  /**
   * Delete conversation (soft delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });

    logger.info('Conversation deleted', { conversationId, userId });
  }

  // ============================================
  // PRIVATE METHODS - LANGGRAPH AGENT
  // ============================================

  /**
   * Build and run the LangGraph agent
   */
  private async runAgent(
    existingMessages: ChatMessage[],
    userMessage: string,
    userId: string,
    provider: LLMProvider
  ): Promise<{ response: string; toolsUsed: string[] }> {
    // Create the LLM based on provider
    const model = this.createModel(provider);

    // Detect user's language for localized tool responses
    const locale = detectLocale(userMessage);

    // Create tools with userId and locale bound
    const tools = createAllTools(this.wfirmaService, this.cacheService, userId, locale);

    logger.info('Created tools for agent', {
      toolCount: tools.length,
      toolNames: tools.map(t => t.name),
      locale,
    });

    // Bind tools to model
    const modelWithTools = model.bindTools(tools);

    // Create tool node
    const toolNode = new ToolNode(tools);

    // Define the graph
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await modelWithTools.invoke(state.messages);
      logger.debug('Model response', {
        hasToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
        toolCallsCount: response.tool_calls?.length || 0,
        contentLength: typeof response.content === 'string' ? response.content.length : 0,
      });
      return { messages: [response] };
    };

    // Router function to decide if we should continue to tools or end
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      // Check if it's an AIMessage with tool calls
      if (lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tools';
      }
      return END;
    };

    // Build the graph with recursion limit
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('agent', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue, ['tools', END])
      .addEdge('tools', 'agent');

    // Compile with recursion limit to prevent infinite loops
    const graph = workflow.compile();

    // Convert existing messages to LangChain format
    const langchainMessages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      ...existingMessages.map(msg => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new HumanMessage(msg.content);
      }),
      new HumanMessage(userMessage),
    ];

    // Run the graph with recursion limit
    const result = await graph.invoke(
      { messages: langchainMessages },
      { recursionLimit: 10 }
    );

    // Extract final response and tools used
    const toolsUsed: string[] = [];
    let finalResponse = '';

    for (const message of result.messages) {
      if (message instanceof AIMessage) {
        if (message.tool_calls && message.tool_calls.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolsUsed.push(...message.tool_calls.map((tc: any) => tc.name));
        }
        // Handle both string content and array content (Anthropic format)
        if (message.content) {
          if (typeof message.content === 'string') {
            finalResponse = message.content;
          } else if (Array.isArray(message.content)) {
            // Extract text from content blocks
            const textContent = message.content
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((block: any) => block.type === 'text')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((block: any) => block.text)
              .join('');
            if (textContent) {
              finalResponse = textContent;
            }
          }
        }
      }
    }

    return {
      response: finalResponse,
      toolsUsed: [...new Set(toolsUsed)],
    };
  }

  /**
   * Create the LLM model based on provider
   */
  private createModel(provider: LLMProvider) {
    const config = DEFAULT_LLM_CONFIG[provider];

    if (provider === 'anthropic') {
      return new ChatAnthropic({
        modelName: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    return new ChatOpenAI({
      modelName: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // ============================================
  // PRIVATE METHODS - HELPERS
  // ============================================

  /**
   * Get conversation by ID with user authorization
   */
  private async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<AIConversation | null> {
    return this.prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
    });
  }
}
