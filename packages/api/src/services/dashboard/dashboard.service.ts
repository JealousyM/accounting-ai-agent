/**
 * Dashboard Service
 * Aggregates KPI data from multiple sources for the dashboard endpoint
 */

import { logger } from '../../utils/logger';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { KSeFService } from '../ksef/ksef.service';
import { taxCalendarService } from '../tax-calendar.instance';
import {
  DashboardSummaryResponse,
  DashboardFinancialSummary,
  DashboardInvoiceSummary,
  DashboardDeadline,
  DashboardKSeFSummary,
  MonthlyFinancialData,
} from '../../types/dashboard.types';

export class DashboardService {
  constructor(
    private readonly wfirmaServiceFactory: WFirmaServiceFactory,
    private readonly ksefService: KSeFService,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummaryResponse> {
    logger.info('DashboardService.getSummary', { userId });

    const results = await Promise.allSettled([
      this.getFinancialSection(userId),
      this.getInvoiceSection(userId),
      this.getDeadlinesSection(userId),
      this.getKSeFSection(userId),
    ]);

    return {
      financial: results[0].status === 'fulfilled' ? results[0].value : null,
      invoices: results[1].status === 'fulfilled' ? results[1].value : null,
      deadlines: results[2].status === 'fulfilled' ? results[2].value : null,
      ksef: results[3].status === 'fulfilled' ? results[3].value : null,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getFinancialSection(userId: string): Promise<DashboardFinancialSummary | null> {
    try {
      const hasCredentials = await this.wfirmaServiceFactory.hasUserCredentials(userId);
      if (!hasCredentials) return null;

      const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);
      const now = new Date();
      const year = now.getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      const monthStart = new Date(year, now.getMonth(), 1);

      // wFirma returns `netto` and `tax` already converted to PLN even on
      // foreign-currency invoices, so totalNet + totalVat is the gross PLN
      // amount. Expenses are stored directly in PLN (`brutto`).
      const [invoices, expenses] = await Promise.all([
        wfirmaService.findInvoices({ dateFrom: yearStart, dateTo: yearEnd, limit: 1000 }),
        wfirmaService.findExpenses({ dateFrom: yearStart, dateTo: yearEnd, limit: 1000 }),
      ]);

      const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { revenue: 0, expenses: 0 });
      }

      const monthKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      let currentMonthRevenue = 0;
      for (const inv of invoices) {
        if (inv.status === 'cancelled' || inv.status === 'draft') continue;
        if ((inv as any).type === 'proforma') continue;
        const plnGross = (inv.totalNet ?? 0) + (inv.totalVat ?? 0);
        const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
        const entry = monthlyMap.get(monthKey(date));
        if (entry) entry.revenue += plnGross;
        if (date >= monthStart) currentMonthRevenue += plnGross;
      }

      let currentMonthExpenses = 0;
      for (const exp of expenses) {
        const plnGross = exp.total ?? 0;
        const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
        const entry = monthlyMap.get(monthKey(date));
        if (entry) entry.expenses += plnGross;
        if (date >= monthStart) currentMonthExpenses += plnGross;
      }

      const monthlyBreakdown: MonthlyFinancialData[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, revenue: data.revenue, expenses: data.expenses }));

      return {
        year,
        revenue: currentMonthRevenue,
        expenses: currentMonthExpenses,
        profit: currentMonthRevenue - currentMonthExpenses,
        vatPaid: 0,
        pitPaid: 0,
        zusPaid: 0,
        currency: 'PLN',
        monthlyBreakdown,
      };
    } catch (error) {
      logger.error('Dashboard: failed to fetch financial data', { error, userId });
      return null;
    }
  }

  private async getInvoiceSection(userId: string): Promise<DashboardInvoiceSummary | null> {
    try {
      const hasCredentials = await this.wfirmaServiceFactory.hasUserCredentials(userId);
      if (!hasCredentials) return null;

      const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);

      // One query, filter locally. Status is derived in mapInvoiceData from
      // paymentdate + alreadypaid, so the wFirma endpoint has no native
      // "unpaid" filter. Overdue is a strict subset of unpaid — previously
      // the two were fetched separately (with a spurious status='unpaid'
      // filter that matched nothing) and summed, double-counting overdue.
      const invoices = await wfirmaService.findInvoices({ limit: 500 });

      const isUnpaid = (s?: string) => s === 'issued' || s === 'sent' || s === 'overdue';
      const plnGross = (inv: { totalNet?: number; totalVat?: number }) =>
        (inv.totalNet ?? 0) + (inv.totalVat ?? 0);

      let unpaidCount = 0;
      let unpaidTotal = 0;
      let overdueCount = 0;
      let overdueTotal = 0;

      for (const inv of invoices) {
        if (!isUnpaid(inv.status)) continue;
        const amount = plnGross(inv);
        unpaidCount += 1;
        unpaidTotal += amount;
        if (inv.status === 'overdue') {
          overdueCount += 1;
          overdueTotal += amount;
        }
      }

      return {
        unpaidCount,
        unpaidTotal,
        overdueCount,
        overdueTotal,
        currency: 'PLN',
      };
    } catch (error) {
      logger.error('Dashboard: failed to fetch invoice data', { error, userId });
      return null;
    }
  }

  private async getDeadlinesSection(userId: string): Promise<DashboardDeadline[] | null> {
    try {
      const hasCredentials = await this.wfirmaServiceFactory.hasUserCredentials(userId);
      if (!hasCredentials) return null;

      const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 7); // Include recent overdue
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const [terms, termGroups] = await Promise.all([
        wfirmaService.findTerms({ dateFrom: thirtyDaysAgo, dateTo: thirtyDaysLater, limit: 100 }),
        wfirmaService.findTermGroups({ limit: 100 }),
      ]);

      // Build group name map
      const groupMap = new Map<string, string>();
      for (const group of termGroups) {
        groupMap.set(group.id, group.name);
      }

      const todayMs = today.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      const userDeadlines: DashboardDeadline[] = terms
        .map((term) => {
          const termDate = term.date instanceof Date ? term.date : new Date(term.date);
          const daysUntil = Math.ceil((termDate.getTime() - todayMs) / dayMs);

          let urgency: DashboardDeadline['urgency'];
          if (daysUntil < 0) urgency = 'overdue';
          else if (daysUntil <= 3) urgency = 'urgent';
          else if (daysUntil <= 7) urgency = 'soon';
          else urgency = 'normal';

          return {
            id: term.id,
            date: termDate.toISOString(),
            description: term.description || '',
            groupName: term.groupId ? groupMap.get(term.groupId) : undefined,
            daysUntil,
            urgency,
            source: 'user' as const,
          };
        });

      // Add tax deadlines — only future ones (no overdue, since we don't know if they were paid)
      const taxDeadlines = taxCalendarService.getUpcomingDeadlines(30, 'pl', 0);

      const taxDashboardDeadlines: DashboardDeadline[] = taxDeadlines.map((td) => {
        const daysUntil = Math.ceil((td.date.getTime() - todayMs) / dayMs);

        let urgency: DashboardDeadline['urgency'];
        if (daysUntil <= 3) urgency = 'urgent';
        else if (daysUntil <= 7) urgency = 'soon';
        else urgency = 'normal';

        return {
          id: `tax-${td.id}`,
          date: td.date.toISOString(),
          description: `${td.name}: ${td.description}`,
          daysUntil,
          urgency,
          source: 'tax' as const,
        };
      });

      return [...userDeadlines, ...taxDashboardDeadlines]
        .sort((a, b) => a.daysUntil - b.daysUntil);
    } catch (error) {
      logger.error('Dashboard: failed to fetch deadlines', { error, userId });
      return null;
    }
  }

  private async getKSeFSection(userId: string): Promise<DashboardKSeFSummary | null> {
    try {
      const stats = await this.ksefService.getStatistics(userId);

      // The local DB only tracks KSeF activity that went through our system.
      // Users commonly import invoices into wFirma directly (wFirma uses the
      // UBL 2.1 parser for KSeF-sourced expenses), so those never land in
      // our table. Augment totalReceived with the wFirma-side count so the
      // dashboard isn't stuck at zero.
      let wfirmaReceived = 0;
      try {
        if (await this.wfirmaServiceFactory.hasUserCredentials(userId)) {
          const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);
          const year = new Date().getFullYear();
          const expenses = await wfirmaService.findExpenses({
            dateFrom: new Date(year, 0, 1),
            dateTo: new Date(year, 11, 31, 23, 59, 59),
            limit: 1000,
          });
          wfirmaReceived = expenses.filter((e) => e.parser === 'ubl21').length;
        }
      } catch (err) {
        logger.warn('Dashboard: failed to augment KSeF received count from wFirma', { err, userId });
      }

      const totalDecided = stats.acceptedCount + stats.rejectedCount;
      const acceptanceRate = totalDecided > 0
        ? Math.round((stats.acceptedCount / totalDecided) * 100)
        : 0;

      return {
        totalSent: stats.totalSent,
        totalReceived: stats.totalReceived + wfirmaReceived,
        acceptedCount: stats.acceptedCount,
        rejectedCount: stats.rejectedCount,
        pendingCount: stats.pendingCount,
        acceptanceRate,
      };
    } catch (error) {
      logger.error('Dashboard: failed to fetch KSeF data', { error, userId });
      return null;
    }
  }
}
