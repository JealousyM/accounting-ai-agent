/**
 * Financial Data Formatter
 * Formats financial information for AI responses
 */

import { FinancialData } from '../../../types/wfirma.types';

export function formatFinancialData(data: FinancialData): string {
  const formatNumber = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2 });
  return `Financial Summary for ${data.year}:
- Revenue: ${formatNumber(data.revenue)} PLN
- Expenses: ${formatNumber(data.expenses)} PLN
- Profit: ${formatNumber(data.profit)} PLN
- Tax Paid: ${formatNumber(data.taxPaid)} PLN
${data.vatPaid !== undefined ? `- VAT Paid: ${formatNumber(data.vatPaid)} PLN` : ''}
${data.pitPaid !== undefined ? `- PIT Paid: ${formatNumber(data.pitPaid)} PLN` : ''}
${data.zusPaid !== undefined ? `- ZUS Paid: ${formatNumber(data.zusPaid)} PLN` : ''}`;
}
