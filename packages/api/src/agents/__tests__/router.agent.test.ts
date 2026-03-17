// packages/api/src/agents/__tests__/router.agent.spec.ts
import { describe, expect, jest, it, beforeEach } from '@jest/globals';
import {
  RouterAgent,
  getRouterAgent,
} from '../router.agent';
import { AgentContext, RouterDecision } from '../types';

// ----- Global mocks -----
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// LangChain LLM mocks
jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation((config: any) => ({
      config,
      invoke: jest.fn(),
    })),
  };
});
jest.mock('@langchain/anthropic', () => {
  return {
    ChatAnthropic: jest.fn().mockImplementation((config: any) => ({
      config,
      invoke: jest.fn(),
    })),
  };
});
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

// Specialized agent mocks
const makeAgentMock = () => ({
  process: jest.fn().mockResolvedValue({
    response: 'stub-response',
    toolsUsed: [],
    agentType: 'stub',
    metadata: {},
  }),
});
jest.mock('../contractor.agent', () => ({
  ContractorAgent: jest.fn().mockImplementation(makeAgentMock),
}));
jest.mock('../financial.agent', () => ({
  FinancialAgent: jest.fn().mockImplementation(makeAgentMock),
}));
jest.mock('../invoice.agent', () => ({
  InvoiceAgent: jest.fn().mockImplementation(makeAgentMock),
}));
jest.mock('../tax.agent', () => ({
  TaxAgent: jest.fn().mockImplementation(makeAgentMock),
}));

// ----- Helpers -----
const ctxPl: AgentContext = { locale: 'pl' };
const ctxEn: AgentContext = { locale: 'en' };
const ctxRu: AgentContext = { locale: 'ru' };
const ctxDe: AgentContext = { locale: 'de' };

describe('RouterAgent – Keyword based routing', () => {
  let router: RouterAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new RouterAgent('openai');
  });

  const kw = (msg: string) =>
    // @ts-expect-error – accessing private member for test purposes
    (router as any).keywordRoute(msg, 'pl') as RouterDecision;

  it.each([
    ['Dodaj kontrahenta', 'contractor'],
    ['add contractor', 'contractor'],
    ['создай контрагентa', 'contractor'],
  ])('1.1 Contractor keywords – %s', (msg, expected) => {
    const decision = kw(msg);
    expect(decision).toEqual({
      targetAgent: expected,
      confidence: 0.8,
      reasoning: expect.stringContaining('Keyword match'),
    });
  });

  it('1.2 Invoice keywords – mixed languages', () => {
    const decision = kw('Wyślij fakturę');
    expect(decision.targetAgent).toBe('invoice');
  });

  it('1.3 Tax keywords', () => {
    const decision = kw('Ile VAT');
    expect(decision.targetAgent).toBe('tax');
  });

  it('1.4 Financial keywords', () => {
    const decision = kw('company revenue 2023');
    expect(decision.targetAgent).toBe('financial');
  });

  it('1.5 No keyword match defaults to router', () => {
    const decision = kw('Co to jest JPK_V7?');
    expect(decision).toEqual({
      targetAgent: 'router',
      confidence: 0.5,
      reasoning: 'No specific keyword match',
    });
  });

  it('1.6 Case-insensitivity', () => {
    const decision = kw('ФАКТУРa');
    expect(decision.targetAgent).toBe('invoice');
  });

  it('1.7 Multiple keyword collision returns first match', () => {
    const decision = kw('Dodaj kontrahenta i wystaw fakturę');
    expect(decision.targetAgent).toBe('contractor');
  });
});

describe('RouterAgent – LLM decision parsing (route)', () => {
  let router: RouterAgent;
  let fakeModel: { invoke: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    router = new RouterAgent('openai');
    fakeModel = { invoke: jest.fn() };
    // @ts-expect-error private
    jest.spyOn(router as any, 'createRoutingModel').mockReturnValue(fakeModel);
  });

  it('2.1 Valid JSON only', async () => {
    const payload =
      '{"targetAgent":"tax","confidence":0.9,"reasoning":"yo"}';
    fakeModel.invoke.mockResolvedValue({ content: payload });

    const res = await router.route('dummy', ctxPl);
    expect(res).toEqual(JSON.parse(payload));
  });

  it('2.2 JSON embedded in text', async () => {
    const payload =
      'Sure.\n{"targetAgent":"invoice","confidence":0.83,"reasoning":"ok"}\nThanks';
    fakeModel.invoke.mockResolvedValue({ content: payload });

    const res = await router.route('dummy', ctxPl);
    expect(res.targetAgent).toBe('invoice');
    expect(res.confidence).toBeCloseTo(0.83);
  });

  it('2.3 Invalid JSON triggers keyword fallback', async () => {
    fakeModel.invoke.mockResolvedValue({ content: '{"targetAgent":"tax",}' });
    const kwSpy = // @ts-expect-error private
      jest.spyOn(router as any, 'keywordRoute').mockReturnValue({
        targetAgent: 'router',
        confidence: 0.5,
        reasoning: 'fallback',
      });

    const res = await router.route('dummy', ctxPl);
    expect(kwSpy).toHaveBeenCalled();
    expect(res.targetAgent).toBe('router');
  });

  it('2.4 No braces triggers keyword fallback', async () => {
    fakeModel.invoke.mockResolvedValue({ content: "I don't know" });
    const res = await router.route('dummy', ctxPl);
    expect(res.targetAgent).toBeDefined();
  });

  it('2.5 Unknown targetAgent value handled directly in process()', async () => {
    fakeModel.invoke.mockResolvedValue({
      content:
        '{"targetAgent":"unknown","confidence":0.9,"reasoning":""}',
    });
    const handleDirectSpy =
      // @ts-expect-error private
      jest.spyOn(router as any, 'handleDirectly').mockResolvedValue({
        response: 'direct',
        toolsUsed: [],
        agentType: 'router',
        metadata: {},
      });

    const result = await router.process([], 'hello', ctxPl);
    expect(handleDirectSpy).toHaveBeenCalled();
    expect(result.response).toBe('direct');
  });

  it('2.6 Provider switch uses ChatAnthropic', async () => {
    jest.clearAllMocks();
    const anthropicRouter = new RouterAgent('anthropic');
    const model = { invoke: jest.fn() };
    // @ts-expect-error private
    jest.spyOn(anthropicRouter as any, 'createRoutingModel').mockReturnValue(
      model,
    );
    model.invoke.mockResolvedValue({
      content:
        '{"targetAgent":"router","confidence":0.6,"reasoning":"ok"}',
    });
    await anthropicRouter.route('hi', ctxPl);
    expect(ChatAnthropic).toHaveBeenCalled();
  });

  it('2.7 Exception thrown by LLM falls back to keyword routing', async () => {
    fakeModel.invoke.mockRejectedValue(new Error('network'));
    const kwSpy =
      // @ts-expect-error private
      jest.spyOn(router as any, 'keywordRoute').mockReturnValue({
        targetAgent: 'router',
        confidence: 0.5,
        reasoning: 'err',
      });

    const res = await router.route('foo', ctxPl);
    expect(kwSpy).toHaveBeenCalled();
    expect(res.targetAgent).toBe('router');
  });
});

describe('RouterAgent – Confidence threshold & delegation logic (process)', () => {
  let router: RouterAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new RouterAgent('openai');
  });

  it('3.1 Delegates to specialised agent when confidence ≥0.7', async () => {
    const invoiceAgent = router.getAgent('invoice') as any;
    const stubResult = {
      response: 'invoice-ok',
      toolsUsed: [],
      agentType: 'invoice',
      metadata: {},
    };
    invoiceAgent.process.mockResolvedValue(stubResult);

    jest
      .spyOn(router, 'route')
      .mockResolvedValue({ targetAgent: 'invoice', confidence: 0.8, reasoning: '' });

    const res = await router.process([], 'msg', ctxPl);
    expect(invoiceAgent.process).toHaveBeenCalledTimes(1);
    expect(res).toBe(stubResult);
  });

  it('3.2 Low confidence handled directly', async () => {
    const invoiceAgent = router.getAgent('invoice') as any;
    jest
      .spyOn(router, 'route')
      .mockResolvedValue({ targetAgent: 'invoice', confidence: 0.6, reasoning: '' });

    const directSpy =
      // @ts-expect-error private
      jest.spyOn(router as any, 'handleDirectly').mockResolvedValue({
        response: 'direct',
        toolsUsed: [],
        agentType: 'router',
        metadata: {},
      });

    await router.process([], 'msg', ctxPl);
    expect(invoiceAgent.process).not.toHaveBeenCalled();
    expect(directSpy).toHaveBeenCalled();
  });

  it('3.3 targetAgent router handled directly', async () => {
    jest
      .spyOn(router, 'route')
      .mockResolvedValue({ targetAgent: 'router', confidence: 1, reasoning: '' });

    const directSpy =
      // @ts-expect-error
      jest.spyOn(router as any, 'handleDirectly').mockResolvedValue({
        response: 'r',
        toolsUsed: [],
        agentType: 'router',
        metadata: {},
      });

    await router.process([], 'x', ctxPl);
    expect(directSpy).toHaveBeenCalled();
  });

  it('3.4 Missing specialised agent handled directly', async () => {
    (router.getAgents()).delete('invoice');

    jest
      .spyOn(router, 'route')
      .mockResolvedValue({ targetAgent: 'invoice', confidence: 0.9, reasoning: '' });

    const directSpy =
      // @ts-expect-error
      jest.spyOn(router as any, 'handleDirectly').mockResolvedValue({
        response: 'r',
        toolsUsed: [],
        agentType: 'router',
        metadata: {},
      });

    await router.process([], 'x', ctxPl);
    expect(directSpy).toHaveBeenCalled();
  });

  it('3.5 Metadata.duration >0 and provider set', async () => {
    jest
      .spyOn(router, 'route')
      .mockResolvedValue({ targetAgent: 'router', confidence: 0.5, reasoning: '' });

    const res = await router.process([], 'test', ctxPl);
    expect(res.metadata.duration).toBeGreaterThanOrEqual(0);
    expect(res.metadata.provider).toBe('openai');
    expect(res.metadata.handledDirectly).toBe(true);
  });
});

describe('RouterAgent – createGeneralModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('4.1 Default provider uses gpt-4o', () => {
    const router = new RouterAgent('openai');
    // @ts-expect-error private
    (router as any).createGeneralModel();
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7,
      }),
    );
  });

  it('4.2 Anthropic provider uses claude-3-5-sonnet', () => {
    const router = new RouterAgent('anthropic');
    // @ts-expect-error
    (router as any).createGeneralModel();
    expect(ChatAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7,
      }),
    );
  });
});

describe('RouterAgent – Singleton helper getRouterAgent', () => {
  it('5.1 Returns same instance', () => {
    const a = getRouterAgent();
    const b = getRouterAgent();
    expect(a).toBe(b);
  });

  it('5.2 Subsequent call with other provider still same instance', () => {
    const first = getRouterAgent();
    const second = getRouterAgent('anthropic');
    expect(first).toBe(second);
  });
});

describe('RouterAgent – Accessors', () => {
  const router = new RouterAgent();

  it('6.1 getAgents returns expected keys', () => {
    const keys = Array.from(router.getAgents().keys()).sort();
    expect(keys).toEqual(['contractor', 'financial', 'invoice', 'tax'].sort());
  });

  it('6.2 getAgent returns instance', () => {
    const invoice = router.getAgent('invoice');
    expect(invoice).toBeDefined();
    expect(typeof (invoice as any).process).toBe('function');
  });
});

describe('RouterAgent – Locale handling', () => {
  let router: RouterAgent;

  beforeEach(() => {
    router = new RouterAgent();
    jest.spyOn(router, 'route').mockResolvedValue({
      targetAgent: 'router',
      confidence: 0.5,
      reasoning: '',
    });
  });

  it.each([
    ['pl', ctxPl],
    ['en', ctxEn],
    ['ru', ctxRu],
    ['de', ctxDe], // unsupported locale should fallback
  ])('7.x process does not throw for locale %s', async (_name, ctx) => {
    await expect(router.process([], 'hi', ctx)).resolves.not.toThrow();
  });
});