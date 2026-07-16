export type EDoreczeniaEnvironment = 'int' | 'prod';
export type SenderType = 'us' | 'zus' | 'court' | 'other' | 'unknown';
export type LetterType = 'wezwanie' | 'decyzja' | 'zawiadomienie' | 'postanowienie' | 'informacja' | 'inne';
export type LetterSeverity = 'high' | 'medium' | 'low';
export type LetterDeadlineType = 'response_deadline' | 'fikcja_doreczenia' | 'custom';

/** One message as listed by UA API (envelope metadata only, no body). */
export interface UAMessageSummary {
  messageId: string;          // government message ID — the dedup key
  senderName: string | null;
  subject: string | null;
  receivedAt: Date;
  hasAttachments: boolean;
}

export interface UAAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
}

/** Full message after a receiving read. */
export interface UAMessageContent {
  messageId: string;
  bodyText: string;
  attachments: UAAttachment[];
}

export interface LetterDeadline {
  type: LetterDeadlineType;
  dueDate: string;            // ISO 8601 date (YYYY-MM-DD)
  description: string;
}

/** Structured AI analysis result stored in EDoreczeniaLetter.analysis. */
export interface LetterAnalysis {
  summary: string;
  letterType: LetterType;
  severity: LetterSeverity;
  requiredAction: string;
  deadlines: LetterDeadline[];
}
