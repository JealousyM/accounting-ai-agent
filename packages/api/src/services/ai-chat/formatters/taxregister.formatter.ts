/**
 * Tax Register (KPiR) Data Formatter
 * Formats tax register information for AI responses (localized)
 */

import { TaxRegisterResult, TaxRegisterEntry } from '../../../types/wfirma.types';
import { getTaxRegisterTranslations, Locale } from '../../../i18n';

function formatPLN(num: number): string {
  return num.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function hasContractor(entries: TaxRegisterEntry[]): boolean {
  return entries.some((e) => e.contractorName);
}

function formatEntryName(entry: TaxRegisterEntry): string {
  if (entry.description && entry.description !== entry.name) {
    return `${entry.name} / ${entry.description}`;
  }
  return entry.name;
}

const monthNames: Record<string, string[]> = {
  pl: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paz', 'Lis', 'Gru'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
};

function getMonthName(month: number, locale: Locale): string {
  const names = monthNames[locale] || monthNames['pl'];
  return names[month - 1] || String(month);
}

/**
 * Format tax register result for AI chat
 */
export function formatTaxRegisterResult(
  result: TaxRegisterResult,
  locale: Locale
): string {
  const t = getTaxRegisterTranslations(locale);
  const parts: string[] = [];

  parts.push(`## ${t.title}\n`);

  // Entries table
  if (result.entries.length > 0) {
    const showContractor = hasContractor(result.entries);

    parts.push(`### ${t.entries}\n`);

    let header = `| ${t.lp} | ${t.date} | ${t.name} | ${t.income} | ${t.expense} |`;
    let separator = '|-----|------|------|-------:|--------:|';

    if (showContractor) {
      header += ` ${t.contractor} |`;
      separator += '------------|';
    }

    parts.push(header);
    parts.push(separator);

    for (const entry of result.entries) {
      let row = `| ${entry.lp} | ${entry.date} | ${formatEntryName(entry)} | ${formatPLN(entry.income)} | ${formatPLN(entry.expense)} |`;
      if (showContractor) {
        row += ` ${entry.contractorName || '-'} |`;
      }
      parts.push(row);
    }

    parts.push('');
  } else {
    parts.push(`*${t.noEntries}*\n`);
  }

  // Monthly sums
  if (result.sums.length > 0) {
    parts.push(`### ${t.sums}\n`);
    parts.push(`| ${t.date} | ${t.income} | ${t.expense} |`);
    parts.push('|------|-------:|--------:|');

    for (const sum of result.sums) {
      parts.push(
        `| ${getMonthName(sum.month, locale)} | ${formatPLN(sum.income)} | ${formatPLN(sum.expense)} |`
      );
    }

    parts.push('');
  }

  // Total (cumulative) sums
  if (result.totalSums.length > 0) {
    parts.push(`### ${t.totalSums}\n`);
    parts.push(`| ${t.date} | ${t.income} | ${t.expense} |`);
    parts.push('|------|-------:|--------:|');

    for (const sum of result.totalSums) {
      parts.push(
        `| ${getMonthName(sum.month, locale)} | ${formatPLN(sum.income)} | ${formatPLN(sum.expense)} |`
      );
    }

    parts.push('');
  }

  // Summary line
  const totalIncome = result.totalSums.length > 0
    ? result.totalSums[result.totalSums.length - 1].income
    : result.sums.reduce((acc, s) => acc + s.income, 0);
  const totalExpense = result.totalSums.length > 0
    ? result.totalSums[result.totalSums.length - 1].expense
    : result.sums.reduce((acc, s) => acc + s.expense, 0);
  const diff = totalIncome - totalExpense;
  const profitOrLoss = diff >= 0 ? t.profit : t.loss;

  parts.push(
    `**${t.summary}:** ${t.income} ${formatPLN(totalIncome)} | ${t.expense} ${formatPLN(totalExpense)} | ${profitOrLoss}: ${formatPLN(Math.abs(diff))} PLN`
  );

  return parts.join('\n');
}
