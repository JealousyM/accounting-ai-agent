/**
 * Term Data Formatter
 * Formats term and term group information for AI responses (localized)
 */

import { WFirmaTerm, WFirmaTermGroup } from '../../../types/wfirma.types';
import { getTermTranslations, Locale } from '../../../i18n';

/**
 * Format term type for display
 */
export function formatTermType(type: string, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  switch (type) {
    case 'normal':
      return t.typeNormal;
    case 'cycle_day_of_week':
      return t.typeCycleDayOfWeek;
    case 'cycle_day_of_month':
      return t.typeCycleDayOfMonth;
    default:
      return type;
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | undefined, _locale: Locale = 'pl'): string {
  if (!date) return '-';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Format list of terms
 */
export function formatTermsList(terms: WFirmaTerm[], locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);

  if (terms.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.termsTitle} (${terms.length})\n\n`;
  result += `| # | ${t.date} | ${t.hour} | ${t.description} | ${t.type} | ${t.group} |\n`;
  result += '|---|------|-------|-------------|------|-------|\n';

  terms.forEach((term, i) => {
    const description = term.description
      ? (term.description.length > 30 ? term.description.substring(0, 30) + '...' : term.description)
      : '-';
    result += `| ${i + 1} | ${formatDate(term.date, locale)} | ${term.hour || '-'} | ${description} | ${formatTermType(term.type, locale)} | ${term.groupId || '-'} |\n`;
  });

  result += `\n> ${t.updateDeleteHint}`;

  return result;
}

/**
 * Format term details
 */
export function formatTermDetails(term: WFirmaTerm, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);

  let result = `## ${t.termDetails}\n\n`;

  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${term.id}\` |\n`;
  result += `| **${t.date}** | ${formatDate(term.date, locale)} |\n`;
  result += `| **${t.hour}** | ${term.hour || '-'} |\n`;
  result += `| **${t.description}** | ${term.description || '-'} |\n`;
  result += `| **${t.type}** | ${formatTermType(term.type, locale)} |\n`;
  result += `| **${t.groupId}** | ${term.groupId || '-'} |\n`;
  result += `| **${t.contractor}** | ${term.contractorId || '-'} |\n`;
  result += `| **${t.contact}** | ${term.contactId || '-'} |\n`;

  return result;
}

/**
 * Format term creation confirmation
 */
export function formatTermCreated(term: WFirmaTerm, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ✅ ${t.created}

${formatTermDetails(term, locale)}

> ${t.createdHint}`;
}

/**
 * Format term update confirmation
 */
export function formatTermUpdated(term: WFirmaTerm, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ✅ ${t.updated}

${formatTermDetails(term, locale)}

> ${t.updatedHint}`;
}

/**
 * Format term deletion confirmation
 */
export function formatTermDeleted(term: WFirmaTerm, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ❌ ${t.deleted}

- **${t.id}:** \`${term.id}\`
- **${t.date}:** ${formatDate(term.date, locale)}
- **${t.description}:** ${term.description || '-'}

> ⚠️ ${t.deletedWarning}`;
}

// ============================================
// TERM GROUP FORMATTERS
// ============================================

/**
 * Format list of term groups
 */
export function formatTermGroupsList(termGroups: WFirmaTermGroup[], locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);

  if (termGroups.length === 0) {
    return t.groupNotFound;
  }

  let result = `## ${t.termGroupsTitle} (${termGroups.length})\n\n`;
  result += `| # | ${t.name} | ${t.isReadonly} | ${t.id} |\n`;
  result += '|---|------|------------|-----|\n';

  termGroups.forEach((group, i) => {
    result += `| ${i + 1} | **${group.name}** | ${group.isReadonly ? t.yes : t.no} | \`${group.id}\` |\n`;
  });

  result += `\n> ${t.groupUpdateDeleteHint}`;

  return result;
}

/**
 * Format term group details
 */
export function formatTermGroupDetails(termGroup: WFirmaTermGroup, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);

  let result = `## ${t.termGroupDetails}: ${termGroup.name}\n\n`;

  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${termGroup.id}\` |\n`;
  result += `| **${t.name}** | ${termGroup.name} |\n`;
  result += `| **${t.isReadonly}** | ${termGroup.isReadonly ? t.yes : t.no} |\n`;

  return result;
}

/**
 * Format term group creation confirmation
 */
export function formatTermGroupCreated(termGroup: WFirmaTermGroup, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ✅ ${t.groupCreated}

${formatTermGroupDetails(termGroup, locale)}

> ${t.groupCreatedHint}`;
}

/**
 * Format term group update confirmation
 */
export function formatTermGroupUpdated(termGroup: WFirmaTermGroup, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ✅ ${t.groupUpdated}

${formatTermGroupDetails(termGroup, locale)}

> ${t.groupUpdatedHint}`;
}

/**
 * Format term group deletion confirmation
 */
export function formatTermGroupDeleted(termGroup: WFirmaTermGroup, locale: Locale = 'pl'): string {
  const t = getTermTranslations(locale);
  return `## ❌ ${t.groupDeleted}

- **${t.id}:** \`${termGroup.id}\`
- **${t.name}:** ${termGroup.name}

> ⚠️ ${t.groupDeletedWarning}`;
}
