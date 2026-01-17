/**
 * Invoice Agent
 * Specialized agent for invoice management
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { WFirmaCacheService } from '../services/wfirma-cache.service';
import { wfirmaCacheService } from '../services/wfirma-cache.instance';
import { logger } from '../utils/logger';

const TRANSLATIONS: Record<Locale, {
  invoices: string;
  invoiceNumber: string;
  contractor: string;
  date: string;
  dueDate: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  status: string;
  paid: string;
  unpaid: string;
  overdue: string;
  noInvoices: string;
  errorFetch: string;
  total: string;
  unpaidTotal: string;
  overdueWarning: string;
}> = {
  pl: {
    invoices: 'Faktury',
    invoiceNumber: 'Nr faktury',
    contractor: 'Kontrahent',
    date: 'Data wystawienia',
    dueDate: 'Termin płatności',
    netAmount: 'Netto',
    vatAmount: 'VAT',
    grossAmount: 'Brutto',
    status: 'Status',
    paid: 'Opłacona',
    unpaid: 'Nieopłacona',
    overdue: 'Przeterminowana',
    noInvoices: 'Brak faktur w wybranym okresie.',
    errorFetch: 'Błąd pobierania faktur',
    total: 'Razem',
    unpaidTotal: 'Do zapłaty',
    overdueWarning: 'Uwaga: Są przeterminowane faktury!',
  },
  en: {
    invoices: 'Invoices',
    invoiceNumber: 'Invoice No.',
    contractor: 'Contractor',
    date: 'Issue Date',
    dueDate: 'Due Date',
    netAmount: 'Net',
    vatAmount: 'VAT',
    grossAmount: 'Gross',
    status: 'Status',
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    noInvoices: 'No invoices found for the selected period.',
    errorFetch: 'Error fetching invoices',
    total: 'Total',
    unpaidTotal: 'Amount Due',
    overdueWarning: 'Warning: There are overdue invoices!',
  },
  ru: {
    invoices: 'Счета-фактуры',
    invoiceNumber: '№ счета',
    contractor: 'Контрагент',
    date: 'Дата выставления',
    dueDate: 'Срок оплаты',
    netAmount: 'Нетто',
    vatAmount: 'НДС',
    grossAmount: 'Брутто',
    status: 'Статус',
    paid: 'Оплачен',
    unpaid: 'Не оплачен',
    overdue: 'Просрочен',
    noInvoices: 'Счета-фактуры за выбранный период не найдены.',
    errorFetch: 'Ошибка получения счетов',
    total: 'Итого',
    unpaidTotal: 'К оплате',
    overdueWarning: 'Внимание: Есть просроченные счета!',
  },
};

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś specjalistą ds. fakturowania w systemie wFirma.

## Twoje zadania:
- Wyszukiwanie faktur po dacie, kontrahentach lub statusie
- Analiza stanu należności i zobowiązań
- Monitorowanie przeterminowanych płatności
- Raportowanie faktur według okresów

## Zasady:
- Prezentuj faktury w tabelach markdown
- Wyróżniaj przeterminowane faktury (⚠️)
- Obliczaj sumy należności/zobowiązań
- Używaj polskiego formatu dat (DD.MM.YYYY)

## Ważne:
- Wszystkie kwoty w PLN
- Ostrzegaj o zbliżających się terminach płatności
- Grupuj faktury według statusu gdy potrzeba`,

  en: `You are an invoicing specialist for the wFirma system.

## Your tasks:
- Search invoices by date, contractors, or status
- Analyze receivables and payables
- Monitor overdue payments
- Report invoices by period

## Rules:
- Present invoices in markdown tables
- Highlight overdue invoices (⚠️)
- Calculate receivables/payables totals
- Use Polish date format (DD.MM.YYYY)

## Important:
- All amounts in PLN
- Warn about upcoming payment deadlines
- Group invoices by status when needed`,

  ru: `Вы специалист по счетам-фактурам в системе wFirma.

## Ваши задачи:
- Поиск счетов по дате, контрагентам или статусу
- Анализ дебиторской и кредиторской задолженности
- Мониторинг просроченных платежей
- Отчетность по счетам за периоды

## Правила:
- Представляйте счета в markdown таблицах
- Выделяйте просроченные счета (⚠️)
- Рассчитывайте суммы задолженностей
- Используйте польский формат дат (DD.MM.YYYY)

## Важно:
- Все суммы в PLN
- Предупреждайте о приближающихся сроках оплаты
- Группируйте счета по статусу при необходимости`,
};

// Invoice interface (simplified for this agent)
interface Invoice {
  id: string;
  number: string;
  contractorName: string;
  issueDate: string;
  dueDate: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  isPaid: boolean;
}

export class InvoiceAgent extends BaseAgent {
  readonly name: AgentType = 'invoice';
  readonly description = 'Invoice management and tracking specialist';

  private cacheService: WFirmaCacheService;

  constructor(
    provider: LLMProvider = 'openai',
    cache?: WFirmaCacheService
  ) {
    super(provider, 10);
    this.cacheService = cache || wfirmaCacheService;
  }

  getSystemPrompt(locale: Locale): string {
    return SYSTEM_PROMPTS[locale] || SYSTEM_PROMPTS.pl;
  }

  getTools(context: AgentContext): StructuredToolInterface[] {
    const { userId, locale } = context;
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    // Get invoices tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInvoicesTool: StructuredToolInterface = (tool as any)(
      async ({ year, month, status }: { year?: number; month?: number; status?: string }) => {
        try {
          // Note: This would call wfirmaService.getInvoices() when implemented
          // For now, return a placeholder or cached data
          const cacheKey = `invoices_${year || 'all'}_${month || 'all'}_${status || 'all'}`;
          const cached = await this.cacheService.getCachedData<Invoice[]>(
            userId,
            'invoice',
            cacheKey
          );

          if (cached) {
            return this.formatInvoicesList(cached, locale);
          }

          // Placeholder: In production, this would call the wFirma API
          return t.noInvoices;
        } catch (error) {
          logger.error('Failed to fetch invoices', { error, userId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_invoices',
        description: 'Get list of invoices. Can filter by year, month, and payment status.',
        schema: z.object({
          year: z.number().optional().describe('Filter by year (e.g., 2024)'),
          month: z.number().min(1).max(12).optional().describe('Filter by month (1-12)'),
          status: z.enum(['all', 'paid', 'unpaid', 'overdue']).optional().describe('Filter by payment status'),
        }),
      }
    );

    // Get unpaid invoices tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getUnpaidInvoicesTool: StructuredToolInterface = (tool as any)(
      async () => {
        try {
          const cacheKey = 'invoices_unpaid';
          const cached = await this.cacheService.getCachedData<Invoice[]>(
            userId,
            'invoice',
            cacheKey
          );

          if (cached) {
            const unpaid = cached.filter(inv => !inv.isPaid);
            return this.formatUnpaidSummary(unpaid, locale);
          }

          return t.noInvoices;
        } catch (error) {
          logger.error('Failed to fetch unpaid invoices', { error, userId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_unpaid_invoices',
        description: 'Get all unpaid invoices with overdue warnings.',
        schema: z.object({}),
      }
    );

    // Invoice summary tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInvoiceSummaryTool: StructuredToolInterface = (tool as any)(
      async ({ year, month }: { year: number; month?: number }) => {
        try {
          // This would aggregate invoice data
          const summary = {
            totalInvoices: 0,
            paidInvoices: 0,
            unpaidInvoices: 0,
            overdueInvoices: 0,
            totalGross: 0,
            totalPaid: 0,
            totalUnpaid: 0,
          };

          return this.formatInvoiceSummary(summary, year, month, locale);
        } catch (error) {
          logger.error('Failed to generate invoice summary', { error, userId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_invoice_summary',
        description: 'Get summary of invoices for a period (counts, totals, status breakdown).',
        schema: z.object({
          year: z.number().describe('Year for summary'),
          month: z.number().min(1).max(12).optional().describe('Month for summary (optional)'),
        }),
      }
    );

    return [
      getInvoicesTool,
      getUnpaidInvoicesTool,
      getInvoiceSummaryTool,
    ];
  }

  // Formatting helpers
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  private formatInvoicesList(invoices: Invoice[], locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (invoices.length === 0) {
      return t.noInvoices;
    }

    let result = `## ${t.invoices} (${invoices.length})\n\n`;
    result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.date} | ${t.grossAmount} | ${t.status} |\n`;
    result += '|------------------|------------|------|--------|--------|\n';

    let totalGross = 0;
    let hasOverdue = false;

    invoices.forEach(inv => {
      const overdue = !inv.isPaid && this.isOverdue(inv.dueDate);
      if (overdue) hasOverdue = true;
      totalGross += inv.grossAmount;

      const statusIcon = inv.isPaid ? '✅' : (overdue ? '⚠️' : '⏳');
      const statusText = inv.isPaid ? t.paid : (overdue ? t.overdue : t.unpaid);

      result += `| ${inv.number} | ${inv.contractorName} | ${inv.issueDate} | ${this.formatNumber(inv.grossAmount)} PLN | ${statusIcon} ${statusText} |\n`;
    });

    result += `\n**${t.total}:** ${this.formatNumber(totalGross)} PLN`;

    if (hasOverdue) {
      result += `\n\n> ⚠️ ${t.overdueWarning}`;
    }

    return result;
  }

  private formatUnpaidSummary(invoices: Invoice[], locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (invoices.length === 0) {
      return t.noInvoices;
    }

    const overdue = invoices.filter(inv => this.isOverdue(inv.dueDate));
    const upcoming = invoices.filter(inv => !this.isOverdue(inv.dueDate));

    let result = `## ${t.unpaidTotal}\n\n`;

    if (overdue.length > 0) {
      result += `### ⚠️ ${t.overdue} (${overdue.length})\n\n`;
      result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.dueDate} | ${t.grossAmount} |\n`;
      result += '|------------------|------------|------|--------|\n';

      let overdueTotal = 0;
      overdue.forEach(inv => {
        overdueTotal += inv.grossAmount;
        result += `| ${inv.number} | ${inv.contractorName} | ${inv.dueDate} | ${this.formatNumber(inv.grossAmount)} PLN |\n`;
      });
      result += `\n**${t.total}:** ${this.formatNumber(overdueTotal)} PLN\n\n`;
    }

    if (upcoming.length > 0) {
      result += `### ⏳ ${t.unpaid} (${upcoming.length})\n\n`;
      result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.dueDate} | ${t.grossAmount} |\n`;
      result += '|------------------|------------|------|--------|\n';

      let upcomingTotal = 0;
      upcoming.forEach(inv => {
        upcomingTotal += inv.grossAmount;
        result += `| ${inv.number} | ${inv.contractorName} | ${inv.dueDate} | ${this.formatNumber(inv.grossAmount)} PLN |\n`;
      });
      result += `\n**${t.total}:** ${this.formatNumber(upcomingTotal)} PLN`;
    }

    return result;
  }

  private formatInvoiceSummary(
    summary: {
      totalInvoices: number;
      paidInvoices: number;
      unpaidInvoices: number;
      overdueInvoices: number;
      totalGross: number;
      totalPaid: number;
      totalUnpaid: number;
    },
    year: number,
    month: number | undefined,
    locale: Locale
  ): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const period = month ? `${month.toString().padStart(2, '0')}/${year}` : year.toString();

    let result = `## ${t.invoices} - ${period}\n\n`;
    result += `| Metric | Value |\n`;
    result += '|--------|-------|\n';
    result += `| ${t.total} ${t.invoices.toLowerCase()} | ${summary.totalInvoices} |\n`;
    result += `| ${t.paid} | ${summary.paidInvoices} |\n`;
    result += `| ${t.unpaid} | ${summary.unpaidInvoices} |\n`;
    result += `| ${t.overdue} | ${summary.overdueInvoices} |\n`;
    result += `| ${t.grossAmount} | ${this.formatNumber(summary.totalGross)} PLN |\n`;
    result += `| ${t.unpaidTotal} | ${this.formatNumber(summary.totalUnpaid)} PLN |\n`;

    return result;
  }
}
