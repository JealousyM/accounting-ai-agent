/**
 * Contractor Data Formatter
 * Formats contractor information for AI responses (localized)
 */

import { WFirmaContractor } from '../../../types/wfirma.types';
import { getContractorTranslations, Locale } from '../../../i18n';

export function formatContractorsList(contractors: WFirmaContractor[], locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);

  if (contractors.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.contractorsTitle} (${contractors.length})\n\n`;
  result += t.tableHeaders + '\n';
  result += '|---|----------|-----|-------|--------|\n';

  contractors.forEach((c, i) => {
    result += `| ${i + 1} | **${c.name}** | ${c.nip || '-'} | ${c.email || '-'} | ${c.phone || '-'} |\n`;
  });

  result += `\n> ${t.updateDeleteHint}`;

  return result;
}

export function formatContractorDetails(contractor: WFirmaContractor, locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);
  const addressStr = contractor.address
    ? `${contractor.address.street}, ${contractor.address.zip} ${contractor.address.city}`
    : '-';

  return `## ${t.contractorTitle}: ${contractor.name}

| ${t.field} | ${t.value} |
|------|----------|
| **${t.id}** | \`${contractor.id}\` |
| **${t.name}** | ${contractor.name} |
| **${t.nip}** | ${contractor.nip || '-'} |
| **${t.regon}** | ${contractor.regon || '-'} |
| **${t.email}** | ${contractor.email || '-'} |
| **${t.phone}** | ${contractor.phone || '-'} |
| **${t.address}** | ${addressStr} |
| **${t.bankAccount}** | ${contractor.bankAccount || '-'} |
| **${t.notes}** | ${contractor.notes || '-'} |`;
}

export function formatContractorCreated(contractor: WFirmaContractor, locale: Locale = 'pl'): string {
  const t = getContractorTranslations(locale);
  return `## ✅ ${t.created}

${formatContractorDetails(contractor, locale)}

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
- **${t.name}:** ${contractor.name}
- **${t.nip}:** ${contractor.nip || '-'}

> ⚠️ ${t.deletedWarning}`;
}
