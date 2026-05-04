/**
 * Expense Data Formatter
 * Formats expense information for AI responses (localized)
 */

import { WFirmaExpense } from '../../../types/wfirma.types';
import { getExpenseTranslations, Locale } from '../../../i18n';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: Date, locale: Locale): string {
  const localeMap = {
    pl: 'pl-PL',
    en: 'en-US',
    ru: 'ru-RU',
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getPaymentMethodLabel(
  method: string | undefined,
  locale: Locale
): string {
  const t = getExpenseTranslations(locale);
  if (!method) return '-';

  const methodMap: Record<string, string> = {
    transfer: t.methodTransfer,
    cash: t.methodCash,
    card: t.methodCard,
    compensation: t.methodCompensation,
    other: t.methodOther,
  };
  return methodMap[method] || method;
}

function getExpenseTypeLabel(type: string, locale: Locale): string {
  const t = getExpenseTranslations(locale);
  const typeMap: Record<string, string> = {
    invoice: t.typeInvoice,
    bill: t.typeBill,
    vat_exempt: t.typeVatExempt,
  };
  return typeMap[type] || type;
}

function getAccountingEffectLabel(effect: string, locale: Locale): string {
  const t = getExpenseTranslations(locale);
  const effectMap: Record<string, string> = {
    kpir_and_vat: t.effectKpirAndVat,
    kpir: t.effectKpir,
    vat: t.effectVat,
    nothing: t.effectNothing,
  };
  return effectMap[effect] || effect;
}

/**
 * Format expenses list as table
 */
export function formatExpensesList(
  expenses: WFirmaExpense[],
  locale: Locale = 'pl'
): string {
  const t = getExpenseTranslations(locale);

  let result = `## ${t.expensesTitle} (${expenses.length})\n\n`;
  result += `| ${t.id} | ${t.date} | ${t.contractor} | ${t.total} | ${t.currency} | ${t.status} |\n`;
  result += '|------|------|-----------|--------|----------|--------|\n';

  let totalAmount = 0;
  let currency = '';

  expenses.forEach((e) => {
    totalAmount += e.total;
    if (e.currency) currency = e.currency;
    const statusLabel = e.paid ? t.paid : t.unpaid;
    const contractorDisplay = e.contractorName || '-';

    result += `| ${e.id} | ${formatDate(e.date, locale)} | ${contractorDisplay} | ${formatNumber(e.total)} | ${e.currency} | ${statusLabel} |\n`;
  });

  const totalDisplay = currency
    ? `${formatNumber(totalAmount)} ${currency}`
    : formatNumber(totalAmount);

  result += `\n**${t.totalSum}:** ${totalDisplay}`;

  return result;
}

/**
 * Format single expense details
 */
export function formatExpenseDetails(
  expense: WFirmaExpense,
  locale: Locale = 'pl'
): string {
  const t = getExpenseTranslations(locale);

  let result = `## ${t.expenseDetails}: ${expense.id}\n\n`;

  // Basic information
  result += `### ${t.basicInfo}\n\n`;
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.id}** | \`${expense.id}\` |\n`;
  result += `| **${t.type}** | ${getExpenseTypeLabel(expense.type, locale)} |\n`;
  result += `| **${t.date}** | ${formatDate(expense.date, locale)} |\n`;
  result += `| **${t.status}** | ${expense.paid ? t.paid : t.unpaid} |\n`;
  result += `| **${t.currency}** | ${expense.currency} |\n`;
  result += `| **${t.accountingEffect}** | ${getAccountingEffectLabel(expense.accountingEffect, locale)} |\n`;

  if (expense.contractorName) {
    result += `| **${t.contractor}** | ${expense.contractorName}`;
    if (expense.contractorNip) {
      result += ` (NIP: ${expense.contractorNip})`;
    }
    result += ' |\n';
  }

  // Payment information
  result += `\n### ${t.paymentInfo}\n\n`;
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|-------|-------|\n';

  if (expense.paymentDate) {
    result += `| **${t.paymentDate}** | ${formatDate(expense.paymentDate, locale)} |\n`;
  }

  if (expense.paymentMethod) {
    result += `| **${t.paymentMethod}** | ${getPaymentMethodLabel(expense.paymentMethod, locale)} |\n`;
  }

  if (expense.taxregisterDate) {
    result += `| **${t.taxregisterDate}** | ${formatDate(expense.taxregisterDate, locale)} |\n`;
  }

  // Expense parts/items
  if (expense.parts && expense.parts.length > 0) {
    result += `\n### ${t.expenseParts} (${expense.parts.length})\n\n`;
    result += `| ${t.name} | ${t.quantity} | ${t.unit} | ${t.priceNet} | ${t.vatRate} | ${t.totalGross} |\n`;
    result += '|------|----------|------|----------|----------|------------|\n';

    expense.parts.forEach((part) => {
      const name = part.name || '-';
      const unit = part.unit || '-';
      result += `| ${name} | ${formatNumber(part.count)} | ${unit} | ${formatNumber(part.price)} | ${part.vatCode} | ${formatNumber(part.totalGross)} |\n`;
    });
  }

  // Totals
  result += `\n### ${t.totals}\n\n`;
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.totalNet}** | ${formatNumber(expense.totalNet)} ${expense.currency} |\n`;
  result += `| **${t.totalVat}** | ${formatNumber(expense.totalVat)} ${expense.currency} |\n`;
  result += `| **${t.totalGross}** | ${formatNumber(expense.total)} ${expense.currency} |\n`;

  // Additional flags
  const flags: string[] = [];
  if (expense.wnt) flags.push(t.wnt);
  if (expense.splitPayment) flags.push(t.splitPayment);
  if (expense.serviceImport) flags.push(t.serviceImport);
  if (expense.serviceImport2) flags.push(t.serviceImport2);
  if (expense.cargoImport) flags.push(t.cargoImport);
  if (expense.draft) flags.push(t.draft);

  if (flags.length > 0) {
    result += `\n### ${t.additionalFlags}\n\n`;
    flags.forEach((flag) => {
      result += `- ${flag}\n`;
    });
  }

  return result;
}

/**
 * Format a successful "expense created from receipt" reply.
 * Compact card with id, contractor, date and totals — the full detail
 * view is one tap away in the wFirma UI.
 */
export function formatExpenseCreated(
  expense: WFirmaExpense,
  locale: Locale = 'pl',
): string {
  const t = getExpenseTranslations(locale);
  const contractor = expense.contractorName
    ? `${expense.contractorName}${expense.contractorNip ? ` (NIP ${expense.contractorNip})` : ''}`
    : '-';
  return `## ✅ ${t.created}

| ${t.field} | ${t.value} |
|-------|-------|
| **${t.id}** | \`${expense.id}\` |
| **${t.contractor}** | ${contractor} |
| **${t.date}** | ${formatDate(expense.date, locale)} |
| **${t.totalNet}** | ${formatNumber(expense.totalNet)} ${expense.currency} |
| **${t.totalVat}** | ${formatNumber(expense.totalVat)} ${expense.currency} |
| **${t.totalGross}** | ${formatNumber(expense.total)} ${expense.currency} |

> ${t.createdHint}`;
}
