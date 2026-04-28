/**
 * Contractor Data Formatter
 * Formats contractor information for AI responses (localized)
 */

import { WFirmaContractor } from '../../../types/wfirma.types';
import { getContractorTranslations, Locale } from '../../../i18n';
import { sanitizeForPrompt } from '../utils';

export function formatContractorsList(contractors: WFirmaContractor[], locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);

  if (contractors.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.contractorsTitle} (${contractors.length})\n\n`;
  result += t.tableHeaders + '\n';
  result += '|---|----------|-----|-------|--------|\n';

  contractors.forEach((c, i) => {
    result += `| ${i + 1} | ${sanitizeForPrompt(c.name)} | ${c.nip ? sanitizeForPrompt(c.nip) : '-'} | ${c.email ? sanitizeForPrompt(c.email) : '-'} | ${c.phone ? sanitizeForPrompt(c.phone) : '-'} |\n`;
  });

  result += `\n> ${t.updateDeleteHint}`;

  return result;
}

export function formatContractorDetails(contractor: WFirmaContractor, locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);
  const addressStr = contractor.address
    ? `${sanitizeForPrompt(contractor.address.street)}, ${sanitizeForPrompt(contractor.address.zip)} ${sanitizeForPrompt(contractor.address.city)}`
    : '-';

  const name = sanitizeForPrompt(contractor.name);

  return `## ${t.contractorTitle}: ${name}

| ${t.field} | ${t.value} |
|------|----------|
| **${t.id}** | \`${contractor.id}\` |
| **${t.name}** | ${name} |
| **${t.nip}** | ${contractor.nip ? sanitizeForPrompt(contractor.nip) : '-'} |
| **${t.regon}** | ${contractor.regon ? sanitizeForPrompt(contractor.regon) : '-'} |
| **${t.email}** | ${contractor.email ? sanitizeForPrompt(contractor.email) : '-'} |
| **${t.phone}** | ${contractor.phone ? sanitizeForPrompt(contractor.phone) : '-'} |
| **${t.address}** | ${addressStr} |
| **${t.bankAccount}** | ${contractor.bankAccount ? sanitizeForPrompt(contractor.bankAccount) : '-'} |
| **${t.notes}** | ${contractor.notes ? sanitizeForPrompt(contractor.notes) : '-'} |`;
}

export function formatContractorCreated(
  contractor: WFirmaContractor,
  locale: Locale = 'pl',
  autoFilledFields: string[] = [],
): string {
  const t = getContractorTranslations(locale);
  const autofillNote = autoFilledFields.length > 0
    ? `\n> ✨ ${t.autoFilledFromRegistry}: ${autoFilledFields.join(', ')}\n`
    : '';
  return `## ✅ ${t.created}

${formatContractorDetails(contractor, locale)}
${autofillNote}
> ${t.createdHint}`;
}

export function formatContractorUpdated(contractor: WFirmaContractor, locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);
  return `## ✅ ${t.updated}

${formatContractorDetails(contractor, locale)}

> ${t.updatedHint}`;
}

export function formatContractorDeleted(contractor: WFirmaContractor, locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);
  return `## ❌ ${t.deleted}

- **${t.id}:** \`${contractor.id}\`
- **${t.name}:** ${sanitizeForPrompt(contractor.name)}
- **${t.nip}:** ${contractor.nip ? sanitizeForPrompt(contractor.nip) : '-'}

> ⚠️ ${t.deletedWarning}`;
}
