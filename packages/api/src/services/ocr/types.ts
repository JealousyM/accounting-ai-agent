/**
 * Receipt OCR Types
 *
 * Structured shape returned by ReceiptOCRService after running an image
 * through Claude Vision. The fields mirror what we'd want to push into
 * a wFirma expense record (when the createExpense AI tool lands).
 */

import { z } from 'zod';

export const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatRate: z.number().optional(),
  totalGross: z.number().optional(),
});

export const ParsedReceiptSchema = z.object({
  /** Seller / merchant name as printed on the receipt or invoice */
  sellerName: z.string().optional(),
  /** Polish NIP (10 digits) — only if visible on the document */
  sellerNip: z.string().optional(),
  /** Seller address as printed (single string) */
  sellerAddress: z.string().optional(),
  /** Issue date in YYYY-MM-DD if extractable, otherwise as printed */
  issueDate: z.string().optional(),
  /** Document number / invoice number / receipt number */
  documentNumber: z.string().optional(),
  /** Total NET amount */
  totalNet: z.number().optional(),
  /** Total VAT amount */
  totalVat: z.number().optional(),
  /** Total GROSS amount (net + vat) — present on every paragon */
  totalGross: z.number(),
  /** Currency, defaults to PLN if not explicit */
  currency: z.string().default('PLN'),
  /** Document type detected by the model */
  documentType: z.enum(['paragon', 'faktura', 'rachunek', 'unknown']).default('unknown'),
  /** Confidence score 0..1 the model assigns to its own output */
  confidence: z.number().min(0).max(1).optional(),
  /** Line items if discernible (paragon often has them, faktura always) */
  items: z.array(ReceiptItemSchema).optional(),
  /** Free-text notes, e.g. payment method, store branch, anything weird */
  notes: z.string().optional(),
});

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;
export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;
