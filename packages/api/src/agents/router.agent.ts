/**
 * Router Agent
 * Main orchestrator that routes requests to specialized agents
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { logger } from '../utils/logger';
import {
  AgentType,
  AgentContext,
  AgentResult,
  RouterDecision,
  Locale,
} from './types';
import { ContractorAgent } from './contractor.agent';
import { FinancialAgent } from './financial.agent';
import { InvoiceAgent } from './invoice.agent';
import { TaxAgent } from './tax.agent';
import { LLMProvider } from './base.agent';

const ROUTING_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś routerem, który klasyfikuje zapytania użytkownika i kieruje je do odpowiedniego specjalisty.

Dostępni specjaliści:
- **contractor**: zarządzanie kontrahentami (dodawanie, edycja, usuwanie, wyszukiwanie)
- **financial**: analiza finansowa, raporty, dane firmy, porównania lat
- **invoice**: faktury, należności, zobowiązania, płatności
- **tax**: podatki (VAT, PIT, CIT), ZUS, terminy, kalkulacje podatkowe

Przeanalizuj zapytanie i zwróć JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "krótkie wyjaśnienie wyboru"
}

Jeśli zapytanie jest ogólne lub dotyczy wielu tematów, użyj "router".`,

  en: `You are a router that classifies user queries and routes them to the appropriate specialist.

Available specialists:
- **contractor**: contractor management (add, edit, delete, search)
- **financial**: financial analysis, reports, company data, year comparisons
- **invoice**: invoices, receivables, payables, payments
- **tax**: taxes (VAT, PIT, CIT), ZUS, deadlines, tax calculations

Analyze the query and return JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of choice"
}

If the query is general or covers multiple topics, use "router".`,

  ru: `Вы маршрутизатор, который классифицирует запросы пользователей и направляет их соответствующему специалисту.

Доступные специалисты:
- **contractor**: управление контрагентами (добавление, редактирование, удаление, поиск)
- **financial**: финансовый анализ, отчеты, данные компании, сравнение лет
- **invoice**: счета-фактуры, дебиторская задолженность, платежи
- **tax**: налоги (НДС, ПИТ, ЦИТ), ЗУС, сроки, налоговые расчеты

Проанализируйте запрос и верните JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "краткое объяснение выбора"
}

Если запрос общий или охватывает несколько тем, используйте "router".`,
};

// General system prompt for when router handles the query directly
const GENERAL_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś ekspertem ds. księgowości specjalizującym się w polskim prawie podatkowym dla firm IT.

## Obszary ekspertyzy:
- VAT, PIT, CIT, ZUS
- Faktury i kontrahenci
- Optymalizacja podatkowa (IP Box)
- Terminy i compliance

## Zasady:
- Odpowiadaj w języku użytkownika
- Używaj tabel markdown
- Podawaj podstawy prawne
- Sugeruj optymalizacje`,

  en: `You are an accounting expert specializing in Polish tax law for IT companies.

## Areas of expertise:
- VAT, PIT, CIT, ZUS
- Invoices and contractors
- Tax optimization (IP Box)
- Deadlines and compliance

## Rules:
- Respond in the user's language
- Use markdown tables
- Cite legal bases
- Suggest optimizations`,

  ru: `Вы эксперт по бухгалтерии, специализирующийся на польском налоговом праве для IT-компаний.

## Области экспертизы:
- НДС, ПИТ, ЦИТ, ЗУС
- Счета-фактуры и контрагенты
- Налоговая оптимизация (IP Box)
- Сроки и compliance

## Правила:
- Отвечайте на языке пользователя
- Используйте markdown таблицы
- Указывайте правовые основания
- Предлагайте оптимизации`,
};

export class RouterAgent {
  readonly name: AgentType = 'router';
  readonly description = 'Main orchestrator that routes requests to specialized agents';

  private provider: LLMProvider;
  private agents: Map<AgentType, ContractorAgent | FinancialAgent | InvoiceAgent | TaxAgent>;

  constructor(provider: LLMProvider = 'openai') {
    this.provider = provider;
    this.agents = new Map();

    // Initialize specialized agents
    this.agents.set('contractor', new ContractorAgent(provider));
    this.agents.set('financial', new FinancialAgent(provider));
    this.agents.set('invoice', new InvoiceAgent(provider));
    this.agents.set('tax', new TaxAgent(provider));
  }

  /**
   * Create LLM for routing decisions
   */
  private createRoutingModel(): ChatOpenAI | ChatAnthropic {
    // Use a faster/cheaper model for routing
    if (this.provider === 'anthropic') {
      return new ChatAnthropic({
        modelName: 'claude-3-haiku-20240307', // Fast model for routing
        maxTokens: 256,
        temperature: 0,
      });
    }

    return new ChatOpenAI({
      modelName: 'gpt-3.5-turbo', // Fast model for routing
      maxTokens: 256,
      temperature: 0,
    });
  }

  /**
   * Create LLM for general responses
   */
  private createGeneralModel(): ChatOpenAI | ChatAnthropic {
    if (this.provider === 'anthropic') {
      return new ChatAnthropic({
        modelName: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7,
      });
    }

    return new ChatOpenAI({
      modelName: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  /**
   * Route a message to the appropriate agent
   */
  async route(userMessage: string, context: AgentContext): Promise<RouterDecision> {
    const model = this.createRoutingModel();
    const routingPrompt = ROUTING_PROMPTS[context.locale] || ROUTING_PROMPTS.pl;

    try {
      const response = await model.invoke([
        new SystemMessage(routingPrompt),
        new HumanMessage(userMessage),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]) as RouterDecision;
        logger.info('Router decision', {
          userMessage: userMessage.substring(0, 100),
          decision,
        });
        return decision;
      }

      // Fallback to keyword-based routing
      return this.keywordRoute(userMessage, context.locale);
    } catch (error) {
      logger.warn('Router LLM failed, using keyword routing', { error });
      return this.keywordRoute(userMessage, context.locale);
    }
  }

  /**
   * Keyword-based routing fallback
   */
  private keywordRoute(message: string, _locale: Locale): RouterDecision {
    const lowerMessage = message.toLowerCase();

    // Contractor keywords
    const contractorKeywords = [
      'контрагент', 'contractor', 'kontrahent', 'customer', 'client', 'klient',
      'dodaj', 'add', 'создай', 'usuń', 'delete', 'удали', 'edytuj', 'edit', 'редактируй',
    ];
    if (contractorKeywords.some(kw => lowerMessage.includes(kw))) {
      return { targetAgent: 'contractor', confidence: 0.8, reasoning: 'Keyword match: contractor' };
    }

    // Invoice keywords
    const invoiceKeywords = [
      'faktur', 'invoice', 'счет', 'należnoś', 'receivable', 'дебитор', 'płatnoś', 'payment', 'платеж',
    ];
    if (invoiceKeywords.some(kw => lowerMessage.includes(kw))) {
      return { targetAgent: 'invoice', confidence: 0.8, reasoning: 'Keyword match: invoice' };
    }

    // Tax keywords
    const taxKeywords = [
      'vat', 'pit', 'cit', 'zus', 'podatek', 'tax', 'налог', 'termin', 'deadline', 'срок',
      'ip box', 'ryczałt', 'liniowy', 'skala',
    ];
    if (taxKeywords.some(kw => lowerMessage.includes(kw))) {
      return { targetAgent: 'tax', confidence: 0.8, reasoning: 'Keyword match: tax' };
    }

    // Financial keywords
    const financialKeywords = [
      'finans', 'financ', 'финанс', 'przychod', 'revenue', 'выручк', 'koszt', 'expense', 'расход',
      'zysk', 'profit', 'прибыль', 'firma', 'company', 'компани', 'raport', 'report', 'отчет',
    ];
    if (financialKeywords.some(kw => lowerMessage.includes(kw))) {
      return { targetAgent: 'financial', confidence: 0.8, reasoning: 'Keyword match: financial' };
    }

    // Default to router for general questions
    return { targetAgent: 'router', confidence: 0.5, reasoning: 'No specific keyword match' };
  }

  /**
   * Process a message - routes to specialized agent or handles directly
   */
  async process(
    existingMessages: BaseMessage[],
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResult> {
    const startTime = Date.now();

    // Get routing decision
    const decision = await this.route(userMessage, context);

    // If confidence is high and not router, delegate to specialized agent
    if (decision.targetAgent !== 'router' && decision.confidence >= 0.7) {
      const agent = this.agents.get(decision.targetAgent);
      if (agent) {
        logger.info(`Routing to ${decision.targetAgent} agent`, { decision });
        return agent.process(existingMessages, userMessage, context);
      }
    }

    // Handle directly with general model
    logger.info('Router handling query directly', { decision });
    return this.handleDirectly(existingMessages, userMessage, context, startTime);
  }

  /**
   * Handle the query directly without specialized agent
   */
  private async handleDirectly(
    existingMessages: BaseMessage[],
    userMessage: string,
    context: AgentContext,
    startTime: number
  ): Promise<AgentResult> {
    const model = this.createGeneralModel();
    const systemPrompt = GENERAL_PROMPTS[context.locale] || GENERAL_PROMPTS.pl;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...existingMessages,
      new HumanMessage(userMessage),
    ];

    const response = await model.invoke(messages);
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    return {
      response: content,
      toolsUsed: [],
      agentType: 'router',
      metadata: {
        duration: Date.now() - startTime,
        provider: this.provider,
        handledDirectly: true,
      },
    };
  }

  /**
   * Get all available agents
   */
  getAgents(): Map<AgentType, ContractorAgent | FinancialAgent | InvoiceAgent | TaxAgent> {
    return this.agents;
  }

  /**
   * Get agent by type
   */
  getAgent(type: AgentType): ContractorAgent | FinancialAgent | InvoiceAgent | TaxAgent | undefined {
    return this.agents.get(type);
  }
}

// Singleton instance
let routerAgentInstance: RouterAgent | null = null;

export function getRouterAgent(provider: LLMProvider = 'openai'): RouterAgent {
  if (!routerAgentInstance) {
    routerAgentInstance = new RouterAgent(provider);
  }
  return routerAgentInstance;
}
