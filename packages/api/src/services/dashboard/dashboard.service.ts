/**
 * Dashboard Service
 * Aggregates KPI data from multiple sources for the dashboard endpoint
 */

import { logger } from '../../utils/logger';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { HRService } from '../hr/hr.service';
import { KSeFService } from '../ksef/ksef.service';
import { taxCalendarService } from '../tax-calendar.instance';
import {
  DashboardSummaryResponse,
  DashboardFinancialSummary,
  DashboardInvoiceSummary,
  DashboardDeadline,
  DashboardHRSummary,
  DashboardKSeFSummary,
  MonthlyFinancialData,
} from '../../types/dashboard.types';

export class DashboardService {
  constructor(
    private readonly wfirmaServiceFactory: WFirmaServiceFactory,
    private readonly hrService: HRService,
    private readonly ksefService: KSeFService,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummaryResponse> {
    logger.info('DashboardService.getSummary', { userId });

    const results = await Promise.allSettled([
      this.getFinancialSection(userId),
      this.getInvoiceSection(userId),
      this.getDeadlinesSection(userId),
      this.getHRSection(userId),
      this.getKSeFSection(userId),
    ]);

    return {
      financial: results[0].status === 'fulfilled' ? results[0].value : null,
      invoices: results[1].status === 'fulfilled' ? results[1].value : null,
      deadlines: results[2].status === 'fulfilled' ? results[2].value : null,
      hr: results[3].status === 'fulfilled' ? results[3].value : null,
      ksef: results[4].status === 'fulfilled' ? results[4].value : null,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getFinancialSection(userId: string): Promise<DashboardFinancialSummary | null> {
    try {
      const hasCredentials = await this.wfirmaServiceFactory.hasUserCredentials(userId);
      if (!hasCredentials) return null;

      const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);
      const currentYear = new Date().getFullYear();

      // Get yearly totals
      const financialData = await wfirmaService.getFinancialData(currentYear);

      // Get invoices for monthly breakdown
      const dateFrom = new Date(currentYear, 0, 1);
      const dateTo = new Date(currentYear, 11, 31);
      const invoices = await wfirmaService.findInvoices({ dateFrom, dateTo, limit: 1000 });

      // Build monthly breakdown
      const monthlyMap = new Map<string, { revenue: number; expenses: number }>();

      // Initialize all months of the current year
      for (let m = 0; m < 12; m++) {
        const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { revenue: 0, expenses: 0 });
      }

      for (const invoice of invoices) {
        const issueDate = invoice.issueDate instanceof Date
          ? invoice.issueDate
          : new Date(invoice.issueDate);
        const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
        const entry = monthlyMap.get(monthKey);
        if (!entry) continue;

        const total = typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total) || '0');
        if (invoice.status !== 'cancelled') {
          // Revenue from normal/vat invoices, expenses from purchase invoices
          // This mirrors the logic in financial.service.ts
          if ((invoice as any).type === 'normal' || (invoice as any).type === 'vat') {
            entry.revenue += total;
          } else if ((invoice as any).type === 'purchase') {
            entry.expenses += total;
          } else {
            // Default: positive totals are revenue
            if (total > 0) entry.revenue += total;
          }
        }
      }

      const monthlyBreakdown: MonthlyFinancialData[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, revenue: data.revenue, expenses: data.expenses }));

      return {
        year: currentYear,
        revenue: financialData.revenue,
        expenses: financialData.expenses,
        profit: financialData.profit,
        vatPaid: financialData.vatPaid || 0,
        pitPaid: financialData.pitPaid || 0,
        zusPaid: financialData.zusPaid || 0,
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

      const [unpaidInvoices, overdueInvoices] = await Promise.all([
        wfirmaService.findInvoices({ status: 'unpaid', limit: 500 }),
        wfirmaService.findInvoices({ status: 'overdue', limit: 500 }),
      ]);

      const sumTotal = (invoices: any[]) =>
        invoices.reduce((sum, inv) => {
          const total = typeof inv.total === 'number' ? inv.total : parseFloat(String(inv.total) || '0');
          return sum + total;
        }, 0);

      return {
        unpaidCount: unpaidInvoices.length,
        unpaidTotal: sumTotal(unpaidInvoices),
        overdueCount: overdueInvoices.length,
        overdueTotal: sumTotal(overdueInvoices),
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

  private async getHRSection(userId: string): Promise<DashboardHRSummary | null> {
    try {
      const summary = await this.hrService.getHRSummary(userId);
      return {
        employeeCount: summary.employeeCount,
        activeContractsByType: summary.activeContractsByType,
        latestPeriod: summary.latestPeriod,
        totalMonthlyPayroll: summary.totalMonthlyPayroll,
      };
    } catch (error) {
      logger.error('Dashboard: failed to fetch HR data', { error, userId });
      return null;
    }
  }

  private async getKSeFSection(userId: string): Promise<DashboardKSeFSummary | null> {
    try {
      const stats = await this.ksefService.getStatistics(userId);
      const totalDecided = stats.acceptedCount + stats.rejectedCount;
      const acceptanceRate = totalDecided > 0
        ? Math.round((stats.acceptedCount / totalDecided) * 100)
        : 0;

      return {
        totalSent: stats.totalSent,
        totalReceived: stats.totalReceived,
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
