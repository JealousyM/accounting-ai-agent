import { OcrFlowHandler } from '../ocr-flow-handler';

// ---------------------------------------------------------------------------
// Module mocks — factories must not reference outer `const` variables because
// jest.mock() is hoisted before const declarations.
// ---------------------------------------------------------------------------

jest.mock('../../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    telegramLink: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../services/credentials.instance', () => ({
  credentialsService: {
    getLLMCredentials: jest.fn(),
  },
}));

jest.mock('../../../services/ocr/receipt-ocr.instance', () => ({
  receiptOCRService: {
    extractFromImage: jest.fn(),
  },
}));

jest.mock('../../../services/ocr/formatter', () => ({
  formatParsedReceipt: jest.fn().mockReturnValue('**Receipt card**'),
}));

jest.mock('../../../i18n', () => ({
  getOcrTranslations: () => ({
    recognizing: 'Recognizing…',
    noApiKey: 'No API key configured.',
    recognizeFailed: 'Recognition failed.',
    addAsExpense: 'Add as expense',
    cancel: 'Cancel',
    expenseExpired: 'Expense expired.',
    expenseCreating: 'Creating…',
    expenseCreated: 'Expense created!',
    expenseCancelled: 'Cancelled.',
    expenseCreateFailed: 'Failed: {error}',
  }),
  getExpenseTranslations: () => ({
    cannotResolveSeller: 'Cannot resolve seller.',
  }),
}));

jest.mock('../markdown-converter', () => ({
  convertToTelegramMarkdown: (t: string) => t,
  splitMessage: (t: string) => [t],
}));

// ---------------------------------------------------------------------------
// Access the mocked singletons after mocking
// ---------------------------------------------------------------------------

import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { credentialsService } from '../../../services/credentials.instance';
import { receiptOCRService } from '../../../services/ocr/receipt-ocr.instance';

const mockRedis = redis as jest.Mocked<typeof redis>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCredentials = credentialsService as jest.Mocked<typeof credentialsService>;
const mockOcrService = receiptOCRService as jest.Mocked<typeof receiptOCRService>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx() {
  return {
    from: { id: 42, language_code: 'pl' },
    message: { photo: [{ file_id: 'file1', width: 100, height: 100 }] },
    sendChatAction: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue({ chat: { id: 1 }, message_id: 99 }),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    editMessageReplyMarkup: jest.fn().mockResolvedValue(undefined),
    telegram: {
      getFileLink: jest.fn().mockResolvedValue(new URL('https://example.com/photo.jpg')),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    },
  };
}

const FAKE_LINK = { id: 'link-1', userId: 'user-1', activeConversationId: null };

const PARSED_RECEIPT = {
  sellerName: 'BIEDRONKA',
  totalGross: 47.5,
  currency: 'PLN',
  documentType: 'paragon',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OcrFlowHandler.handlePhoto', () => {
  let handler: OcrFlowHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-bytes').buffer),
    }) as any;
    (mockRedis.setEx as jest.Mock).mockResolvedValue('OK');

    handler = new OcrFlowHandler({});
  });

  it('replies with noApiKey when user has no OpenAI credentials', async () => {
    (mockCredentials.getLLMCredentials as jest.Mock).mockResolvedValue(null);
    const ctx = makeCtx();

    await handler.handlePhoto(ctx, FAKE_LINK);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('No API key configured.'));
  });

  it('replies with noApiKey when provider is not openai', async () => {
    (mockCredentials.getLLMCredentials as jest.Mock).mockResolvedValue({ provider: 'anthropic', apiKey: 'key' });
    const ctx = makeCtx();

    await handler.handlePhoto(ctx, FAKE_LINK);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('No API key configured.'));
  });

  it('replies with recognizeFailed when OCR throws', async () => {
    (mockCredentials.getLLMCredentials as jest.Mock).mockResolvedValue({ provider: 'openai', apiKey: 'sk-test' });
    (mockOcrService.extractFromImage as jest.Mock).mockRejectedValue(new Error('Vision error'));
    const ctx = makeCtx();

    await handler.handlePhoto(ctx, FAKE_LINK);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Recognition failed.'));
  });

  it('caches parsed receipt and replies with card on success', async () => {
    (mockCredentials.getLLMCredentials as jest.Mock).mockResolvedValue({ provider: 'openai', apiKey: 'sk-test' });
    (mockOcrService.extractFromImage as jest.Mock).mockResolvedValue(PARSED_RECEIPT);
    const ctx = makeCtx();

    await handler.handlePhoto(ctx, FAKE_LINK);

    expect(mockRedis.setEx).toHaveBeenCalledWith(
      expect.stringMatching(/^telegram:ocr:42:/),
      600,
      JSON.stringify(PARSED_RECEIPT),
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ parse_mode: 'MarkdownV2' }),
    );
  });

  it('deletes the ack message after OCR regardless of outcome', async () => {
    (mockCredentials.getLLMCredentials as jest.Mock).mockResolvedValue({ provider: 'openai', apiKey: 'sk-test' });
    (mockOcrService.extractFromImage as jest.Mock).mockRejectedValue(new Error('fail'));
    const ctx = makeCtx();

    await handler.handlePhoto(ctx, FAKE_LINK);

    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(1, 99);
  });
});

describe('OcrFlowHandler.handleAdd', () => {
  let handler: OcrFlowHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new OcrFlowHandler({});
  });

  it('replies with "not linked" when telegramLink is missing', async () => {
    (mockPrisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(null);
    const ctx = makeCtx();

    await handler.handleAdd(ctx, 'some-ocr-id');

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Account not linked.');
  });

  it('replies with expenseExpired when cache key is missing', async () => {
    (mockPrisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(FAKE_LINK);
    (mockRedis.get as jest.Mock).mockResolvedValue(null);
    const ctx = makeCtx();

    await handler.handleAdd(ctx, 'some-ocr-id');

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Expense expired.'));
  });

  it('replies with error when wfirmaFactory is not configured', async () => {
    (mockPrisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(FAKE_LINK);
    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(PARSED_RECEIPT));
    const ctx = makeCtx();

    await handler.handleAdd(ctx, 'some-ocr-id');

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('wFirma not configured'));
  });
});

describe('OcrFlowHandler.handleCancel', () => {
  let handler: OcrFlowHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    handler = new OcrFlowHandler({});
  });

  it('deletes the cached receipt and replies with cancelled', async () => {
    const ctx = makeCtx();

    await handler.handleCancel(ctx, 'abc123');

    expect(mockRedis.del).toHaveBeenCalledWith('telegram:ocr:42:abc123');
    expect(ctx.reply).toHaveBeenCalledWith('Cancelled.');
  });

  it('clears the inline keyboard on the original message', async () => {
    const ctx = makeCtx();

    await handler.handleCancel(ctx, 'abc123');

    expect(ctx.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [] });
  });
});
