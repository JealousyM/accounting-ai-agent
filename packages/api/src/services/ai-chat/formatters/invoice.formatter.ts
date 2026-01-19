/**
 * Invoice Data Formatter
 * Formats invoice information for AI responses (localized)
 */

import { WFirmaInvoice, WFirmaNote } from '../../../types/wfirma.types';
import { getInvoiceTranslations, Locale } from '../../../i18n';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getStatusLabel(status: string, locale: Locale): string {
  const t = getInvoiceTranslations(locale);
  const statusMap: Record<string, string> = {
    draft: t.draft,
    issued: t.issued,
    sent: t.sent,
    paid: t.paid,
    unpaid: t.unpaid,
    overdue: t.overdue,
    cancelled: t.cancelled,
  };
  return statusMap[status] || status;
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: '📝',
    issued: '📄',
    sent: '📧',
    paid: '✅',
    unpaid: '⏳',
    overdue: '⚠️',
    cancelled: '❌',
  };
  return iconMap[status] || '📄';
}

export function formatInvoicesList(invoices: WFirmaInvoice[], locale: Locale): string {
  const t = getInvoiceTranslations(locale);

  let result = `## ${t.invoices} (${invoices.length})\n\n`;
  result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.date} | ${t.dueDate} | ${t.grossAmount} | ${t.status} |\n`;
  result += '|------------------|------------|------|------|--------|--------|\n';

  let totalGross = 0;
  let hasOverdue = false;

  invoices.forEach(inv => {
    if (inv.status === 'overdue') hasOverdue = true;
    totalGross += inv.total;

    const statusIcon = getStatusIcon(inv.status);
    const statusText = getStatusLabel(inv.status, locale);

    result += `| ${inv.invoiceNumber} | ${inv.contractorName} | ${formatDate(inv.issueDate)} | ${formatDate(inv.dueDate)} | ${formatNumber(inv.total)} ${inv.currency} | ${statusIcon} ${statusText} |\n`;
  });

  result += `\n**${t.total}:** ${formatNumber(totalGross)} PLN`;

  if (hasOverdue) {
    result += `\n\n> ⚠️ ${t.overdueWarning}`;
  }

  return result;
}

export function formatInvoiceDetails(invoice: WFirmaInvoice, locale: Locale): string {
  const t = getInvoiceTranslations(locale);

  let result = `## ${t.invoiceNumber}: ${invoice.invoiceNumber}\n\n`;

  result += `| Field | Value |\n`;
  result += '|-------|-------|\n';
  result += `| ${t.invoiceNumber} | ${invoice.invoiceNumber} |\n`;
  result += `| ${t.contractor} | ${invoice.contractorName} |\n`;
  if (invoice.contractorNip) {
    result += `| NIP | ${invoice.contractorNip} |\n`;
  }
  result += `| ${t.date} | ${formatDate(invoice.issueDate)} |\n`;
  result += `| ${t.dueDate} | ${formatDate(invoice.dueDate)} |\n`;
  result += `| ${t.status} | ${getStatusIcon(invoice.status)} ${getStatusLabel(invoice.status, locale)} |\n`;

  if (invoice.items && invoice.items.length > 0) {
    result += `\n### ${t.items}\n\n`;
    result += `| # | Name | ${t.quantity} | ${t.unit} | ${t.priceNet} | ${t.vatRate} | ${t.grossAmount} |\n`;
    result += '|---|------|---------|------|----------|---------|--------|\n';

    invoice.items.forEach((item, idx) => {
      result += `| ${idx + 1} | ${item.name} | ${item.quantity} | ${item.unit} | ${formatNumber(item.priceNet)} | ${item.vatRate}% | ${formatNumber(item.totalGross)} |\n`;
    });
  }

  result += `\n### ${t.total}\n\n`;
  result += `| | Value |\n`;
  result += '|-------|-------|\n';
  result += `| ${t.netAmount} | ${formatNumber(invoice.totalNet)} ${invoice.currency} |\n`;
  result += `| ${t.vatAmount} | ${formatNumber(invoice.totalVat)} ${invoice.currency} |\n`;
  result += `| **${t.grossAmount}** | **${formatNumber(invoice.total)} ${invoice.currency}** |\n`;

  return result;
}

export function formatNotesList(notes: WFirmaNote[], invoiceNumber: string, locale: Locale): string {
  const t = getInvoiceTranslations(locale);

  let result = `## ${t.notesTitle} - ${invoiceNumber} (${notes.length})\n\n`;
  result += `| ID | ${t.noteText} | ${t.noteDate} |\n`;
  result += '|----|---------|------|\n';

  notes.forEach(note => {
    const text = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
    result += `| ${note.id} | ${text} | ${formatDate(note.created)} |\n`;
  });

  return result;
}
