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
import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { WFirmaIntegrationService } from './wfirma-integration.service';
import { WFirmaCacheService } from './wfirma-cache.service';
import {
  LLMProvider,
  ChatMessage,
  AIConversationData,
  ConversationListItem,
  ProcessMessageResult,
  DEFAULT_LLM_CONFIG,
  ConversationGraphState,
} from '../types/ai-chat.types';
import { WFirmaCompany, FinancialData } from '../types/wfirma.types';

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are an expert accountant specializing in Polish tax law and accounting for IT companies.

## Language Rules
- DETECT the user's language from their message
- ALWAYS respond in the SAME language the user wrote in
- Supported languages: Polish (pl), English (en), Russian (ru)
- If unsure, default to Polish

## Areas of Expertise
- VAT: rates (23%, 8%, 5%, 0%), JPK reporting, deductions, reverse charge, EU transactions, OSS
- PIT: tax scales (12%/32%), flat 19%, lump sum (ryczałt), IP Box for IT (5%)
- CIT: Estonian CIT, 9%/19% rates, deductible expenses
- ZUS: entrepreneur contributions, "mały ZUS", "mały ZUS plus", startup relief (ulga na start)
- B2B: contracts, invoices, settlements with foreign clients, currency exchange
- Invoices: formal requirements, corrections, split payment, white list verification
- Deadlines: VAT-7 (25th), JPK_V7 (25th), PIT (30th April), advance payments

## Response Guidelines
1. Be professional but friendly
2. Use wFirma tools when you need user's data (company info, contractors, invoices, financials)
3. Cite legal bases when possible (e.g., "Art. 86 ustawy o VAT", "Art. 22 ustawy o PIT")
4. Warn about deadlines and potential risks
5. For complex matters, recommend consulting a certified accountant (księgowy) or tax advisor (doradca podatkowy)
6. Use proper terminology in the user's language
7. When showing financial data, format numbers with spaces as thousands separator (e.g., 10 000 PLN)

## Important Notes
- Current VAT rates in Poland: 23% (standard), 8% (reduced), 5% (reduced), 0% (export, intra-EU)
- Minimum wage 2024: 4242 PLN gross (January-June), 4300 PLN (July-December)
- IP Box rate: 5% for qualified IP income
- Estonian CIT: no tax on retained earnings, only on distribution`;

// ============================================
// AI CHAT SERVICE CLASS
// ============================================

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
    const conversationTitle = title || this.generateConversationTitle();

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
      newTitle = this.generateTitleFromMessage(content);
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

    // Create tools with userId bound
    const tools = this.createTools(userId);

    // Bind tools to model
    const modelWithTools = model.bindTools(tools);

    // Create tool node
    const toolNode = new ToolNode(tools);

    // Define the graph
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await modelWithTools.invoke(state.messages);
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
      { recursionLimit: 10 } // Limit iterations to prevent infinite loops
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

  /**
   * Create LangChain tools for wFirma integration
   * Note: Using type assertion due to LangChain's deep recursive generics causing TS2589
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createTools(userId: string): StructuredToolInterface[] {
    const wfirmaService = this.wfirmaService;
    const cacheService = this.cacheService;

    // Get company info tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCompanyInfoTool: StructuredToolInterface = (tool as any)(
      async () => {
        try {
          const cached = await cacheService.getCachedData<WFirmaCompany>(
            userId,
            'company',
            'default'
          );

          if (cached) {
            return formatCompanyInfo(cached);
          }

          const companyData = await wfirmaService.getCompanyData();
          await cacheService.cacheData(userId, 'company', 'default', companyData);
          return formatCompanyInfo(companyData);
        } catch (error) {
          logger.error('Failed to get company info', { error });
          return 'Error: Failed to fetch company data from wFirma';
        }
      },
      {
        name: 'get_company_info',
        description: 'Get company information from wFirma (name, NIP, address, bank accounts). Use when user asks about their company data.',
        schema: z.object({}),
      }
    );

    // Get contractors tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getContractorsTool: StructuredToolInterface = (tool as any)(
      async ({ search, nip, limit }: { search?: string; nip?: string; limit?: number }) => {
        try {
          const contractors = await wfirmaService.getContractors({
            search,
            nip,
            limit: limit || 10,
          });

          if (contractors.length === 0) {
            return 'No contractors found.';
          }

          return `Found ${contractors.length} contractors:\n` +
            contractors.slice(0, 10).map((c, i) =>
              `${i + 1}. ${c.name}${c.nip ? ` (NIP: ${c.nip})` : ''}${c.email ? ` - ${c.email}` : ''}`
            ).join('\n');
        } catch (error) {
          logger.error('Failed to get contractors', { error });
          return 'Error: Failed to fetch contractors from wFirma';
        }
      },
      {
        name: 'get_contractors',
        description: 'Get list of contractors/customers from wFirma. Can filter by name or NIP. Use when user asks about their clients or contractors.',
        schema: z.object({
          search: z.string().optional().describe('Search by contractor name'),
          nip: z.string().optional().describe('Filter by NIP number'),
          limit: z.number().optional().describe('Maximum number of results (default 10)'),
        }),
      }
    );

    // Get financial summary tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFinancialSummaryTool: StructuredToolInterface = (tool as any)(
      async ({ year }: { year: number }) => {
        try {
          const cacheKey = `financial_${year}`;
          const cached = await cacheService.getCachedData<FinancialData>(
            userId,
            'financial',
            cacheKey
          );

          if (cached) {
            return formatFinancialData(cached);
          }

          const financialData = await wfirmaService.getFinancialData(year);
          await cacheService.cacheData(userId, 'financial', cacheKey, financialData);
          return formatFinancialData(financialData);
        } catch (error) {
          logger.error('Failed to get financial summary', { error });
          return 'Error: Failed to fetch financial data from wFirma';
        }
      },
      {
        name: 'get_financial_summary',
        description: 'Get financial summary for a specific year (revenue, expenses, profit). Use when user asks about their income, expenses, or profit.',
        schema: z.object({
          year: z.number().describe('Fiscal year (e.g., 2024)'),
        }),
      }
    );

    return [getCompanyInfoTool, getContractorsTool, getFinancialSummaryTool];
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

  /**
   * Generate a default conversation title
   */
  private generateConversationTitle(): string {
    const now = new Date();
    return `Chat ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /**
   * Generate title from first message
   */
  private generateTitleFromMessage(message: string): string {
    const truncated = message.substring(0, 50);
    return truncated.length < message.length ? `${truncated}...` : truncated;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCompanyInfo(company: WFirmaCompany): string {
  return `Company Information:
- Name: ${company.name}
- NIP: ${company.nip}
${company.regon ? `- REGON: ${company.regon}` : ''}
${company.krs ? `- KRS: ${company.krs}` : ''}
- Address: ${company.address.street}, ${company.address.zip} ${company.address.city}, ${company.address.country}
${company.bankAccounts.length > 0 ? `- Bank Account: ${company.bankAccounts[0].accountNumber} (${company.bankAccounts[0].bankName})` : ''}
${company.email ? `- Email: ${company.email}` : ''}
${company.phone ? `- Phone: ${company.phone}` : ''}`;
}

function formatFinancialData(data: FinancialData): string {
  const formatNumber = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2 });
  return `Financial Summary for ${data.year}:
- Revenue: ${formatNumber(data.revenue)} PLN
- Expenses: ${formatNumber(data.expenses)} PLN
- Profit: ${formatNumber(data.profit)} PLN
- Tax Paid: ${formatNumber(data.taxPaid)} PLN
${data.vatPaid !== undefined ? `- VAT Paid: ${formatNumber(data.vatPaid)} PLN` : ''}
${data.pitPaid !== undefined ? `- PIT Paid: ${formatNumber(data.pitPaid)} PLN` : ''}
${data.zusPaid !== undefined ? `- ZUS Paid: ${formatNumber(data.zusPaid)} PLN` : ''}`;
}
