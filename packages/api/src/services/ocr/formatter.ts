/**
 * Markdown formatter for ParsedReceipt.
 * Used by the Telegram bot photo handler to show extracted data back to the user.
 */

import { Locale, getOcrTranslations } from '../../i18n';
import { ParsedReceipt } from './types';

function formatNumber(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '-';
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatParsedReceipt(receipt: ParsedReceipt, locale: Locale = 'pl'): string {
  const t = getOcrTranslations(locale);

  let out = `## 🧾 ${t.title}\n\n`;
  out += `| ${t.field} | ${t.value} |\n`;
  out += '|---|---|\n';
  out += `| **${t.documentType}** | ${t.documentTypeValues[receipt.documentType]} |\n`;
  if (receipt.sellerName) out += `| **${t.sellerName}** | ${receipt.sellerName} |\n`;
  if (receipt.sellerNip) out += `| **${t.sellerNip}** | \`${receipt.sellerNip}\` |\n`;
  if (receipt.sellerAddress) out += `| **${t.sellerAddress}** | ${receipt.sellerAddress} |\n`;
  if (receipt.documentNumber) out += `| **${t.documentNumber}** | \`${receipt.documentNumber}\` |\n`;
  if (receipt.issueDate) out += `| **${t.issueDate}** | ${receipt.issueDate} |\n`;
  if (receipt.totalNet !== undefined) {
    out += `| **${t.totalNet}** | ${formatNumber(receipt.totalNet)} ${receipt.currency} |\n`;
  }
  if (receipt.totalVat !== undefined) {
    out += `| **${t.totalVat}** | ${formatNumber(receipt.totalVat)} ${receipt.currency} |\n`;
  }
  out += `| **${t.totalGross}** | **${formatNumber(receipt.totalGross)} ${receipt.currency}** |\n`;
  if (receipt.confidence !== undefined) {
    const pct = Math.round(receipt.confidence * 100);
    out += `| **${t.confidence}** | ${pct}% |\n`;
  }
  out += '\n';

  if (receipt.items && receipt.items.length > 0) {
    out += `### ${t.itemsTitle}\n\n`;
    out += `| # | ${t.itemName} | ${t.itemQuantity} | ${t.itemVatRate} | ${t.itemTotal} |\n`;
    out += '|---|---|---|---|---|\n';
    receipt.items.forEach((item, i) => {
      out += `| ${i + 1} | ${item.name} | ${item.quantity ?? '-'} | ${item.vatRate ?? '-'}% | ${formatNumber(item.totalGross)} |\n`;
    });
    out += '\n';
  }

  if (receipt.notes) {
    out += `> ${t.notes}: ${receipt.notes}\n\n`;
  }

  out += `> ${t.confirmHint}\n`;
  return out;
}
