// packages/api/src/agents/__tests__/router.agent.test.ts
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AgentContext, AgentResult, RouterDecision } from '../../types';
import { RouterAgent, getRouterAgent } from '../../router.agent';

// --------------------------------------------------
// Global mocks
// --------------------------------------------------
const createdOpenAIModels: Array<{ options: Record<string, unknown>; invoke: jest.Mock }> = [];
const createdAnthropicModels: Array<{ options: Record<string, unknown>; invoke: jest.Mock }> = [];

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((options: Record<string, unknown>) => {
    const instance = {
      options,
      invoke: jest.fn(),
      bindTools: jest.fn().mockReturnThis(),
    };
    createdOpenAIModels.push(instance);
    return instance;
  }),
}));

// Mock ChatAnthropic
jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation((options: Record<string, unknown>) => {
    const instance = {
      options,
      invoke: jest.fn(),
      bindTools: jest.fn().mockReturnThis(),
    };
    createdAnthropicModels.push(instance);
    return instance;
  }),
}));

// Mock specialized agents
jest.mock('../contractor.agent', () => {
  return {
    ContractorAgent: jest.fn().mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        response: 'contractor ok',
        toolsUsed: [],
        agentType: 'contractor',
        metadata: {},
      }),
    })),
  };
});
jest.mock('../financial.agent', () => {
  return {
    FinancialAgent: jest.fn().mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        response: 'financial ok',
        toolsUsed: [],
        agentType: 'financial',
        metadata: {},
      }),
    })),
  };
});
jest.mock('../invoice.agent', () => {
  return {
    InvoiceAgent: jest.fn().mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        response: 'invoice ok',
        toolsUsed: [],
        agentType: 'invoice',
        metadata: {},
      }),
    })),
  };
});
jest.mock('../tax.agent', () => {
  return {
    TaxAgent: jest.fn().mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        response: 'tax ok',
        toolsUsed: [],
        agentType: 'tax',
        metadata: {},
      }),
    })),
  };
});

// Mute logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --------------------------------------------------
// Helpers
// --------------------------------------------------
const baseContext: AgentContext = {
  userId: 'user1',
  locale: 'pl',
};

describe('RouterAgent – core behaviour', () => {
  beforeEach(() => {
    createdOpenAIModels.length = 0;
    createdAnthropicModels.length = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------
  // 1.1 createRoutingModel()
  // --------------------------------------------------
  it('createRoutingModel() returns ChatOpenAI with gpt-3.5-turbo for provider=openai', () => {
    const router = new RouterAgent('openai');
    const model = (router as any).createRoutingModel();
    expect(model.options).toMatchObject({ modelName: 'gpt-3.5-turbo' });
  });

  it('createRoutingModel() returns ChatAnthropic with claude-3-haiku-20240307 for provider=anthropic', () => {
    const router = new RouterAgent('anthropic');
    const model = (router as any).createRoutingModel();
    expect(model.options).toMatchObject({ modelName: 'claude-3-haiku-20240307' });
  });

  // --------------------------------------------------
  // 1.2 createGeneralModel()
  // --------------------------------------------------
  it('createGeneralModel() returns ChatOpenAI with gpt-4o for provider=openai', () => {
    const router = new RouterAgent('openai');
    const model = (router as any).createGeneralModel();
    expect(model.options).toMatchObject({ modelName: 'gpt-4o' });
  });

  it('createGeneralModel() returns ChatAnthropic with claude-3-5-sonnet-20241022 for provider=anthropic', () => {
    const router = new RouterAgent('anthropic');
    const model = (router as any).createGeneralModel();
    expect(model.options).toMatchObject({ modelName: 'claude-3-5-sonnet-20241022' });
  });

  // --------------------------------------------------
  // 1.3 keywordRoute() precedence & case-insensitive
  // --------------------------------------------------
  const precedenceCases: Array<{ msg: string; expected: string }> = [
    { msg: 'Dodaj kontrahenta ABC', expected: 'contractor' },
    { msg: 'pokaż fakturę 1/2024', expected: 'invoice' },
    { msg: 'oblicz vat od 1000', expected: 'tax' },
    { msg: 'jakie były przychody 2023', expected: 'financial' },
    { msg: 'ogólne pytanie bez słów kluczowych', expected: 'router' },
    { msg: 'POKAŻ FAKTURĘ I OBLICZ VAT', expected: 'invoice' }, // first match precedence
  ];

  precedenceCases.forEach(({ msg, expected }) => {
    it(`keywordRoute() routes "${msg}" → ${expected}`, () => {
      const router = new RouterAgent('openai');
      const decision: RouterDecision = (router as any).keywordRoute(msg, 'pl');
      expect(decision.targetAgent).toBe(expected);
    });
  });

  // --------------------------------------------------
  // 1.4 route() – LLM path & fallbacks
  // --------------------------------------------------
  it('route() parses pure JSON response from LLM', async () => {
    const router = new RouterAgent('openai');
    const llmInstance = createdOpenAIModels[0];
    llmInstance.invoke.mockResolvedValueOnce({
      content: '{"targetAgent":"contractor","confidence":0.9,"reasoning":"ok"}',
    });

    const result = await router.route('any', baseContext);
    expect(result).toEqual<RouterDecision>({
      targetAgent: 'contractor',
      confidence: 0.9,
      reasoning: 'ok',
    });
    expect(llmInstance.invoke).toHaveBeenCalled();
  });

  it('route() extracts JSON when narrative text surrounds it', async () => {
    const router = new RouterAgent('openai');
    const llmInstance = createdOpenAIModels[0];
    llmInstance.invoke.mockResolvedValueOnce({
      content:
        'Sure, here is the routing result:\n{"targetAgent":"invoice","confidence":"0.85","reasoning":"matched"}\nThank you.',
    });

    const result = await router.route('any', baseContext);
    expect(result.targetAgent).toBe('invoice');
    expect(result.confidence).toBeCloseTo(0.85);
  });

  it('route() falls back to keywordRoute() when LLM returns no JSON', async () => {
    const router = new RouterAgent('openai');
    const llmInstance = createdOpenAIModels[0];
    llmInstance.invoke.mockResolvedValueOnce({ content: 'no json here' });
    const spyKeyword = jest.spyOn(router as any, 'keywordRoute');

    const result = await router.route('dodaj kontrahenta', baseContext);
    expect(spyKeyword).toHaveBeenCalled();
    expect(result.targetAgent).toBe('contractor');
  });

  it('route() falls back when LLM throws error', async () => {
    const router = new RouterAgent('openai');
    const llmInstance = createdOpenAIModels[0];
    llmInstance.invoke.mockRejectedValueOnce(new Error('boom'));
    const res = await router.route('pokaż fakturę', baseContext);
    expect(res.targetAgent).toBe('invoice');
  });

  // --------------------------------------------------
  // 1.5 process() delegation vs. direct handling
  // --------------------------------------------------
  it('process() delegates to specialized agent when confidence ≥ 0.7', async () => {
    const router = new RouterAgent('openai');
    jest.spyOn(router, 'route').mockResolvedValueOnce({
      targetAgent: 'contractor',
      confidence: 0.8,
      reasoning: 'high',
    });

    const contractorAgentMock = (
      (await import('../contractor.agent')).ContractorAgent as jest.Mock
    ).mock.instances[0];

    const result = await router.process([], 'Add contractor', baseContext);
    expect(contractorAgentMock.process).toHaveBeenCalledWith([], 'Add contractor', baseContext);
    expect(result).toMatchObject<AgentResult>({ agentType: 'contractor', response: 'contractor ok' });
  });

  it('process() handles directly when confidence < 0.7', async () => {
    const router = new RouterAgent('openai');
    jest.spyOn(router, 'route').mockResolvedValueOnce({
      targetAgent: 'contractor',
      confidence: 0.69,
      reasoning: 'low',
    });

    // Prepare general model stub response
    const generalModel = createdOpenAIModels[1]; // second instantiation is general model
    generalModel.invoke.mockResolvedValueOnce({ content: 'direct answer' });

    const result = await router.process([], 'Add contractor', baseContext);
    expect(result.agentType).toBe('router');
    expect(result.response).toBe('direct answer');
    expect(result.metadata?.handledDirectly).toBe(true);
  });

  it('process() propagates error from delegated agent', async () => {
    const router = new RouterAgent('openai');
    const decision: RouterDecision = {
      targetAgent: 'contractor',
      confidence: 0.95,
      reasoning: 'sure',
    };
    jest.spyOn(router, 'route').mockResolvedValueOnce(decision);

    const contractorAgentMock = (
      (await import('../contractor.agent')).ContractorAgent as jest.Mock
    ).mock.instances[0];
    contractorAgentMock.process.mockRejectedValueOnce(new Error('fail'));

    await expect(router.process([], 'Add', baseContext)).rejects.toThrow('fail');
  });

  // --------------------------------------------------
  // 1.7 getRouterAgent() singleton behaviour
  // --------------------------------------------------
  it('getRouterAgent() returns same instance for same provider', () => {
    const a1 = getRouterAgent('openai');
    const a2 = getRouterAgent('openai');
    expect(a1).toBe(a2);
  });

  it('getRouterAgent() ignores provider change after first instantiation', () => {
    jest.resetModules();
    // Re-import after reset to get fresh singleton
    const { getRouterAgent: freshGet } = require('../../router.agent') as typeof import('../../router.agent');
    const first = freshGet('openai');
    const second = freshGet('anthropic');
    expect(first).toBe(second);
    // Provider should remain the first one
    const model = (first as any).createRoutingModel();
    expect(model.options).toMatchObject({ modelName: 'gpt-3.5-turbo' });
  });
});
