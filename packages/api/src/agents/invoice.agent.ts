/**
 * Invoice Agent
 * Specialized agent for invoice management with wFirma integration
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { WFirmaCacheService } from '../services/wfirma-cache.service';
import { WFirmaIntegrationService } from '../services/wfirma';
import { wfirmaCacheService } from '../services/wfirma-cache.instance';
import { wfirmaIntegrationService } from '../services/wfirma-integration.instance';
import { WFirmaInvoice, WFirmaNote } from '../types/wfirma.types';
import { logger } from '../utils/logger';

const TRANSLATIONS: Record<Locale, {
  invoices: string;
  invoiceNumber: string;
  contractor: string;
  date: string;
  dueDate: string;
  sellDate: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  status: string;
  paid: string;
  unpaid: string;
  overdue: string;
  draft: string;
  issued: string;
  sent: string;
  cancelled: string;
  noInvoices: string;
  errorFetch: string;
  total: string;
  unpaidTotal: string;
  overdueWarning: string;
  invoiceDetails: string;
  items: string;
  quantity: string;
  unit: string;
  priceNet: string;
  vatRate: string;
  notFound: string;
  sendSuccess: string;
  sendSuccessHint: string;
  errorSend: string;
  noteAdded: string;
  noteDeleted: string;
  noteEdited: string;
  notesTitle: string;
  noNotes: string;
  noteText: string;
  noteDate: string;
  errorAddNote: string;
  paymentMethod: string;
  currency: string;
}> = {
  pl: {
    invoices: 'Faktury',
    invoiceNumber: 'Nr faktury',
    contractor: 'Kontrahent',
    date: 'Data wystawienia',
    dueDate: 'Termin płatności',
    sellDate: 'Data sprzedaży',
    netAmount: 'Netto',
    vatAmount: 'VAT',
    grossAmount: 'Brutto',
    status: 'Status',
    paid: 'Opłacona',
    unpaid: 'Nieopłacona',
    overdue: 'Przeterminowana',
    draft: 'Szkic',
    issued: 'Wystawiona',
    sent: 'Wysłana',
    cancelled: 'Anulowana',
    noInvoices: 'Brak faktur w wybranym okresie.',
    errorFetch: 'Błąd pobierania faktur',
    total: 'Razem',
    unpaidTotal: 'Do zapłaty',
    overdueWarning: 'Uwaga: Są przeterminowane faktury!',
    invoiceDetails: 'Szczegóły faktury',
    items: 'Pozycje',
    quantity: 'Ilość',
    unit: 'Jednostka',
    priceNet: 'Cena netto',
    vatRate: 'Stawka VAT',
    notFound: 'Nie znaleziono faktury o podanym numerze.',
    sendSuccess: 'Faktura została wysłana',
    sendSuccessHint: 'Email został wysłany na adres',
    errorSend: 'Błąd wysyłania faktury',
    noteAdded: 'Notatka została dodana',
    noteDeleted: 'Notatka została usunięta',
    noteEdited: 'Notatka została zaktualizowana',
    notesTitle: 'Notatki',
    noNotes: 'Brak notatek dla tej faktury.',
    noteText: 'Treść',
    noteDate: 'Data',
    errorAddNote: 'Błąd dodawania notatki',
    paymentMethod: 'Metoda płatności',
    currency: 'Waluta',
  },
  en: {
    invoices: 'Invoices',
    invoiceNumber: 'Invoice No.',
    contractor: 'Contractor',
    date: 'Issue Date',
    dueDate: 'Due Date',
    sellDate: 'Sale Date',
    netAmount: 'Net',
    vatAmount: 'VAT',
    grossAmount: 'Gross',
    status: 'Status',
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    draft: 'Draft',
    issued: 'Issued',
    sent: 'Sent',
    cancelled: 'Cancelled',
    noInvoices: 'No invoices found for the selected period.',
    errorFetch: 'Error fetching invoices',
    total: 'Total',
    unpaidTotal: 'Amount Due',
    overdueWarning: 'Warning: There are overdue invoices!',
    invoiceDetails: 'Invoice Details',
    items: 'Items',
    quantity: 'Quantity',
    unit: 'Unit',
    priceNet: 'Net Price',
    vatRate: 'VAT Rate',
    notFound: 'Invoice not found with the given number.',
    sendSuccess: 'Invoice has been sent',
    sendSuccessHint: 'Email was sent to',
    errorSend: 'Error sending invoice',
    noteAdded: 'Note has been added',
    noteDeleted: 'Note has been deleted',
    noteEdited: 'Note has been updated',
    notesTitle: 'Notes',
    noNotes: 'No notes for this invoice.',
    noteText: 'Content',
    noteDate: 'Date',
    errorAddNote: 'Error adding note',
    paymentMethod: 'Payment Method',
    currency: 'Currency',
  },
  ru: {
    invoices: 'Счета-фактуры',
    invoiceNumber: '№ счета',
    contractor: 'Контрагент',
    date: 'Дата выставления',
    dueDate: 'Срок оплаты',
    sellDate: 'Дата продажи',
    netAmount: 'Нетто',
    vatAmount: 'НДС',
    grossAmount: 'Брутто',
    status: 'Статус',
    paid: 'Оплачен',
    unpaid: 'Не оплачен',
    overdue: 'Просрочен',
    draft: 'Черновик',
    issued: 'Выставлен',
    sent: 'Отправлен',
    cancelled: 'Отменён',
    noInvoices: 'Счета-фактуры за выбранный период не найдены.',
    errorFetch: 'Ошибка получения счетов',
    total: 'Итого',
    unpaidTotal: 'К оплате',
    overdueWarning: 'Внимание: Есть просроченные счета!',
    invoiceDetails: 'Детали счёта',
    items: 'Позиции',
    quantity: 'Количество',
    unit: 'Единица',
    priceNet: 'Цена нетто',
    vatRate: 'Ставка НДС',
    notFound: 'Счёт с указанным номером не найден.',
    sendSuccess: 'Счёт был отправлен',
    sendSuccessHint: 'Email отправлен на адрес',
    errorSend: 'Ошибка отправки счёта',
    noteAdded: 'Заметка добавлена',
    noteDeleted: 'Заметка удалена',
    noteEdited: 'Заметка обновлена',
    notesTitle: 'Заметки',
    noNotes: 'Нет заметок для этого счёта.',
    noteText: 'Содержание',
    noteDate: 'Дата',
    errorAddNote: 'Ошибка добавления заметки',
    paymentMethod: 'Способ оплаты',
    currency: 'Валюта',
  },
};

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś specjalistą ds. fakturowania w systemie wFirma.

## Twoje zadania:
- Wyszukiwanie faktur po dacie, kontrahentach lub statusie
- Wyświetlanie szczegółów faktur
- Wysyłanie faktur emailem do kontrahentów
- Zarządzanie notatkami na fakturach
- Analiza stanu należności i zobowiązań
- Monitorowanie przeterminowanych płatności

## Zasady:
- Prezentuj faktury w tabelach markdown
- Wyróżniaj przeterminowane faktury (⚠️)
- Obliczaj sumy należności/zobowiązań
- Używaj polskiego formatu dat (DD.MM.YYYY)
- Przy wysyłaniu faktury zawsze potwierdzaj akcję

## Ważne:
- Wszystkie kwoty w PLN (chyba że faktura jest w innej walucie)
- Ostrzegaj o zbliżających się terminach płatności
- Grupuj faktury według statusu gdy potrzeba`,

  en: `You are an invoicing specialist for the wFirma system.

## Your tasks:
- Search invoices by date, contractors, or status
- Display invoice details
- Send invoices via email to contractors
- Manage invoice notes
- Analyze receivables and payables
- Monitor overdue payments

## Rules:
- Present invoices in markdown tables
- Highlight overdue invoices (⚠️)
- Calculate receivables/payables totals
- Use Polish date format (DD.MM.YYYY)
- Always confirm when sending an invoice

## Important:
- All amounts in PLN (unless invoice is in another currency)
- Warn about upcoming payment deadlines
- Group invoices by status when needed`,

  ru: `Вы специалист по счетам-фактурам в системе wFirma.

## Ваши задачи:
- Поиск счетов по дате, контрагентам или статусу
- Отображение деталей счетов
- Отправка счетов по email контрагентам
- Управление заметками к счетам
- Анализ дебиторской и кредиторской задолженности
- Мониторинг просроченных платежей

## Правила:
- Представляйте счета в markdown таблицах
- Выделяйте просроченные счета (⚠️)
- Рассчитывайте суммы задолженностей
- Используйте польский формат дат (DD.MM.YYYY)
- Всегда подтверждайте при отправке счёта

## Важно:
- Все суммы в PLN (если счёт не в другой валюте)
- Предупреждайте о приближающихся сроках оплаты
- Группируйте счета по статусу при необходимости`,
};

export class InvoiceAgent extends BaseAgent {
  readonly name: AgentType = 'invoice';
  readonly description = 'Invoice management and tracking specialist with wFirma integration';

  private cacheService: WFirmaCacheService;
  private wfirmaService: WFirmaIntegrationService;

  constructor(
    provider: LLMProvider = 'openai',
    cache?: WFirmaCacheService,
    wfirma?: WFirmaIntegrationService
  ) {
    super(provider, 10);
    this.cacheService = cache || wfirmaCacheService;
    this.wfirmaService = wfirma || wfirmaIntegrationService;
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
          // Build date filters
          let dateFrom: Date | undefined;
          let dateTo: Date | undefined;

          if (year) {
            dateFrom = new Date(year, month ? month - 1 : 0, 1);
            dateTo = month
              ? new Date(year, month, 0) // Last day of the month
              : new Date(year, 11, 31);
          }

          const invoices = await this.wfirmaService.findInvoices({
            dateFrom,
            dateTo,
            status: status && status !== 'all' ? status as any : undefined,
            limit: 100,
          });

          if (invoices.length === 0) {
            return t.noInvoices;
          }

          // Cache the results
          const cacheKey = `invoices_${year || 'all'}_${month || 'all'}_${status || 'all'}`;
          await this.cacheService.cacheData(userId, 'invoice', cacheKey, invoices);

          return this.formatInvoicesList(invoices, locale);
        } catch (error) {
          logger.error('Failed to fetch invoices', { error, userId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_invoices',
        description: 'Get list of invoices from wFirma. Can filter by year, month, and payment status.',
        schema: z.object({
          year: z.number().optional().describe('Filter by year (e.g., 2024)'),
          month: z.number().min(1).max(12).optional().describe('Filter by month (1-12)'),
          status: z.enum(['all', 'paid', 'unpaid', 'overdue', 'draft', 'issued', 'sent']).optional().describe('Filter by payment status'),
        }),
      }
    );

    // Get unpaid invoices tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getUnpaidInvoicesTool: StructuredToolInterface = (tool as any)(
      async () => {
        try {
          // Get all invoices and filter locally for unpaid status
          const invoices = await this.wfirmaService.findInvoices({ limit: 200 });
          const unpaid = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue');

          if (unpaid.length === 0) {
            return t.noInvoices;
          }

          return this.formatUnpaidSummary(unpaid, locale);
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
          // Build date filters
          const dateFrom = new Date(year, month ? month - 1 : 0, 1);
          const dateTo = month
            ? new Date(year, month, 0)
            : new Date(year, 11, 31);

          const invoices = await this.wfirmaService.findInvoices({
            dateFrom,
            dateTo,
            limit: 500,
          });

          // Aggregate data
          const summary = {
            totalInvoices: invoices.length,
            paidInvoices: invoices.filter(i => i.status === 'paid').length,
            unpaidInvoices: invoices.filter(i => i.status === 'unpaid' || i.status === 'issued' || i.status === 'sent').length,
            overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
            totalGross: invoices.reduce((sum, i) => sum + i.total, 0),
            totalPaid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
            totalUnpaid: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + i.total, 0),
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

    // Get invoice details tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInvoiceDetailsTool: StructuredToolInterface = (tool as any)(
      async ({ invoiceNumber }: { invoiceNumber: string }) => {
        try {
          // Search by invoice number
          const invoices = await this.wfirmaService.findInvoices({
            invoiceNumber,
            limit: 10,
          });

          if (invoices.length === 0) {
            return t.notFound;
          }

          // Get full details of the first matching invoice
          const invoice = await this.wfirmaService.getInvoiceById(invoices[0].id);

          if (!invoice) {
            return t.notFound;
          }

          return this.formatInvoiceDetails(invoice, locale);
        } catch (error) {
          logger.error('Failed to fetch invoice details', { error, userId, invoiceNumber });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_invoice_details',
        description: 'Get full details of a specific invoice by invoice number, including all line items.',
        schema: z.object({
          invoiceNumber: z.string().describe('Invoice number (e.g., FV 1/2024, FV/01/2024)'),
        }),
      }
    );

    // Send invoice tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sendInvoiceTool: StructuredToolInterface = (tool as any)(
      async ({ invoiceNumber, email, subject, body }: {
        invoiceNumber: string;
        email?: string;
        subject?: string;
        body?: string;
      }) => {
        try {
          // Find invoice by number
          const invoices = await this.wfirmaService.findInvoices({
            invoiceNumber,
            limit: 10,
          });

          if (invoices.length === 0) {
            return t.notFound;
          }

          const invoice = invoices[0];

          // Send the invoice
          const result = await this.wfirmaService.sendInvoice(invoice.id, {
            email,
            subject,
            body,
          });

          // Invalidate cache after mutation
          await this.cacheService.invalidateCache(userId, 'invoice');

          return this.formatSendResult(result, invoice, locale);
        } catch (error) {
          logger.error('Failed to send invoice', { error, userId, invoiceNumber });
          return `Error: ${t.errorSend}`;
        }
      },
      {
        name: 'send_invoice',
        description: 'Send an invoice via email to the contractor. Uses contractor email if not provided.',
        schema: z.object({
          invoiceNumber: z.string().describe('Invoice number to send'),
          email: z.string().email().optional().describe('Email address (uses contractor email if not provided)'),
          subject: z.string().optional().describe('Email subject'),
          body: z.string().optional().describe('Email body message'),
        }),
      }
    );

    // Add invoice note tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addInvoiceNoteTool: StructuredToolInterface = (tool as any)(
      async ({ invoiceNumber, text }: { invoiceNumber: string; text: string }) => {
        try {
          // Find invoice by number
          const invoices = await this.wfirmaService.findInvoices({
            invoiceNumber,
            limit: 10,
          });

          if (invoices.length === 0) {
            return t.notFound;
          }

          const invoice = invoices[0];

          // Add the note
          const note = await this.wfirmaService.addNote('invoices', invoice.id, text);

          // Invalidate cache
          await this.cacheService.invalidateCache(userId, 'invoice');

          return this.formatNoteAdded(note, invoice.invoiceNumber, locale);
        } catch (error) {
          logger.error('Failed to add invoice note', { error, userId, invoiceNumber });
          return `Error: ${t.errorAddNote}`;
        }
      },
      {
        name: 'add_invoice_note',
        description: 'Add a note/comment to an invoice.',
        schema: z.object({
          invoiceNumber: z.string().describe('Invoice number'),
          text: z.string().describe('Note text'),
        }),
      }
    );

    // Get invoice notes tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInvoiceNotesTool: StructuredToolInterface = (tool as any)(
      async ({ invoiceNumber }: { invoiceNumber: string }) => {
        try {
          // Find invoice by number
          const invoices = await this.wfirmaService.findInvoices({
            invoiceNumber,
            limit: 10,
          });

          if (invoices.length === 0) {
            return t.notFound;
          }

          const invoice = invoices[0];

          // Get notes for this invoice
          const notes = await this.wfirmaService.findNotes('invoices', invoice.id);

          return this.formatNotesList(notes, invoice.invoiceNumber, locale);
        } catch (error) {
          logger.error('Failed to fetch invoice notes', { error, userId, invoiceNumber });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_invoice_notes',
        description: 'Get all notes attached to an invoice.',
        schema: z.object({
          invoiceNumber: z.string().describe('Invoice number'),
        }),
      }
    );

    // Delete invoice note tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deleteInvoiceNoteTool: StructuredToolInterface = (tool as any)(
      async ({ noteId }: { noteId: string }) => {
        try {
          await this.wfirmaService.deleteNote(noteId);

          // Invalidate cache
          await this.cacheService.invalidateCache(userId, 'invoice');

          return `✅ ${t.noteDeleted}`;
        } catch (error) {
          logger.error('Failed to delete invoice note', { error, userId, noteId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'delete_invoice_note',
        description: 'Delete a note from an invoice by note ID.',
        schema: z.object({
          noteId: z.string().describe('Note ID to delete'),
        }),
      }
    );

    return [
      getInvoicesTool,
      getUnpaidInvoicesTool,
      getInvoiceSummaryTool,
      getInvoiceDetailsTool,
      sendInvoiceTool,
      addInvoiceNoteTool,
      getInvoiceNotesTool,
      deleteInvoiceNoteTool,
    ];
  }

  // Formatting helpers
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private getStatusLabel(status: string, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
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

  private getStatusIcon(status: string): string {
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

  private formatInvoicesList(invoices: WFirmaInvoice[], locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (invoices.length === 0) {
      return t.noInvoices;
    }

    let result = `## ${t.invoices} (${invoices.length})\n\n`;
    result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.date} | ${t.dueDate} | ${t.grossAmount} | ${t.status} |\n`;
    result += '|------------------|------------|------|------|--------|--------|\n';

    let totalGross = 0;
    let hasOverdue = false;

    invoices.forEach(inv => {
      if (inv.status === 'overdue') hasOverdue = true;
      totalGross += inv.total;

      const statusIcon = this.getStatusIcon(inv.status);
      const statusText = this.getStatusLabel(inv.status, locale);

      result += `| ${inv.invoiceNumber} | ${inv.contractorName} | ${this.formatDate(inv.issueDate)} | ${this.formatDate(inv.dueDate)} | ${this.formatNumber(inv.total)} ${inv.currency} | ${statusIcon} ${statusText} |\n`;
    });

    result += `\n**${t.total}:** ${this.formatNumber(totalGross)} PLN`;

    if (hasOverdue) {
      result += `\n\n> ⚠️ ${t.overdueWarning}`;
    }

    return result;
  }

  private formatUnpaidSummary(invoices: WFirmaInvoice[], locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (invoices.length === 0) {
      return t.noInvoices;
    }

    const overdue = invoices.filter(inv => inv.status === 'overdue');
    const upcoming = invoices.filter(inv => inv.status !== 'overdue');

    let result = `## ${t.unpaidTotal}\n\n`;

    if (overdue.length > 0) {
      result += `### ⚠️ ${t.overdue} (${overdue.length})\n\n`;
      result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.dueDate} | ${t.grossAmount} |\n`;
      result += '|------------------|------------|------|--------|\n';

      let overdueTotal = 0;
      overdue.forEach(inv => {
        overdueTotal += inv.total;
        result += `| ${inv.invoiceNumber} | ${inv.contractorName} | ${this.formatDate(inv.dueDate)} | ${this.formatNumber(inv.total)} ${inv.currency} |\n`;
      });
      result += `\n**${t.total}:** ${this.formatNumber(overdueTotal)} PLN\n\n`;
    }

    if (upcoming.length > 0) {
      result += `### ⏳ ${t.unpaid} (${upcoming.length})\n\n`;
      result += `| ${t.invoiceNumber} | ${t.contractor} | ${t.dueDate} | ${t.grossAmount} |\n`;
      result += '|------------------|------------|------|--------|\n';

      let upcomingTotal = 0;
      upcoming.forEach(inv => {
        upcomingTotal += inv.total;
        result += `| ${inv.invoiceNumber} | ${inv.contractorName} | ${this.formatDate(inv.dueDate)} | ${this.formatNumber(inv.total)} ${inv.currency} |\n`;
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
    result += `| ✅ ${t.paid} | ${summary.paidInvoices} |\n`;
    result += `| ⏳ ${t.unpaid} | ${summary.unpaidInvoices} |\n`;
    result += `| ⚠️ ${t.overdue} | ${summary.overdueInvoices} |\n`;
    result += `| ${t.grossAmount} | ${this.formatNumber(summary.totalGross)} PLN |\n`;
    result += `| ${t.unpaidTotal} | ${this.formatNumber(summary.totalUnpaid)} PLN |\n`;

    if (summary.overdueInvoices > 0) {
      result += `\n> ⚠️ ${t.overdueWarning}`;
    }

    return result;
  }

  private formatInvoiceDetails(invoice: WFirmaInvoice, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    let result = `## ${t.invoiceDetails}: ${invoice.invoiceNumber}\n\n`;

    // Basic info
    result += `| Field | Value |\n`;
    result += '|-------|-------|\n';
    result += `| ${t.invoiceNumber} | ${invoice.invoiceNumber} |\n`;
    result += `| ${t.contractor} | ${invoice.contractorName} |\n`;
    if (invoice.contractorNip) {
      result += `| NIP | ${invoice.contractorNip} |\n`;
    }
    result += `| ${t.date} | ${this.formatDate(invoice.issueDate)} |\n`;
    if (invoice.sellDate) {
      result += `| ${t.sellDate} | ${this.formatDate(invoice.sellDate)} |\n`;
    }
    result += `| ${t.dueDate} | ${this.formatDate(invoice.dueDate)} |\n`;
    result += `| ${t.status} | ${this.getStatusIcon(invoice.status)} ${this.getStatusLabel(invoice.status, locale)} |\n`;
    if (invoice.paymentMethod) {
      result += `| ${t.paymentMethod} | ${invoice.paymentMethod} |\n`;
    }
    result += `| ${t.currency} | ${invoice.currency} |\n`;

    // Items
    if (invoice.items && invoice.items.length > 0) {
      result += `\n### ${t.items}\n\n`;
      result += `| # | Name | ${t.quantity} | ${t.unit} | ${t.priceNet} | ${t.vatRate} | ${t.grossAmount} |\n`;
      result += '|---|------|---------|------|----------|---------|--------|\n';

      invoice.items.forEach((item, idx) => {
        result += `| ${idx + 1} | ${item.name} | ${item.quantity} | ${item.unit} | ${this.formatNumber(item.priceNet)} | ${item.vatRate}% | ${this.formatNumber(item.totalGross)} |\n`;
      });
    }

    // Totals
    result += `\n### ${t.total}\n\n`;
    result += `| | Value |\n`;
    result += '|-------|-------|\n';
    result += `| ${t.netAmount} | ${this.formatNumber(invoice.totalNet)} ${invoice.currency} |\n`;
    result += `| ${t.vatAmount} | ${this.formatNumber(invoice.totalVat)} ${invoice.currency} |\n`;
    result += `| **${t.grossAmount}** | **${this.formatNumber(invoice.total)} ${invoice.currency}** |\n`;

    if (invoice.notes) {
      result += `\n### ${t.notesTitle}\n${invoice.notes}`;
    }

    return result;
  }

  private formatSendResult(
    result: { success: boolean; email: string; deliveryId?: string },
    invoice: WFirmaInvoice,
    locale: Locale
  ): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (result.success) {
      let msg = `✅ **${t.sendSuccess}**\n\n`;
      msg += `- ${t.invoiceNumber}: ${invoice.invoiceNumber}\n`;
      msg += `- ${t.contractor}: ${invoice.contractorName}\n`;
      msg += `- ${t.sendSuccessHint}: ${result.email || invoice.contractorName}\n`;
      if (result.deliveryId) {
        msg += `- Delivery ID: ${result.deliveryId}\n`;
      }
      return msg;
    }

    return `❌ ${t.errorSend}`;
  }

  private formatNoteAdded(note: WFirmaNote, invoiceNumber: string, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    let result = `✅ **${t.noteAdded}**\n\n`;
    result += `- ${t.invoiceNumber}: ${invoiceNumber}\n`;
    result += `- ${t.noteText}: ${note.text}\n`;
    result += `- Note ID: ${note.id}\n`;

    return result;
  }

  private formatNotesList(notes: WFirmaNote[], invoiceNumber: string, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    if (notes.length === 0) {
      return t.noNotes;
    }

    let result = `## ${t.notesTitle} - ${invoiceNumber} (${notes.length})\n\n`;
    result += `| ID | ${t.noteText} | ${t.noteDate} |\n`;
    result += '|----|---------|------|\n';

    notes.forEach(note => {
      const text = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
      result += `| ${note.id} | ${text} | ${this.formatDate(note.created)} |\n`;
    });

    return result;
  }
}
