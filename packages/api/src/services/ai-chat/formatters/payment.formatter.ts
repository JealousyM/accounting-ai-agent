/**
 * Payment Data Formatter
 * Formats payment information for AI responses (localized)
 */

import { WFirmaPayment } from '../../../types/wfirma.types';
import { getPaymentTranslations, Locale } from '../../../i18n';

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
  const t = getPaymentTranslations(locale);
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

/**
 * Format payments list as table
 */
export function formatPaymentsList(
  payments: WFirmaPayment[],
  locale: Locale = 'pl'
): string {
  const t = getPaymentTranslations(locale);

  let result = `## ${t.paymentsTitle} (${payments.length})\n\n`;
  result += `| ${t.id} | ${t.objectType} | ${t.date} | ${t.amount} | ${t.method} | ${t.initial} |\n`;
  result += '|------|------------|------|--------|--------|--------|\n';

  let totalAmount = 0;
  let currency = '';

  payments.forEach((p) => {
    totalAmount += p.value;
    if (p.currency) currency = p.currency;
    const objectTypeLabel = p.objectName === 'invoice' ? t.invoice : t.expense;
    const initialMark = p.initial ? '✓' : '-';
    const methodLabel = getPaymentMethodLabel(p.paymentMethod, locale);

    const amountDisplay = p.currency
      ? `${formatNumber(p.value)} ${p.currency}`
      : formatNumber(p.value);

    result += `| ${p.id} | ${objectTypeLabel} | ${formatDate(p.date, locale)} | ${amountDisplay} | ${methodLabel} | ${initialMark} |\n`;
  });

  const totalDisplay = currency
    ? `${formatNumber(totalAmount)} ${currency}`
    : formatNumber(totalAmount);

  result += `\n**${t.total}:** ${totalDisplay}`;

  return result;
}

/**
 * Format single payment details
 */
export function formatPaymentDetails(
  payment: WFirmaPayment,
  locale: Locale = 'pl'
): string {
  const t = getPaymentTranslations(locale);

  let result = `## ${t.paymentDetails}: ${payment.id}\n\n`;

  result += `| ${t.field} | ${t.value} |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.id}** | \`${payment.id}\` |\n`;
  result += `| **${t.objectType}** | ${payment.objectName === 'invoice' ? t.invoice : t.expense} |\n`;
  result += `| **${t.objectId}** | ${payment.objectId} |\n`;

  const amountDisplay = payment.currency
    ? `${formatNumber(payment.value)} ${payment.currency}`
    : formatNumber(payment.value);
  result += `| **${t.amount}** | ${amountDisplay} |\n`;

  if (payment.valuePln) {
    result += `| **${t.amountPln}** | ${formatNumber(payment.valuePln)} PLN |\n`;
  }
  if (payment.account) {
    result += `| **${t.account}** | ${payment.account} |\n`;
  }

  result += `| **${t.date}** | ${formatDate(payment.date, locale)} |\n`;
  result += `| **${t.method}** | ${getPaymentMethodLabel(payment.paymentMethod, locale)} |\n`;
  result += `| **${t.initial}** | ${payment.initial ? t.yes : t.no} |\n`;

  if (payment.paymentType) {
    result += `| **${t.paymentType}** | ${payment.paymentType} |\n`;
  }

  return result;
}

/**
 * Format payment created confirmation
 */
export function formatPaymentCreated(
  payment: WFirmaPayment,
  invoiceNumber: string,
  currency?: string,
  locale: Locale = 'pl'
): string {
  const t = getPaymentTranslations(locale);

  const amountDisplay = currency
    ? `${formatNumber(payment.value)} ${currency}`
    : formatNumber(payment.value);

  return `## ✅ ${t.created}

- **${t.paymentId}:** \`${payment.id}\`
- **${t.invoice}:** ${invoiceNumber}
- **${t.amount}:** ${amountDisplay}
- **${t.date}:** ${formatDate(payment.date, locale)}
- **${t.method}:** ${getPaymentMethodLabel(payment.paymentMethod, locale)}

> ${t.createdHint}`;
}

/**
 * Format payment updated confirmation
 */
export function formatPaymentUpdated(
  payment: WFirmaPayment,
  locale: Locale = 'pl'
): string {
  const t = getPaymentTranslations(locale);

  return `## ✅ ${t.updated}

${formatPaymentDetails(payment, locale)}

> ${t.updatedHint}`;
}

/**
 * Format payment deleted confirmation
 */
export function formatPaymentDeleted(
  payment: WFirmaPayment,
  locale: Locale = 'pl'
): string {
  const t = getPaymentTranslations(locale);

  const amountDisplay = payment.currency
    ? `${formatNumber(payment.value)} ${payment.currency}`
    : formatNumber(payment.value);

  return `## ❌ ${t.deleted}

- **${t.paymentId}:** \`${payment.id}\`
- **${t.objectType}:** ${payment.objectName === 'invoice' ? t.invoice : t.expense}
- **${t.amount}:** ${amountDisplay}
- **${t.date}:** ${formatDate(payment.date, locale)}

> ⚠️ ${t.deletedWarning}`;
}
