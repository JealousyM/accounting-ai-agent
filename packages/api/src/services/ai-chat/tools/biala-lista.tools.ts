/**
 * Biała Lista (MF White List) Tools
 * LangChain tools for verifying contractor bank accounts against the
 * Polish Ministry of Finance VAT taxpayer registry.
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { Locale, getBialaListaTranslations } from '../../../i18n';
import {
  CompanyEnrichmentService,
  validateNip,
  normalizeBankAccount,
} from '../../company-enrichment.service';
import { formatBankAccountVerification } from '../formatters/biala-lista.formatter';
import { sanitizeForPrompt } from '../utils';

export function createVerifyBankAccountTool(
  enrichmentService: CompanyEnrichmentService,
  userId: string,
  locale: Locale = 'pl'
): StructuredToolInterface {
  const t = getBialaListaTranslations(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async ({ nip, accountNumber, date }: { nip: string; accountNumber: string; date?: string }) => {
      try {
        if (!validateNip(nip)) {
          return t.invalidNip;
        }

        const normalized = normalizeBankAccount(accountNumber);
        if (!normalized) {
          return t.invalidAccount;
        }

        const result = await enrichmentService.verifyBankAccount(nip, normalized, userId, date);

        if (!result) {
          return `## ${t.errorVerify}\n\n**${t.errorReason}:** Biała Lista MF API unavailable and no recent cached result.`;
        }

        return formatBankAccountVerification(result, locale);
      } catch (error) {
        logger.error('Failed to verify bank account on Biała Lista', { nip, error });
        const message = error instanceof Error ? sanitizeForPrompt(error.message) : 'unknown error';
        return `## ${t.errorVerify}\n\n**${t.errorReason}:** ${message}`;
      }
    },
    {
      name: 'verify_bank_account_white_list',
      description:
        'Verify whether a bank account belongs to a Polish business by checking the official Ministry of Finance White List (Biała Lista, Wykaz podatników VAT). Use this BEFORE the user makes any payment to a Polish contractor of 15,000 PLN or more — paying to an unverified account disqualifies the cost as KUP and triggers joint VAT liability under Article 117ba of the Tax Ordinance. Also use whenever the user explicitly asks to "check the account", "verify on Biała Lista", "is this account safe", "sprawdź konto na białej liście", "проверь счёт".',
      schema: z.object({
        nip: z.string().describe('Polish NIP of the contractor (10 digits, with or without dashes/spaces)'),
        accountNumber: z.string().describe('Polish NRB bank account number (26 digits, with or without PL prefix and spaces)'),
        date: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Date to verify against in YYYY-MM-DD format. Defaults to today. Use the planned payment date if checking before sending money.'
          ),
      }),
    }
  );
}
