import { AIMessage } from '@langchain/core/messages';
import { END } from '@langchain/langgraph';
import { LangGraphAgentRunner } from '../langgraph-agent-runner';

// Mock heavy LangChain/OpenAI dependencies so this runs without real API keys
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((opts: Record<string, unknown>) => ({ _type: 'openai', opts })),
}));
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation((opts: Record<string, unknown>) => ({ _type: 'google', opts })),
}));

const { ChatOpenAI } = require('@langchain/openai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

describe('LangGraphAgentRunner.createModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ChatOpenAI instance for openai provider', () => {
    const model = LangGraphAgentRunner.createModel('openai', 'sk-test');
    expect(ChatOpenAI).toHaveBeenCalledTimes(1);
    expect(ChatGoogleGenerativeAI).not.toHaveBeenCalled();
    expect(model).toBeDefined();
  });

  it('creates a ChatGoogleGenerativeAI instance for google provider', () => {
    const model = LangGraphAgentRunner.createModel('google', 'goog-key');
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledTimes(1);
    expect(ChatOpenAI).not.toHaveBeenCalled();
    expect(model).toBeDefined();
  });

  it('passes the custom model name through', () => {
    LangGraphAgentRunner.createModel('openai', 'sk-test', 'gpt-4-turbo');
    const [callArgs] = ChatOpenAI.mock.calls[0];
    expect(callArgs.modelName).toBe('gpt-4-turbo');
  });

  it('omits temperature and maxTokens for newer OpenAI models (o1)', () => {
    LangGraphAgentRunner.createModel('openai', 'sk-test', 'o1-mini');
    const [callArgs] = ChatOpenAI.mock.calls[0];
    expect(callArgs.temperature).toBeUndefined();
    expect(callArgs.maxTokens).toBeUndefined();
  });

  it('omits temperature and maxTokens for newer OpenAI models (o3)', () => {
    LangGraphAgentRunner.createModel('openai', 'sk-test', 'o3-mini');
    const [callArgs] = ChatOpenAI.mock.calls[0];
    expect(callArgs.temperature).toBeUndefined();
    expect(callArgs.maxTokens).toBeUndefined();
  });

  it('sets temperature and maxTokens for standard gpt-4o model', () => {
    LangGraphAgentRunner.createModel('openai', 'sk-test', 'gpt-4o');
    const [callArgs] = ChatOpenAI.mock.calls[0];
    expect(callArgs.temperature).toBeDefined();
    expect(callArgs.maxTokens).toBeDefined();
  });

  it('throws when apiKey is empty string', () => {
    expect(() => LangGraphAgentRunner.createModel('openai', '')).toThrow(
      'No API key provided for provider: openai'
    );
  });
});

describe('LangGraphAgentRunner.shouldContinue', () => {
  const makeState = (toolCalls: unknown[] | undefined) => ({
    messages: [
      {
        tool_calls: toolCalls,
      } as unknown as AIMessage,
    ],
  });

  it('returns "tools" when the last message has tool_calls', () => {
    const state = makeState([{ name: 'get_invoices', args: {} }]);
    expect(LangGraphAgentRunner.shouldContinue(state as any)).toBe('tools');
  });

  it('returns END when the last message has no tool_calls', () => {
    const state = makeState(undefined);
    expect(LangGraphAgentRunner.shouldContinue(state as any)).toBe(END);
  });

  it('returns END when tool_calls is an empty array', () => {
    const state = makeState([]);
    expect(LangGraphAgentRunner.shouldContinue(state as any)).toBe(END);
  });
});
