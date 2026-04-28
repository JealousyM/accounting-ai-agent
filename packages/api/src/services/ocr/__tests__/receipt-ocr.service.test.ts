import { ReceiptOCRService, extractJsonObject } from '../receipt-ocr.service';

describe('extractJsonObject', () => {
  it('parses a clean JSON object', () => {
    expect(extractJsonObject('{"a": 1}')).toEqual({ a: 1 });
  });

  it('extracts JSON from inside prose', () => {
    expect(extractJsonObject('Sure, here it is: {"a":1,"b":2} done.')).toEqual({ a: 1, b: 2 });
  });

  it('extracts JSON from a markdown fence', () => {
    expect(extractJsonObject('```json\n{"sellerName":"Lidl"}\n```')).toEqual({
      sellerName: 'Lidl',
    });
  });

  it('handles nested objects', () => {
    expect(extractJsonObject('{"a": {"b": {"c": 3}}}')).toEqual({ a: { b: { c: 3 } } });
  });

  it('handles strings with braces inside', () => {
    expect(extractJsonObject('{"note": "ok {check}"}')).toEqual({ note: 'ok {check}' });
  });

  it('returns null for empty input', () => {
    expect(extractJsonObject('')).toBeNull();
  });

  it('returns null when no JSON found', () => {
    expect(extractJsonObject('just prose')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(extractJsonObject('{ not valid }')).toBeNull();
  });
});

describe('ReceiptOCRService.extractFromImage', () => {
  const sampleBuffer = Buffer.from('fake-image-bytes');

  it('returns parsed receipt on a clean JSON response', async () => {
    const mockModel = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sellerName: 'BIEDRONKA',
          sellerNip: '5260205428',
          issueDate: '2026-04-15',
          totalGross: 47.5,
          totalNet: 38.62,
          totalVat: 8.88,
          currency: 'PLN',
          documentType: 'paragon',
          confidence: 0.92,
        }),
      }),
    };
    const service = new ReceiptOCRService(mockModel);

    const result = await service.extractFromImage(sampleBuffer, 'image/jpeg', 'pl');

    expect(result.sellerName).toBe('BIEDRONKA');
    expect(result.totalGross).toBe(47.5);
    expect(result.documentType).toBe('paragon');
    expect(mockModel.invoke).toHaveBeenCalledTimes(1);

    // verify the message contains the base64-encoded image
    const messages = mockModel.invoke.mock.calls[0][0];
    const userMsg = messages[1];
    const imageBlock = userMsg.content.find((b: { type: string }) => b.type === 'image_url');
    expect(imageBlock.image_url.url).toContain('data:image/jpeg;base64,');
  });

  it('handles JSON wrapped in prose / markdown', async () => {
    const mockModel = {
      invoke: jest.fn().mockResolvedValue({
        content: 'Here is the data:\n```json\n{"totalGross": 100, "currency": "PLN", "documentType": "faktura"}\n```',
      }),
    };
    const service = new ReceiptOCRService(mockModel);

    const result = await service.extractFromImage(sampleBuffer, 'image/png');

    expect(result.totalGross).toBe(100);
    expect(result.documentType).toBe('faktura');
  });

  it('throws if model output is not parseable JSON', async () => {
    const mockModel = {
      invoke: jest.fn().mockResolvedValue({
        content: 'I cannot read this image clearly.',
      }),
    };
    const service = new ReceiptOCRService(mockModel);

    await expect(
      service.extractFromImage(sampleBuffer, 'image/jpeg'),
    ).rejects.toThrow(/parsable JSON/);
  });

  it('throws if JSON is parseable but missing required totalGross', async () => {
    const mockModel = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({ sellerName: 'X' }),
      }),
    };
    const service = new ReceiptOCRService(mockModel);

    await expect(
      service.extractFromImage(sampleBuffer, 'image/jpeg'),
    ).rejects.toThrow(/schema/i);
  });

  it('handles array-of-content-blocks response shape', async () => {
    const mockModel = {
      invoke: jest.fn().mockResolvedValue({
        content: [
          { type: 'text', text: '{"totalGross": 50, "currency": "EUR", "documentType": "rachunek"}' },
        ],
      }),
    };
    const service = new ReceiptOCRService(mockModel);
    const result = await service.extractFromImage(sampleBuffer, 'image/jpeg');
    expect(result.totalGross).toBe(50);
    expect(result.currency).toBe('EUR');
  });
});
