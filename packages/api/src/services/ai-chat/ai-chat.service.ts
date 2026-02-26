/**
 * AI Chat Service
 * Provides AI-powered accounting chat with wFirma integration
 * Built with LangChain, LangGraph, and LangSmith
 */

import { PrismaClient, AIConversation } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { traceable } from 'langsmith/traceable';
import { logger } from '../../utils/logger';
import { WFirmaIntegrationService } from '../wfirma';
import { WFirmaCacheService } from '../wfirma-cache.service';
import { FileStorageService } from '../file-storage.service';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { CredentialsService } from '../credentials.service';
import { subscriptionService } from '../subscription.instance';
import {
  LLMProvider,
  ChatMessage,
  AIConversationData,
  ConversationListItem,
  ProcessMessageResult,
  DEFAULT_LLM_CONFIG,
  ConversationGraphState,
  Locale,
  TTSMetadata,
} from '../../types/ai-chat.types';

// Import from local modules
import { getSystemPrompt } from './constants';
import { detectLocale, generateConversationTitle, generateTitleFromMessage } from './utils';
import { createAllTools } from './tools';
import { TTSIntegration } from './tts-integration';
import { ttsService } from '../tts.instance';
import { hrService } from '../hr/hr.instance';
import { ksefService } from '../ksef/ksef.instance';
import { ksefContractorService } from '../ksef/contractor.instance';
import { AIMemoryService } from '../ai-memory/ai-memory.service';
import { AIMemoryExtractionService } from '../ai-memory/memory-extraction.service';

export class AIChatService {
  private readonly prisma: PrismaClient;
  private readonly wfirmaService: WFirmaIntegrationService;
  private readonly cacheService: WFirmaCacheService;
  private readonly fileStorageService: FileStorageService;
  private readonly wfirmaFactory: WFirmaServiceFactory;
  private readonly credentialsService: CredentialsService;
  private readonly defaultProvider: LLMProvider;
  private readonly ttsIntegration: TTSIntegration;
  private readonly memoryService?: AIMemoryService;
  private readonly memoryExtractionService?: AIMemoryExtractionService;

  constructor(
    prisma: PrismaClient,
    wfirmaService: WFirmaIntegrationService,
    cacheService: WFirmaCacheService,
    fileStorageService: FileStorageService,
    wfirmaFactory?: WFirmaServiceFactory,
    credentialsService?: CredentialsService,
    memoryService?: AIMemoryService,
    memoryExtractionService?: AIMemoryExtractionService
  ) {
    this.prisma = prisma;
    this.wfirmaService = wfirmaService;
    this.cacheService = cacheService;
    this.fileStorageService = fileStorageService;
    this.wfirmaFactory = wfirmaFactory!;
    this.credentialsService = credentialsService!;
    this.memoryService = memoryService;
    this.memoryExtractionService = memoryExtractionService;
    this.ttsIntegration = new TTSIntegration(ttsService, prisma);

    // Set default provider (used only as fallback, credentials come from DB)
    this.defaultProvider = 'openai';

    // Check for LangSmith tracing
    if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
      logger.info('LangSmith tracing enabled');
    }

    logger.info('AIChatService initialized with LangGraph', {
      defaultProvider: this.defaultProvider,
      databaseStorageOnly: true,
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
   * Wrapped with traceable for full LangSmith visibility (including TTS)
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    provider?: LLMProvider
  ): Promise<ProcessMessageResult> {
    // Wrap entire message processing in traceable for unified LangSmith trace
    const processMessage = traceable(
      async (): Promise<ProcessMessageResult> => {
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
        const { response, toolsUsed, actualProvider, actualModel, locale } = await this.runAgent(
          existingMessages,
          content,
          userId,
          conversationId,
          selectedProvider
        );

        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          metadata: {
            provider: actualProvider,
            model: actualModel,
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

        // Extract memories from conversation (fire-and-forget, no latency impact)
        if (this.memoryExtractionService) {
          this.memoryExtractionService.extractFromConversation(
            userId, conversationId, content, response, toolsUsed, locale
          ).catch(err => logger.warn('Memory extraction failed', { err, conversationId }));
        }

        // Generate TTS for AI response (within same trace context)
        let tts: TTSMetadata | undefined;
        try {
          tts = await this.ttsIntegration.generateForResponse(userId, response, locale);
        } catch (error) {
          logger.warn('TTS integration failed', { error, conversationId, userId });
        }

        return {
          userMessage,
          assistantMessage,
          toolsUsed,
          tts,
        };
      },
      {
        name: 'ai_chat_message',
        run_type: 'chain',
        metadata: {
          conversationId,
          userId,
          provider: provider || this.defaultProvider,
        },
        tags: [`conv:${conversationId}`, `user:${userId}`],
      }
    );

    return processMessage();
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
    conversationId: string,
    _provider: LLMProvider
  ): Promise<{ response: string; toolsUsed: string[]; actualProvider: LLMProvider; actualModel: string; locale: Locale }> {
    // Get user's LLM credentials from database (REQUIRED)
    if (!this.credentialsService) {
      throw new Error('Credentials service not available');
    }

    const userCreds = await this.credentialsService.getLLMCredentials(userId);

    if (!userCreds || !userCreds.apiKey) {
      throw new Error('No LLM API key configured. Please add your API key in Settings → API Credentials.');
    }

    // Use the provider from user's credentials (ignore the provider parameter if different)
    const selectedProvider = userCreds.provider;
    const apiKey = userCreds.apiKey;
    const selectedModel = userCreds.model;

    logger.debug('Using user-specific LLM credentials from database', {
      userId,
      provider: selectedProvider,
      model: selectedModel,
    });

    // Create the LLM based on provider (with REQUIRED user API key)
    const model = this.createModel(selectedProvider, apiKey, selectedModel);

    // Get user-specific wFirma service if available
    let wfirmaService = this.wfirmaService;
    if (this.wfirmaFactory) {
      wfirmaService = await this.wfirmaFactory.getServiceForUser(userId);
    }

    // Detect user's language for localized tool responses
    const locale = detectLocale(userMessage);

    // Load user's context memory for prompt injection
    let memoryContext: string | undefined;
    if (this.memoryService) {
      try {
        memoryContext = await this.memoryService.buildMemoryPromptFragment(userId, locale);
      } catch (err) {
        logger.warn('Failed to load memory context', { err, userId });
      }
    }

    // Get system prompt with user's language and memory context
    const systemPrompt = getSystemPrompt(locale, memoryContext);

    // Create tools with userId, locale, and subscription tracking
    const tools = createAllTools(wfirmaService, this.cacheService, this.fileStorageService, userId, locale, subscriptionService, hrService, ksefService, ksefContractorService);

    logger.info('Created tools for agent', {
      toolCount: tools.length,
      toolNames: tools.map(t => t.name),
      locale,
    });

    // Bind tools to model
    const modelWithTools = model.bindTools(tools);

    // Create tool node - use the same tools that were bound to the model
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

    // Convert existing messages to LangChain format with localized system prompt
    const langchainMessages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...existingMessages.map(msg => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new HumanMessage(msg.content);
      }),
      new HumanMessage(userMessage),
    ];

    // Run the graph with recursion limit and LangSmith metadata for cost tracking
    const recursionLimit = 25;

    const result = await graph.invoke(
      { messages: langchainMessages },
      {
        recursionLimit,
        metadata: {
          conversationId,
          userId,
        },
        tags: [`conv:${conversationId}`, `user:${userId}`],
      }
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
        // Handle both string content and array content
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

    // Determine the actual model used (either user's selected model or config default)
    const actualModel = selectedModel || DEFAULT_LLM_CONFIG[selectedProvider].model;

    return {
      response: finalResponse,
      toolsUsed: [...new Set(toolsUsed)],
      actualProvider: selectedProvider,
      actualModel,
      locale,
    };
  }

  /**
   * Create the LLM model based on provider
   * @param provider The LLM provider (openai or google)
   * @param apiKey User's API key from database (REQUIRED)
   * @param model Optional model name (uses default from config if not provided)
   */
  private createModel(provider: LLMProvider, apiKey: string, model?: string) {
    const config = DEFAULT_LLM_CONFIG[provider];
    const modelToUse = model || config.model;

    if (!apiKey) {
      throw new Error(`No API key provided for provider: ${provider}`);
    }

    if (provider === 'google') {
      return new ChatGoogleGenerativeAI({
        model: modelToUse,
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
        apiKey: apiKey,
      });
    }

    // Default: OpenAI
    // Note: Newer models (gpt-5, o1, o3) have restrictions:
    // - Use max_completion_tokens instead of max_tokens
    // - Only support temperature=1 (default)
    const isNewerModel = modelToUse.startsWith('gpt-5') ||
      modelToUse.startsWith('o1') ||
      modelToUse.startsWith('o3');

    if (isNewerModel) {
      // For newer models, don't set maxTokens or temperature - use defaults
      return new ChatOpenAI({
        modelName: modelToUse,
        openAIApiKey: apiKey,
      });
    }

    return new ChatOpenAI({
      modelName: modelToUse,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      openAIApiKey: apiKey,
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
