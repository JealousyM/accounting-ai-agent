/**
 * Tax Calendar Formatter
 * Formats tax deadlines for AI responses (localized)
 */

import { TaxDeadline } from '../../../types/tax-calendar.types';
import { getTaxCalendarTranslations, Locale } from '../../../i18n';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStatus(date: Date, locale: Locale): string {
  const t = getTaxCalendarTranslations(locale);
  const today = new Date();
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);

  if (dateStr < todayStr) return t.statusOverdue;
  if (dateStr === todayStr) return t.statusToday;
  return t.statusUpcoming;
}

function getCategoryName(category: string, locale: Locale): string {
  const t = getTaxCalendarTranslations(locale);
  const map: Record<string, string> = {
    vat: t.categoryVat,
    cit: t.categoryCit,
    pit: t.categoryPit,
    zus: t.categoryZus,
    pcc: t.categoryPcc,
    dividend: t.categoryDividend,
  };
  return map[category] || category.toUpperCase();
}

export function formatTaxDeadlinesList(
  deadlines: TaxDeadline[],
  locale: Locale = 'pl',
): string {
  const t = getTaxCalendarTranslations(locale);

  // Filter out past deadlines — tax deadlines are statutory,
  // the system doesn't know if they were paid, so showing "overdue" is misleading
  const todayStr = formatDate(new Date());
  const activeDeadlines = deadlines.filter(d => formatDate(d.date) >= todayStr);

  if (activeDeadlines.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.deadlinesTitle} (${activeDeadlines.length})\n\n`;
  result += `| # | ${t.date} | ${t.name} | ${t.description} | ${t.category} | ${t.status} |\n`;
  result += '|---|------|------|-------------|----------|--------|\n';

  activeDeadlines.forEach((d, i) => {
    const status = getStatus(d.date, locale);
    const desc = d.description.length > 40
      ? d.description.substring(0, 40) + '...'
      : d.description;
    result += `| ${i + 1} | ${formatDate(d.date)} | **${d.name}** | ${desc} | ${getCategoryName(d.category, locale)} | ${status} |\n`;
  });

  result += `\n> ${t.shiftNote}\n> ${t.optionalNote}`;

  return result;
}
