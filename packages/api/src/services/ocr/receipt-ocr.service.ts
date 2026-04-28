/**
 * ReceiptOCRService
 *
 * Extracts structured receipt / faktura data from an image using a
 * vision-capable LLM (Claude Sonnet 3.5+). Designed for the Telegram bot
 * photo flow: user sends a photo → bot calls this → bot replies with the
 * formatted markdown so the user can copy it into wFirma (or the future
 * `create_expense_from_receipt` AI tool).
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logger } from '../../utils/logger';
import { Locale } from '../../i18n';
import { ParsedReceiptSchema, ParsedReceipt } from './types';

const VISION_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 1024;
const TEMPERATURE = 0; // deterministic — we want the same answer twice for the same receipt

const SYSTEM_PROMPT = `You are a Polish accounting assistant that extracts structured data from photographs of receipts (paragony) and invoices (faktury).

Your output MUST be a single JSON object that matches this exact TypeScript shape:

{
  "sellerName"?: string,
  "sellerNip"?: string,
  "sellerAddress"?: string,
  "issueDate"?: string,           // YYYY-MM-DD if extractable, otherwise as printed
  "documentNumber"?: string,
  "totalNet"?: number,
  "totalVat"?: number,
  "totalGross": number,           // REQUIRED — gross/total amount paid
  "currency": string,             // default "PLN"
  "documentType": "paragon" | "faktura" | "rachunek" | "unknown",
  "confidence"?: number,          // 0..1, your honest confidence in the totals
  "items"?: { "name": string, "quantity"?: number, "unitPrice"?: number, "vatRate"?: number, "totalGross"?: number }[],
  "notes"?: string
}

Rules:
- Do not output anything except the JSON object — no prose, no markdown fences.
- Numbers are in the document's currency (default PLN). Use a dot for decimals.
- For Polish faktury, sellerNip is always 10 digits — do not include dashes.
- If the image is not a receipt or invoice, return: {"totalGross": 0, "currency": "PLN", "documentType": "unknown", "confidence": 0, "notes": "Not a receipt"}.
- Polish VAT rates: 23, 8, 5, 0, ZW (use 0 for ZW), NP (use 0 for NP).
- Do not invent numbers. If unsure, omit the field rather than guess.`;

export class ReceiptOCRService {
  /**
   * Constructor accepts an optional pre-built model so tests can inject a mock.
   * In production we lazily instantiate ChatAnthropic on first use.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly model?: { invoke: (messages: any[]) => Promise<any> }) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getModel(): { invoke: (messages: any[]) => Promise<any> } {
    if (this.model) return this.model;
    return new ChatAnthropic({
      modelName: VISION_MODEL,
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    });
  }

  /**
   * Extract structured receipt data from a JPEG/PNG image buffer.
   *
   * @param imageBuffer raw image bytes
   * @param mimeType e.g. "image/jpeg"
   * @param locale used only for log context — output JSON is locale-agnostic
   */
  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    locale: Locale = 'pl',
  ): Promise<ParsedReceipt> {
    const base64 = imageBuffer.toString('base64');
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extract the receipt data as JSON.',
          },
        ],
      }),
    ];

    logger.info('[ReceiptOCR] calling vision model', {
      mimeType,
      bytes: imageBuffer.length,
      locale,
    });

    const response = await this.getModel().invoke(messages);
    const text = typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (response.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('')
        : '';

    const json = extractJsonObject(text);
    if (!json) {
      throw new Error('Vision model did not return parsable JSON');
    }

    const parsed = ParsedReceiptSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn('[ReceiptOCR] schema validation failed', {
        issues: parsed.error.issues,
        rawJson: json,
      });
      throw new Error(`Vision output did not match schema: ${parsed.error.message}`);
    }

    return parsed.data;
  }
}

/**
 * Find the first balanced top-level JSON object in a free-form string.
 * Tolerates surrounding prose or markdown code fences from less-disciplined
 * model outputs.
 */
export function extractJsonObject(text: string): unknown | null {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
