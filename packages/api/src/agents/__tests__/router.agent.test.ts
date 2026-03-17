// packages/api/src/agents/__tests__/router.agent.test.ts
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentContext, AgentResult, RouterDecision } from '../types';
import { LLMProvider } from '../base.agent';

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// Mock logger to silence output and capture calls
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --- Mock LangChain models ---------------------------------------------------
const mockOpenAIInvoke = jest.fn();
const mockAnthropicInvoke = jest.fn();

class MockChatModel {
  public args: unknown;
  constructor(args: unknown) {
    this.args = args;
  }
  invoke = mockOpenAIInvoke; // will be reassigned per-test if needed
  // Methods used by BaseAgent when tools are bound
  bindTools = jest.fn().mockReturnThis();
}

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((args) => new MockChatModel(args)),
}));

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation((args) => new MockChatModel(args)),
}));

// --- Mock specialised agents -------------------------------------------------
const createAgentMock = (name: string) => {
  const process = jest.fn().mockResolvedValue({
    response: `${name} response`,
    toolsUsed: [],
    agentType: name as never,
    metadata: {},
  } as AgentResult);
  const Constructor = jest.fn().mockImplementation(() => ({ process }));
  return { Constructor, process };
};

const contractorAgentMock = createAgentMock('contractor');
const financialAgentMock = createAgentMock('financial');
const invoiceAgentMock = createAgentMock('invoice');
const taxAgentMock = createAgentMock('tax');

jest.mock('../contractor.agent', () => ({
  ContractorAgent: contractorAgentMock.Constructor,
}));
jest.mock('../financial.agent', () => ({
  FinancialAgent: financialAgentMock.Constructor,
}));
jest.mock('../invoice.agent', () => ({
  InvoiceAgent: invoiceAgentMock.Constructor,
}));
jest.mock('../tax.agent', () => ({
  TaxAgent: taxAgentMock.Constructor,
}));

// -----------------------------------------------------------------------------
// Imports after mocks
// -----------------------------------------------------------------------------
import { RouterAgent, getRouterAgent } from '../router.agent';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const defaultContext: AgentContext = {
  userId: 'user-1',
  locale: 'pl',
};

const getPrivate = <T>(obj: unknown, key: string): T =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  (obj as { [k: string]: unknown })[key] as T;

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe('RouterAgent – routing logic', () => {
  let agent: RouterAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new RouterAgent('openai');
  });

  it('1.1 Happy path JSON decision', async () => {
    mockOpenAIInvoke.mockResolvedValue({
      content: '{"targetAgent":"invoice","confidence":0.91,"reasoning":"ok"}',
    });
    const keywordSpy = jest.spyOn(getPrivate<any>(agent, 'keywordRoute')).mockImplementation(() =>
      // never reached
      ({ targetAgent: 'router', confidence: 0.5, reasoning: 'fallback' })
    );

    const result = await agent.route('Pokaż faktury', defaultContext);

    expect(result).toEqual<RouterDecision>({
      targetAgent: 'invoice',
      confidence: 0.91,
      reasoning: 'ok',
    });
    expect(keywordSpy).not.toHaveBeenCalled();
  });

  it('1.2 JSON embedded in extra text', async () => {
    mockOpenAIInvoke.mockResolvedValue({
      content: 'Sure → {"targetAgent":"invoice","confidence":0.9,"reasoning":"…"} Thanks',
    });
    const result = await agent.route('Jakie mam faktury?', defaultContext);
    expect(result.targetAgent).toBe('invoice');
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it('1.3 JSON returned as object', async () => {
    mockOpenAIInvoke.mockResolvedValue({
      content: { targetAgent: 'tax', confidence: 0.8, reasoning: '…' },
    });
    const result = await agent.route('Oblicz VAT', defaultContext);
    expect(result).toEqual<RouterDecision>({
      targetAgent: 'tax',
      confidence: 0.8,
      reasoning: '…',
    });
  });

  it('1.4 Invalid model output falls back to keyword routing', async () => {
    mockOpenAIInvoke.mockResolvedValue({ content: 'I don’t know' });
    const keywordSpy = jest.spyOn(getPrivate<any>(agent, 'keywordRoute'));
    const result = await agent.route('Hello world', defaultContext);
    expect(keywordSpy).toHaveBeenCalled();
    expect(result).toEqual<RouterDecision>({
      targetAgent: 'router',
      confidence: 0.5,
      reasoning: 'No specific keyword match',
    });
  });

  it('1.5 Model throws error → keyword fallback & logger.warn', async () => {
    const { logger } = require('../utils/logger');
    mockOpenAIInvoke.mockRejectedValue(new Error('LLM down'));
    const result = await agent.route('Help', defaultContext);
    expect(logger.warn).toHaveBeenCalled();
    expect(result.targetAgent).toBe('router');
  });

  it('1.6 Contractor keywords case-insensitive', () => {
    const decision = getPrivate<any>(agent, 'keywordRoute')('Dodaj KONTRAHENTA', 'pl');
    expect(decision).toEqual<RouterDecision>({
      targetAgent: 'contractor',
      confidence: 0.8,
      reasoning: 'Keyword match: contractor',
    });
  });

  it('1.7 Invoice keywords with Cyrillic', () => {
    const decision = getPrivate<any>(agent, 'keywordRoute')('Счёт', 'ru');
    expect(decision.targetAgent).toBe('invoice');
  });

  it('1.8 Tax keyword VAT-7 mixed case', () => {
    const decision = getPrivate<any>(agent, 'keywordRoute')('Co z Vat-7?', 'pl');
    expect(decision.targetAgent).toBe('tax');
  });

  it('1.9 Financial keywords mixed language', () => {
    const decision = getPrivate<any>(agent, 'keywordRoute')('Profit and koszty raport', 'pl');
    expect(decision.targetAgent).toBe('financial');
  });

  it('1.10 No keyword match → router 0.5', () => {
    const decision = getPrivate<any>(agent, 'keywordRoute')('Random text', 'pl');
    expect(decision).toEqual<RouterDecision>({
      targetAgent: 'router',
      confidence: 0.5,
      reasoning: 'No specific keyword match',
    });
  });

  it('1.12 getRouterAgent returns singleton', () => {
    const a1 = getRouterAgent();
    const a2 = getRouterAgent();
    expect(a1).toBe(a2);
  });
});

describe('RouterAgent – createRoutingModel / createGeneralModel', () => {
  it('3.1 Provider=openai uses ChatOpenAI with expected params', () => {
    const agent = new RouterAgent('openai');
    const model = getPrivate<any>(agent, 'createRoutingModel')();
    expect(model).toBeInstanceOf(MockChatModel);
    expect(model.args).toMatchObject({
      modelName: 'gpt-3.5-turbo',
      maxTokens: 256,
      temperature: 0,
    });
  });

  it('3.2 Provider=anthropic uses ChatAnthropic with expected params', () => {
    const agent = new RouterAgent('anthropic' as LLMProvider);
    const model = getPrivate<any>(agent, 'createRoutingModel')();
    expect(model).toBeInstanceOf(MockChatModel);
    expect(model.args).toMatchObject({
      modelName: 'claude-3-haiku-20240307',
      maxTokens: 256,
      temperature: 0,
    });
  });
});

describe('RouterAgent – process() delegation flow', () => {
  let agent: RouterAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new RouterAgent('openai');
  });

  it('2.1 Delegates to specialised agent when confidence ≥0.7', async () => {
    jest.spyOn(agent, 'route').mockResolvedValue({
      targetAgent: 'contractor',
      confidence: 0.8,
      reasoning: '',
    });
    const result = await agent.process([], 'Dodaj kontrahenta', defaultContext);
    const contractorInstance = (contractorAgentMock.Constructor as jest.Mock).mock.instances[0];
    expect(contractorInstance.process).toHaveBeenCalledTimes(1);
    expect(result.agentType).toBe('contractor');
  });

  it('2.2 Low confidence forces handleDirectly()', async () => {
    jest.spyOn(agent, 'route').mockResolvedValue({
      targetAgent: 'tax',
      confidence: 0.6,
      reasoning: '',
    });
    mockOpenAIInvoke.mockResolvedValue({ content: 'direct' });
    const result = await agent.process([], 'Tax?', defaultContext);
    expect(taxAgentMock.process).not.toHaveBeenCalled();
    expect(result.metadata?.handledDirectly).toBe(true);
  });

  it('2.3 targetAgent=="router" handled directly', async () => {
    jest.spyOn(agent, 'route').mockResolvedValue({
      targetAgent: 'router',
      confidence: 0.99,
      reasoning: '',
    });
    mockOpenAIInvoke.mockResolvedValue({ content: 'direct' });
    const res = await agent.process([], 'General question', defaultContext);
    expect(res.metadata?.handledDirectly).toBe(true);
  });

  it('2.4 Non-existent agent in decision falls back to direct handling', async () => {
    jest.spyOn(agent, 'route').mockResolvedValue({
      // @ts-expect-error testing future agent
      targetAgent: 'payroll',
      confidence: 0.95,
      reasoning: '',
    });
    mockOpenAIInvoke.mockResolvedValue({ content: 'direct' });
    const res = await agent.process([], 'payroll?', defaultContext);
    expect(res.metadata?.handledDirectly).toBe(true);
  });

  it('2.5 metadata.duration ≥0 and handledDirectly flag correct', async () => {
    jest.spyOn(agent, 'route').mockResolvedValue({
      targetAgent: 'router',
      confidence: 0.5,
      reasoning: '',
    });
    mockOpenAIInvoke.mockResolvedValue({ content: 'direct' });
    const res = await agent.process([], 'Hello', defaultContext);
    expect(typeof res.metadata?.duration).toBe('number');
    expect((res.metadata?.duration as number) >= 0).toBe(true);
    expect(res.metadata?.handledDirectly).toBe(true);
  });
});