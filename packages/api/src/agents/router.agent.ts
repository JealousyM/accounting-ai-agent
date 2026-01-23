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
  pl: `Jesteś inteligentnym routerem, który analizuje zapytania użytkownika i kieruje je do najbardziej odpowiedniego specjalisty.

## Dostępni specjaliści:

**contractor** - Zarządzanie kontrahentami i klientami
- Wyszukiwanie, dodawanie, edycja, usuwanie kontrahentów
- Weryfikacja NIP, REGON
- Aktualizacja danych kontaktowych

**financial** - Analiza finansowa i raporty
- Przychody, koszty, zyski
- Porównania okresów (rok do roku, miesiąc do miesiąca)
- Dane firmy (NIP, REGON, konta bankowe)
- Wskaźniki finansowe

**invoice** - Operacje na fakturach
- Wystawianie, edycja, usuwanie faktur
- Wyszukiwanie faktur (po okresie, statusie)
- Płatności i należności
- Wysyłka faktur do kontrahentów
- Pobieranie PDF

**tax** - Podatki i optymalizacja podatkowa
- Kalkulacje VAT, PIT, CIT
- ZUS, składki zdrowotne
- Terminy płatności
- IP Box dla IT, estoński CIT
- Optymalizacja podatkowa

**router** - Ogólne pytania o księgowość
- Pytania teoretyczne o prawo podatkowe
- Pytania dotyczące wielu obszarów jednocześnie
- Ogólne porady księgowe

## Instrukcje routingu:

1. Jeśli zapytanie dotyczy **jednego konkretnego obszaru** → wybierz odpowiedniego specjalistę (confidence 0.8-1.0)
2. Jeśli zapytanie dotyczy **2-3 obszarów** → wybierz najbardziej dominujący (confidence 0.6-0.8)
3. Jeśli zapytanie jest **ogólne lub teoretyczne** → użyj "router" (confidence 0.5-0.7)
4. W przypadku **wątpliwości** → użyj "router"

## Przykłady:
- "Dodaj nowego kontrahenta XYZ" → contractor (confidence: 0.95)
- "Pokaż faktury z grudnia" → invoice (confidence: 0.9)
- "Ile wynosi VAT od 1000 PLN?" → tax (confidence: 0.85)
- "Jakie były przychody w 2025?" → financial (confidence: 0.9)
- "Pokaż faktury i oblicz VAT do zapłaty" → tax (confidence: 0.7) - dominuje kalkulacja VAT
- "Co to jest JPK_V7?" → router (confidence: 0.6) - pytanie teoretyczne

Zwróć JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "krótkie wyjaśnienie wyboru (1 zdanie)"
}`,

  en: `You are an intelligent router that analyzes user queries and routes them to the most appropriate specialist.

## Available specialists:

**contractor** - Contractor and client management
- Search, add, edit, delete contractors
- NIP, REGON verification
- Contact data updates

**financial** - Financial analysis and reports
- Revenue, costs, profits
- Period comparisons (year-over-year, month-over-month)
- Company data (NIP, REGON, bank accounts)
- Financial metrics

**invoice** - Invoice operations
- Create, edit, delete invoices
- Search invoices (by period, status)
- Payments and receivables
- Send invoices to contractors
- Download PDF

**tax** - Taxes and tax optimization
- VAT, PIT, CIT calculations
- ZUS, health contributions
- Payment deadlines
- IP Box for IT, Estonian CIT
- Tax optimization

**router** - General accounting questions
- Theoretical tax law questions
- Questions covering multiple areas
- General accounting advice

## Routing instructions:

1. If query concerns **one specific area** → choose appropriate specialist (confidence 0.8-1.0)
2. If query concerns **2-3 areas** → choose the most dominant one (confidence 0.6-0.8)
3. If query is **general or theoretical** → use "router" (confidence 0.5-0.7)
4. If **in doubt** → use "router"

## Examples:
- "Add new contractor XYZ" → contractor (confidence: 0.95)
- "Show invoices from December" → invoice (confidence: 0.9)
- "What's the VAT on 1000 PLN?" → tax (confidence: 0.85)
- "What was revenue in 2025?" → financial (confidence: 0.9)
- "Show invoices and calculate VAT due" → tax (confidence: 0.7) - VAT calculation dominates
- "What is JPK_V7?" → router (confidence: 0.6) - theoretical question

Return JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of choice (1 sentence)"
}`,

  ru: `Вы интеллектуальный маршрутизатор, который анализирует запросы пользователей и направляет их наиболее подходящему специалисту.

## Доступные специалисты:

**contractor** - Управление контрагентами и клиентами
- Поиск, добавление, редактирование, удаление контрагентов
- Проверка NIP, REGON
- Обновление контактных данных

**financial** - Финансовый анализ и отчеты
- Выручка, расходы, прибыль
- Сравнение периодов (год к году, месяц к месяцу)
- Данные компании (NIP, REGON, банковские счета)
- Финансовые показатели

**invoice** - Операции со счетами-фактурами
- Выставление, редактирование, удаление счетов
- Поиск счетов (по периоду, статусу)
- Платежи и дебиторская задолженность
- Отправка счетов контрагентам
- Скачивание PDF

**tax** - Налоги и налоговая оптимизация
- Расчеты НДС, ПИТ, ЦИТ
- ЗУС, медицинские взносы
- Сроки платежей
- IP Box для IT, эстонский ЦИТ
- Налоговая оптимизация

**router** - Общие вопросы о бухгалтерии
- Теоретические вопросы о налоговом праве
- Вопросы, касающиеся нескольких областей
- Общие бухгалтерские советы

## Инструкции по маршрутизации:

1. Если запрос касается **одной конкретной области** → выберите соответствующего специалиста (confidence 0.8-1.0)
2. Если запрос касается **2-3 областей** → выберите наиболее доминирующую (confidence 0.6-0.8)
3. Если запрос **общий или теоретический** → используйте "router" (confidence 0.5-0.7)
4. В случае **сомнений** → используйте "router"

## Примеры:
- "Добавить нового контрагента XYZ" → contractor (confidence: 0.95)
- "Показать счета за декабрь" → invoice (confidence: 0.9)
- "Сколько НДС с 1000 PLN?" → tax (confidence: 0.85)
- "Какая была выручка в 2025?" → financial (confidence: 0.9)
- "Показать счета и рассчитать НДС к уплате" → tax (confidence: 0.7) - доминирует расчет НДС
- "Что такое JPK_V7?" → router (confidence: 0.6) - теоретический вопрос

Верните JSON:
{
  "targetAgent": "contractor" | "financial" | "invoice" | "tax" | "router",
  "confidence": 0.0-1.0,
  "reasoning": "краткое объяснение выбора (1 предложение)"
}`,
};

import { buildSystemPrompt } from '../services/ai-chat/prompt-fragments';

// General system prompt for when router handles the query directly
const GENERAL_PROMPTS: Record<Locale, string> = {
  pl: buildSystemPrompt(
    `Jesteś ekspertem ds. księgowości specjalizującym się w polskim prawie podatkowym dla firm IT.

## Twoje obszary ekspertyzy:
- **VAT:** stawki, JPK_V7, odwrotne obciążenie, transakcje UE
- **PIT:** skale podatkowe, IP Box 5% dla IT, optymalizacja
- **CIT:** estoński CIT, stawki 9%/19%, ulgi dla małych firm
- **ZUS:** składki przedsiębiorcy, mały ZUS Plus, ulga na start
- **Faktury:** wystawianie, korekty, mechanizm podzielonej płatności
- **Kontrahenci:** zarządzanie danymi, weryfikacja NIP/REGON
- **Terminy:** VAT-7 (25.), PIT (20./30.04), ZUS (15.)
- **Compliance:** przestrzeganie przepisów, unikanie kar`,
    'pl',
    { includeToolGuidelines: true, includeTaxData: true }
  ),

  en: buildSystemPrompt(
    `You are an accounting expert specializing in Polish tax law for IT companies.

## Your areas of expertise:
- **VAT:** rates, JPK_V7, reverse charge, EU transactions
- **PIT:** tax scales, IP Box 5% for IT, optimization
- **CIT:** Estonian CIT, rates 9%/19%, small business benefits
- **ZUS:** entrepreneur contributions, small ZUS Plus, startup relief
- **Invoices:** issuing, corrections, split payment mechanism
- **Contractors:** data management, NIP/REGON verification
- **Deadlines:** VAT-7 (25th), PIT (20th/Apr 30), ZUS (15th)
- **Compliance:** regulatory adherence, penalty avoidance`,
    'en',
    { includeToolGuidelines: true, includeTaxData: true }
  ),

  ru: buildSystemPrompt(
    `Вы эксперт по бухгалтерии, специализирующийся на польском налоговом праве для IT-компаний.

## Ваши области экспертизы:
- **НДС:** ставки, JPK_V7, обратное начисление, операции ЕС
- **ПИТ:** налоговые шкалы, IP Box 5% для IT, оптимизация
- **ЦИТ:** эстонский ЦИТ, ставки 9%/19%, льготы для малого бизнеса
- **ЗУС:** взносы предпринимателя, малый ЗУС Плюс, льгота на старт
- **Счета:** выставление, исправления, механизм раздельного платежа
- **Контрагенты:** управление данными, проверка NIP/REGON
- **Сроки:** VAT-7 (25-е), ПИТ (20-е/30.04), ЗУС (15-е)
- **Комплаенс:** соблюдение норм, избежание штрафов`,
    'ru',
    { includeToolGuidelines: true, includeTaxData: true }
  ),
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
