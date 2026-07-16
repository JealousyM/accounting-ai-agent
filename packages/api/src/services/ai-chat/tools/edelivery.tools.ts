import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { Locale, getEDeliveryTranslations } from '../../../i18n';
// Import the CLASS from its direct module, NOT the barrel (`../../edoreczenia`),
// because the barrel re-exports the singleton instance and would pull the whole
// instance graph (telegram, ai-chat, runner) into the tool module → import cycle.
import type { EDoreczeniaService } from '../../edoreczenia/edoreczenia.service';
import { formatLettersList, formatMarkedDone } from '../../edoreczenia/formatters/edelivery.formatter';

export function createGetOfficialLettersTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ filter }: { filter?: 'all' | 'needs_action' | 'done' }) => {
      try {
        const letters = await service.getLetters(userId, filter ?? 'all');
        return formatLettersList(letters as never, locale);
      } catch (error) {
        logger.error('Failed to get official letters', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_official_letters',
      description: 'List official letters received in the user\'s e-Doręczenia government mailbox. Optionally filter to those needing action. Use when the user asks what arrived from the urząd / US / ZUS / court.',
      schema: z.object({
        filter: z.enum(['all', 'needs_action', 'done']).nullable().optional().describe('Filter letters (default all)'),
      }),
    },
  );
}

export function createExplainOfficialLetterTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ letterId }: { letterId: string }) => {
      try {
        const letter = await service.getLetterById(userId, letterId);
        if (!letter) return getEDeliveryTranslations(locale).noLetters;
        const a = (letter as { analysis: { summary?: string; requiredAction?: string } | null }).analysis;
        const t = getEDeliveryTranslations(locale);
        if (!a) return `${letter.senderName ?? '—'}: ${letter.subject ?? ''}`;
        return [`## ${letter.senderName ?? '—'}`, '', a.summary ?? '', '', `**${t.requiredAction}:** ${a.requiredAction ?? ''}`].join('\n');
      } catch (error) {
        logger.error('Failed to explain official letter', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'explain_official_letter',
      description: 'Explain a specific official letter in plain language: what it is, what it means, what to do, by when. Provide the letterId from get_official_letters.',
      schema: z.object({ letterId: z.string().describe('The letter id') }),
    },
  );
}

export function createGetLetterDeadlinesTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async () => {
      try {
        const deadlines = await service.getActiveDeadlines(userId);
        const t = getEDeliveryTranslations(locale);
        if (deadlines.length === 0) return t.noLetters;
        return deadlines.map((d) => {
          const row = d as { dueDate: Date; letter?: { senderName?: string | null } };
          return `- ${row.letter?.senderName ?? '—'} — ${row.dueDate.toISOString().slice(0, 10)}`;
        }).join('\n');
      } catch (error) {
        logger.error('Failed to get letter deadlines', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'get_letter_deadlines',
      description: 'List active response deadlines across all official letters in the e-Doręczenia mailbox.',
      schema: z.object({}),
    },
  );
}

export function createMarkLetterDoneTool(service: EDoreczeniaService, userId: string, locale: Locale): StructuredToolInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ letterId }: { letterId: string }) => {
      try {
        await service.markLetterDone(userId, letterId);
        return formatMarkedDone(locale);
      } catch (error) {
        logger.error('Failed to mark letter done', { error });
        return `Error: ${getEDeliveryTranslations(locale).errorFetch}`;
      }
    },
    {
      name: 'mark_letter_done',
      description: 'Mark an official letter as handled/done. Provide the letterId.',
      schema: z.object({ letterId: z.string().describe('The letter id to close') }),
    },
  );
}
