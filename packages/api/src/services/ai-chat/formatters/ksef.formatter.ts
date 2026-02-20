/**
 * KSeF Data Formatter
 * Formats KSeF (Krajowy System e-Faktur) data for AI responses (localized)
 */

import {
  SendToKSeFResult,
  KSeFInvoiceStatusInfo,
  KSeFUPO,
  KSeFInvoiceListItem,
  KSeFStatistics,
  BulkSendToKSeFResult,
  KSeFIncomingMatch,
} from '../../../types/ksef.types';
import { getKSeFTranslations, Locale, KSeFTranslations } from '../../../i18n';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function getStatusLabel(status: string, t: KSeFTranslations): string {
  const labels: Record<string, string> = {
    pending: t.statusPending,
    sending: t.statusSending,
    sent: t.statusSent,
    accepted: t.statusAccepted,
    rejected: t.statusRejected,
    completed: t.statusCompleted,
    failed: t.statusFailed,
  };
  return labels[status] || status;
}

function getStatusEmoji(status: string): string {
  if (status === 'accepted' || status === 'completed') return '✅';
  if (status === 'rejected' || status === 'failed') return '❌';
  return '⏳';
}

function getAdapterLabel(adapter: string, t: KSeFTranslations): string {
  if (adapter === 'wfirma') return 'wFirma';
  if (adapter === 'direct') return t.directAPI;
  return adapter;
}

export function formatKSeFSendResult(result: SendToKSeFResult, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  if (!result.success) {
    let output = `## ❌ ${t.sendFailed}\n\n`;
    output += `| ${t.field} | ${t.value} |\n`;
    output += '|------|----------|\n';
    output += `| **${t.status}** | ${getStatusEmoji(result.status)} ${getStatusLabel(result.status, t)} |\n`;
    output += `| **${t.adapter}** | ${getAdapterLabel(result.adapter, t)} |\n`;
    output += `| **${t.errorReason}** | ${result.message} |\n`;
    output += `| **${t.timestamp}** | ${formatDateTime(result.timestamp)} |\n`;
    output += `\n> ⚠️ ${t.checkWFirmaConfig}`;
    return output;
  }

  let output = `## ✅ ${t.sendSuccess}\n\n`;
  output += `| ${t.field} | ${t.value} |\n`;
  output += '|------|----------|\n';
  output += `| **${t.referenceNumber}** | \`${result.referenceNumber}\` |\n`;
  output += `| **${t.status}** | ${getStatusEmoji(result.status)} ${getStatusLabel(result.status, t)} |\n`;
  output += `| **${t.adapter}** | ${getAdapterLabel(result.adapter, t)} |\n`;
  output += `| **${t.timestamp}** | ${formatDateTime(result.timestamp)} |\n`;
  output += `\n> ${t.statusCheckHint}`;

  return output;
}

export function formatKSeFStatus(status: KSeFInvoiceStatusInfo, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  const emoji = getStatusEmoji(status.status);

  let output = `## ${emoji} ${t.statusTitle}: ${status.invoiceNumber}\n\n`;
  output += `| ${t.field} | ${t.value} |\n`;
  output += '|------|----------|\n';
  output += `| **${t.referenceNumber}** | \`${status.referenceNumber}\` |\n`;
  output += `| **${t.invoiceNumber}** | ${status.invoiceNumber} |\n`;
  output += `| **${t.status}** | ${emoji} ${getStatusLabel(status.status, t)} |\n`;
  output += `| **${t.adapter}** | ${getAdapterLabel(status.adapter, t)} |\n`;

  if (status.sentAt) {
    output += `| **${t.sentAt}** | ${formatDateTime(status.sentAt)} |\n`;
  }
  if (status.acceptedAt) {
    output += `| **${t.acceptedAt}** | ${formatDateTime(status.acceptedAt)} |\n`;
  }
  if (status.rejectedAt) {
    output += `| **${t.rejectedAt}** | ${formatDateTime(status.rejectedAt)} |\n`;
  }

  if (status.errorMessage) {
    output += `\n> ❌ **${t.errorReason}:** ${status.errorMessage}`;
    if (status.errorCode) {
      output += ` (${status.errorCode})`;
    }
    output += '\n';
  }

  if (status.status === 'accepted' && status.upoAvailable) {
    output += `\n> ✅ ${t.upoAvailableHint}`;
  }

  return output;
}

export function formatKSeFUPO(upo: KSeFUPO, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  const fileSizeKB = (upo.upoContent.length / 1024).toFixed(1);

  let output = `## ✅ ${t.upoDownloaded}\n\n`;
  output += `| ${t.field} | ${t.value} |\n`;
  output += '|------|----------|\n';
  output += `| **${t.referenceNumber}** | \`${upo.referenceNumber}\` |\n`;
  output += `| **${t.fileName}** | ${upo.fileName} |\n`;
  output += `| **${t.fileSize}** | ${fileSizeKB} KB |\n`;
  output += `| **${t.timestamp}** | ${formatDateTime(upo.timestamp)} |\n`;
  output += `\n> ${t.upoSavedHint}`;

  return output;
}

export function formatKSeFInvoicesList(invoices: KSeFInvoiceListItem[], locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  if (invoices.length === 0) {
    return t.noInvoicesFound;
  }

  let output = `## ${t.invoicesTitle} (${invoices.length})\n\n`;
  output += t.tableHeaders + '\n';
  output += '|---|---------|------------|------|--------|--------|\n';

  invoices.forEach((inv, i) => {
    const directionEmoji = inv.direction === 'sent' ? '📤' : '📥';
    const statusEmoji = getStatusEmoji(inv.status);
    const statusLabel = getStatusLabel(inv.status, t);

    output += `| ${i + 1} | ${directionEmoji} ${inv.invoiceNumber} | ${inv.contractorName} | ${formatDate(inv.issueDate)} | ${formatNumber(inv.totalGross)} ${inv.currency} | ${statusEmoji} ${statusLabel} |\n`;
  });

  output += `\n> ${t.queryHint}`;

  return output;
}

export function formatKSeFStatistics(stats: KSeFStatistics, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  let output = `## ${t.statisticsTitle}\n\n`;

  output += `| ${t.field} | ${t.value} |\n`;
  output += '|------|----------|\n';
  output += `| **${t.totalSent}** | ${stats.totalSent} |\n`;
  output += `| **${t.totalReceived}** | ${stats.totalReceived} |\n`;
  output += `| **${t.accepted}** | ✅ ${stats.acceptedCount} |\n`;
  output += `| **${t.rejected}** | ❌ ${stats.rejectedCount} |\n`;
  output += `| **${t.pending}** | ⏳ ${stats.pendingCount} |\n`;
  output += `| **${t.completed}** | ${stats.completedCount} |\n`;

  if (stats.byMonth.length > 0) {
    output += `\n### ${t.monthlyTrend}\n\n`;
    output += `| ${t.field} | ${t.directionSent} | ${t.directionReceived} | ${t.accepted} | ${t.rejected} |\n`;
    output += '|------|------|----------|----------|----------|\n';

    stats.byMonth.forEach((m) => {
      output += `| ${m.month} | ${m.sent} | ${m.received} | ${m.accepted} | ${m.rejected} |\n`;
    });
  }

  return output;
}

export function formatKSeFBulkResult(result: BulkSendToKSeFResult, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  let output = `## ${t.bulkSendTitle}\n\n`;
  output += `**${t.bulkSendResult}:** ${result.total} | `;
  output += `**${t.bulkSuccessful}:** ✅ ${result.successful} | `;
  output += `**${t.bulkFailed}:** ❌ ${result.failed}\n\n`;

  const displayResults = result.results.slice(0, 10);

  displayResults.forEach((r) => {
    const emoji = r.success ? '✅' : '❌';
    const ref = r.referenceNumber ? ` (\`${r.referenceNumber}\`)` : '';
    output += `- ${emoji} ${r.message}${ref}\n`;
  });

  if (result.results.length > 10) {
    const remaining = result.results.length - 10;
    output += `\n... +${remaining} more\n`;
  }

  return output;
}

export function formatIncomingInvoicesList(invoices: KSeFInvoiceListItem[], locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  if (invoices.length === 0) {
    return t.noIncomingInvoices;
  }

  let output = `## \u{1F4E5} ${t.incomingTitle} (${invoices.length})\n\n`;
  output += t.incomingTableHeaders + '\n';
  output += '|---|---------|------------|------|--------|--------|\n';

  invoices.forEach((inv, i) => {
    const statusEmoji = getStatusEmoji(inv.status);
    const statusLabel = getStatusLabel(inv.status, t);

    output += `| ${i + 1} | ${inv.invoiceNumber} | ${inv.contractorName} | ${formatDate(inv.issueDate)} | ${formatNumber(inv.totalGross)} ${inv.currency} | ${statusEmoji} ${statusLabel} |\n`;
  });

  output += `\n> ${t.incomingMatchHint}`;

  return output;
}

export function formatIncomingInvoiceMatch(match: KSeFIncomingMatch, locale: Locale = 'pl'): string {
  const t = getKSeFTranslations(locale);

  const emoji = match.matched ? '\u2705' : '\u26A0\uFE0F';

  let output = `## ${emoji} ${t.incomingMatchTitle}\n\n`;
  output += `| ${t.field} | ${t.value} |\n`;
  output += '|------|----------|\n';
  output += `| **${t.referenceNumber}** | \`${match.referenceNumber}\` |\n`;
  output += `| **${t.invoiceNumber}** | ${match.ksefInvoiceNumber} |\n`;
  output += `| **${t.matchResult}** | ${match.matched ? t.matchFound : t.matchNotFound} |\n`;
  output += `| **${t.matchCount}** | ${match.matchCount} |\n`;

  if (match.matchedInvoices.length > 0) {
    output += `\n### ${t.matchedInvoicesTitle}\n\n`;
    output += `| # | ${t.invoiceNumber} | ${t.matchContractor} | ${t.matchAmount} | ${t.matchDate} |\n`;
    output += '|---|---------|------------|--------|------|\n';

    match.matchedInvoices.forEach((inv, i) => {
      output += `| ${i + 1} | ${inv.invoiceNumber} | ${inv.contractorName} | ${formatNumber(inv.totalGross)} ${inv.currency} | ${formatDate(inv.issueDate)} |\n`;
    });
  } else {
    output += `\n> ${t.noMatchHint}`;
  }

  return output;
}
