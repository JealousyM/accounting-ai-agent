/**
 * Biała Lista Formatter
 * Formats MF White List bank-account verification results for AI responses.
 */

import { Locale, getBialaListaTranslations } from '../../../i18n';
import { BankAccountVerification } from '../../../types/wfirma.types';

export function formatBankAccountVerification(
  result: BankAccountVerification,
  locale: Locale = 'pl'
): string {
  const t = getBialaListaTranslations(locale);
  const matched = result.accountAssigned;
  const statusIcon = matched ? '✅' : '⚠️';
  const statusText = matched ? t.statusMatch : t.statusNoMatch;

  let out = `## ${t.verificationTitle}\n\n`;
  out += `${statusIcon} **${statusText}**\n\n`;
  out += `| ${t.field} | ${t.value} |\n`;
  out += '|---|---|\n';
  out += `| **${t.nip}** | \`${result.nip}\` |\n`;
  out += `| **${t.accountNumber}** | \`${result.accountNumber}\` |\n`;
  out += `| **${t.checkDate}** | ${result.date} |\n`;
  if (result.requestId) {
    out += `| **${t.requestId}** | \`${result.requestId}\` |\n`;
  }
  out += '\n';
  out += matched ? `> 💡 ${t.matchHint}\n\n` : `> 🚨 ${t.noMatchHint}\n\n`;
  out += `> ℹ️ ${t.legalNote15k}\n\n`;
  out += `*${t.disclaimer}*\n`;
  return out;
}
