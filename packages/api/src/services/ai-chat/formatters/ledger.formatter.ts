/**
 * Ledger Data Formatter
 * Formats fiscal years and accounting schemas for AI responses (localized)
 */

import {
  WFirmaLedgerAccountantYear,
  WFirmaLedgerOperationSchema,
} from '../../../types/wfirma.types';
import { getLedgerTranslations, Locale } from '../../../i18n';

/**
 * Format date for display
 */
function formatDate(date: Date | undefined, _locale: Locale = 'pl'): string {
  if (!date) return '-';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ============================================
// FISCAL YEARS FORMATTERS
// ============================================

/**
 * Format list of fiscal years
 */
export function formatFiscalYearsList(
  years: WFirmaLedgerAccountantYear[],
  locale: Locale = 'pl'
): string {
  const t = getLedgerTranslations(locale);

  if (years.length === 0) {
    return t.fiscalYearNotFound;
  }

  let result = `## ${t.fiscalYearsTitle} (${years.length})\n\n`;
  result += `| # | ${t.symbol} | ${t.startDate} | ${t.endDate} | ${t.id} |\n`;
  result += '|---|--------|------------|----------|-----|\n';

  years.forEach((y, i) => {
    result += `| ${i + 1} | **${y.symbol}** | ${formatDate(y.start, locale)} | ${formatDate(y.stop, locale)} | \`${y.id}\` |\n`;
  });

  return result;
}

/**
 * Format fiscal year details
 */
export function formatFiscalYearDetails(
  year: WFirmaLedgerAccountantYear,
  locale: Locale = 'pl'
): string {
  const t = getLedgerTranslations(locale);

  let result = `## ${t.fiscalYearDetails}: ${year.symbol}\n\n`;

  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${year.id}\` |\n`;
  result += `| **${t.symbol}** | ${year.symbol} |\n`;
  result += `| **${t.startDate}** | ${formatDate(year.start, locale)} |\n`;
  result += `| **${t.endDate}** | ${formatDate(year.stop, locale)} |\n`;

  return result;
}

// ============================================
// OPERATION SCHEMAS FORMATTERS
// ============================================

/**
 * Format list of operation schemas
 */
export function formatOperationSchemasList(
  schemas: WFirmaLedgerOperationSchema[],
  locale: Locale = 'pl'
): string {
  const t = getLedgerTranslations(locale);

  if (schemas.length === 0) {
    return t.operationSchemaNotFound;
  }

  let result = `## ${t.operationSchemasTitle} (${schemas.length})\n\n`;
  result += `| # | ${t.name} | ${t.category} | ${t.visibility} | ${t.fiscalYear} | ${t.id} |\n`;
  result += '|---|------|----------|------------|-------------|-----|\n';

  schemas.forEach((s, i) => {
    const yearInfo = s.ledgerAccountantYear?.symbol || s.ledgerAccountantYearId || '-';
    result += `| ${i + 1} | **${s.name}** | ${s.category || '-'} | ${s.visibility || '-'} | ${yearInfo} | \`${s.id}\` |\n`;
  });

  return result;
}

/**
 * Format operation schema details
 */
export function formatOperationSchemaDetails(
  schema: WFirmaLedgerOperationSchema,
  locale: Locale = 'pl'
): string {
  const t = getLedgerTranslations(locale);

  let result = `## ${t.operationSchemaDetails}: ${schema.name}\n\n`;

  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${schema.id}\` |\n`;
  result += `| **${t.name}** | ${schema.name} |\n`;
  result += `| **${t.category}** | ${schema.category || '-'} |\n`;
  result += `| **${t.visibility}** | ${schema.visibility || '-'} |\n`;

  // Fiscal year info
  if (schema.ledgerAccountantYear) {
    const year = schema.ledgerAccountantYear;
    result += `| **${t.fiscalYear}** | ${year.symbol} (${formatDate(year.start, locale)} - ${formatDate(year.stop, locale)}) |\n`;
  } else if (schema.ledgerAccountantYearId) {
    result += `| **${t.fiscalYear}** | ID: \`${schema.ledgerAccountantYearId}\` |\n`;
  }

  return result;
}
