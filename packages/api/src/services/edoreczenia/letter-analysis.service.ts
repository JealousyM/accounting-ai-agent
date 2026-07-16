import { z } from 'zod';
import { Locale } from '../../i18n';
import { LetterAnalysis, SenderType } from './types';
import { sanitizeForPrompt } from '../ai-chat/utils';

/** Max chars of letter body passed to the model — large enough to analyse a
 * full wezwanie/decyzja, while still sanitised against prompt injection. */
const BODY_MAX_CHARS = 12000;

export interface StructuredModel {
  invoke(messages: unknown): Promise<LetterAnalysis>;
}

export interface LetterAnalysisInput {
  senderName: string | null;
  subject: string | null;
  bodyText: string;
  locale: Locale;
}

export const LetterAnalysisSchema = z.object({
  summary: z.string().describe('Plain-language summary of what the letter is about'),
  letterType: z.enum(['wezwanie', 'decyzja', 'zawiadomienie', 'postanowienie', 'informacja', 'inne']),
  severity: z.enum(['high', 'medium', 'low']).describe('high = action required, medium = to note, low = informational'),
  requiredAction: z.string().describe('What the recipient must do'),
  deadlines: z.array(z.object({
    type: z.enum(['response_deadline', 'fikcja_doreczenia', 'custom']),
    dueDate: z.string().describe('ISO date YYYY-MM-DD'),
    description: z.string(),
  })),
});

export class LetterAnalysisService {
  constructor(private readonly modelFactory: (userId: string) => Promise<StructuredModel>) {}

  classifySender(senderName: string | null): SenderType {
    if (!senderName) return 'unknown';
    const s = senderName.toLowerCase();
    if (s.includes('urząd skarbowy') || s.includes('urzad skarbowy') || s.includes('skarbow')) return 'us';
    if (s.includes('zakład ubezpieczeń') || s.includes('zus')) return 'zus';
    if (s.includes('sąd') || s.includes('sad ')) return 'court';
    return 'other';
  }

  async analyze(userId: string, input: LetterAnalysisInput): Promise<LetterAnalysis> {
    const model = await this.modelFactory(userId);
    const system = [
      'You analyse Polish official correspondence from government bodies (US, ZUS, courts).',
      `Respond in the user's language (locale: ${input.locale}).`,
      'Extract every response deadline you find. Do NOT invent deadlines.',
    ].join(' ');
    const human = [
      `Sender: ${sanitizeForPrompt(input.senderName ?? 'unknown')}`,
      `Subject: ${sanitizeForPrompt(input.subject ?? '')}`,
      `Body:\n${sanitizeForPrompt(input.bodyText, BODY_MAX_CHARS)}`,
    ].join('\n');
    return model.invoke([
      { role: 'system', content: system },
      { role: 'user', content: human },
    ]);
  }
}
