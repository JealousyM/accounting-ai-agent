/**
 * DashboardService Unit Tests
 *
 * Covers the five async methods:
 *   getSummary, getFinancialSection, getInvoiceSection,
 *   getDeadlinesSection, getKSeFSection
 *
 * Bug-regression focus (fixes #94.1-#94.6):
 *   - Cancelled / draft / proforma invoices excluded from revenue
 *   - Overdue is a strict subset of unpaid — no double-counting
 *   - KSeF UBL21 augmentation adds to (not replaces) ksefService count
 *   - PLN gross = totalNet + totalVat (wFirma already converts foreign currency)
 */

import { DashboardService } from '../dashboard/dashboard.service';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';
import { KSeFService } from '../ksef/ksef.service';
import { taxCalendarService } from '../tax-calendar.instance';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: 'FV/1',
    issueDate: new Date('2026-01-15'),
    dueDate: new Date('2026-02-15'),
    contractorId: 'c1',
    contractorName: 'Acme',
    items: [],
    total: 1230,
    totalNet: 1000,
    totalVat: 230,
    currency: 'PLN',
    status: 'paid',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    type: 'costs_in_revenues',
    date: new Date('2026-01-20'),
    paid: true,
    alreadypaidInitial: 0,
    currency: 'PLN',
    accountingEffect: 'normal',
    schemaVatCashbox: false,
    wnt: false,
    serviceImport: false,
    serviceImport2: false,
    cargoImport: false,
    splitPayment: false,
    draft: false,
    taxEvaluationMethod: 'normal',
    total: 500,
    totalNet: 406.5,
    totalVat: 93.5,
    parts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTerm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'term-1',
    date: new Date(),
    type: 'payment',
    ...overrides,
  };
}

// ---------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------

const mockWfirmaService = {
  findInvoices: jest.fn(),
  findExpenses: jest.fn(),
  findTerms: jest.fn(),
  findTermGroups: jest.fn(),
};

const mockFactory = {
  hasUserCredentials: jest.fn(),
  getServiceForUser: jest.fn(),
} as unknown as WFirmaServiceFactory;

const mockKsefService = {
  getStatistics: jest.fn(),
} as unknown as KSeFService;

jest.mock('../tax-calendar.instance', () => ({
  taxCalendarService: {
    getUpcomingDeadlines: jest.fn().mockReturnValue([]),
  },
}));

const USER_ID = 'user-abc';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFactory.hasUserCredentials as jest.Mock).mockResolvedValue(true);
    (mockFactory.getServiceForUser as jest.Mock).mockResolvedValue(mockWfirmaService);
    mockWfirmaService.findInvoices.mockResolvedValue([]);
    mockWfirmaService.findExpenses.mockResolvedValue([]);
    mockWfirmaService.findTerms.mockResolvedValue([]);
    mockWfirmaService.findTermGroups.mockResolvedValue([]);
    (taxCalendarService.getUpcomingDeadlines as jest.Mock).mockReturnValue([]);
    (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
      totalSent: 0,
      totalReceived: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      completedCount: 0,
      byMonth: [],
    });
    service = new DashboardService(mockFactory, mockKsefService);
  });

  // =============================================================
  // getSummary
  // =============================================================

  describe('getSummary', () => {
    it('returns all four sections when every call succeeds', async () => {
      const result = await service.getSummary(USER_ID);
      expect(result.financial).not.toBeNull();
      expect(result.invoices).not.toBeNull();
      expect(result.deadlines).not.toBeNull();
      expect(result.ksef).not.toBeNull();
      expect(result.generatedAt).toBeTruthy();
    });

    it('returns null for a section that throws, others still populated', async () => {
      // Reject ALL calls to findInvoices so both financial and invoices sections fail
      mockWfirmaService.findInvoices.mockRejectedValue(new Error('network'));
      const result = await service.getSummary(USER_ID);
      expect(result.financial).toBeNull();
      expect(result.invoices).toBeNull();
      // ksef and deadlines sections are independent of findInvoices
      expect(result.ksef).not.toBeNull();
    });

    it('returns null sections when user has no credentials', async () => {
      (mockFactory.hasUserCredentials as jest.Mock).mockResolvedValue(false);
      const result = await service.getSummary(USER_ID);
      expect(result.financial).toBeNull();
      expect(result.invoices).toBeNull();
      expect(result.deadlines).toBeNull();
    });
  });

  // =============================================================
  // getFinancialSection — via getSummary
  // =============================================================

  describe('financial section', () => {
    it('sums PLN gross (totalNet + totalVat) for paid invoices in current month', async () => {
      const now = new Date();
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'paid', issueDate: now, totalNet: 1000, totalVat: 230 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.revenue).toBe(1230);
    });

    it('excludes cancelled invoices from revenue (bug #94.1)', async () => {
      const now = new Date();
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'cancelled', issueDate: now, totalNet: 500, totalVat: 115 }),
        makeInvoice({ status: 'paid', issueDate: now, totalNet: 200, totalVat: 46, id: 'inv-2' }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.revenue).toBe(246);
    });

    it('excludes draft invoices from revenue', async () => {
      const now = new Date();
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'draft', issueDate: now, totalNet: 800, totalVat: 184 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.revenue).toBe(0);
    });

    it('excludes proforma invoices from revenue (bug #94.2)', async () => {
      const now = new Date();
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'issued', type: 'proforma', issueDate: now, totalNet: 1000, totalVat: 230 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.revenue).toBe(0);
    });

    it('only includes current-month invoices in revenue (not full-year)', async () => {
      const now = new Date();
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 15);
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'paid', issueDate: lastYear, totalNet: 5000, totalVat: 1150 }),
        makeInvoice({ status: 'paid', issueDate: now, totalNet: 100, totalVat: 23, id: 'inv-2' }),
      ]);
      const result = await service.getSummary(USER_ID);
      // Only the current-month invoice contributes to revenue
      expect(result.financial?.revenue).toBe(123);
    });

    it('sums expense totals for current month', async () => {
      const now = new Date();
      mockWfirmaService.findExpenses.mockResolvedValue([
        makeExpense({ date: now, total: 300 }),
        makeExpense({ date: now, total: 200, id: 'exp-2' }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.expenses).toBe(500);
    });

    it('calculates profit as revenue minus expenses', async () => {
      const now = new Date();
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'paid', issueDate: now, totalNet: 1000, totalVat: 0 }),
      ]);
      mockWfirmaService.findExpenses.mockResolvedValue([
        makeExpense({ date: now, total: 400 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.profit).toBe(600);
    });

    it('returns monthly breakdown with 12 entries for the current year', async () => {
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.monthlyBreakdown).toHaveLength(12);
    });

    it('currency is always PLN', async () => {
      const result = await service.getSummary(USER_ID);
      expect(result.financial?.currency).toBe('PLN');
    });
  });

  // =============================================================
  // getInvoiceSection — via getSummary
  // =============================================================

  describe('invoice section', () => {
    it('counts unpaid invoices by wFirma paymentState (unpaid/remaining)', async () => {
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ id: 'a', status: 'issued', paymentState: 'unpaid', totalNet: 100, totalVat: 23 }),
        makeInvoice({ id: 'b', status: 'sent', paymentState: 'remaining', totalNet: 200, totalVat: 46 }),
        makeInvoice({ id: 'c', status: 'overdue', paymentState: 'unpaid', totalNet: 300, totalVat: 69 }),
        makeInvoice({ id: 'd', status: 'paid', paymentState: 'paid', totalNet: 500, totalVat: 115 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.invoices?.unpaidCount).toBe(3);
      expect(result.invoices?.unpaidTotal).toBe(123 + 246 + 369);
    });

    it('excludes non-invoice PK ledger documents (no paymentState) from unpaid count', async () => {
      mockWfirmaService.findInvoices.mockResolvedValue([
        // PK bookkeeping entry: status defaults to 'issued', but no paymentState
        makeInvoice({ id: 'pk', status: 'issued', documentType: 'ledger_accounting_command', totalNet: 100, totalVat: 0 }),
        makeInvoice({ id: 'a', status: 'issued', paymentState: 'unpaid', totalNet: 200, totalVat: 0 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.invoices?.unpaidCount).toBe(1);
      expect(result.invoices?.unpaidTotal).toBe(200);
    });

    it('overdue is a strict subset of unpaid — no double-counting (bug #94.3)', async () => {
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ id: 'a', status: 'overdue', paymentState: 'unpaid', totalNet: 500, totalVat: 115 }),
        makeInvoice({ id: 'b', status: 'issued', paymentState: 'unpaid', totalNet: 200, totalVat: 46 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.invoices?.unpaidCount).toBe(2);
      expect(result.invoices?.unpaidTotal).toBe(615 + 246);
      expect(result.invoices?.overdueCount).toBe(1);
      expect(result.invoices?.overdueTotal).toBe(615);
      // unpaidTotal must equal or exceed overdueTotal (never double-counted)
      expect(result.invoices!.unpaidTotal).toBeGreaterThanOrEqual(result.invoices!.overdueTotal);
    });

    it('currency is PLN', async () => {
      const result = await service.getSummary(USER_ID);
      expect(result.invoices?.currency).toBe('PLN');
    });

    it('returns zeros when there are no unpaid invoices', async () => {
      mockWfirmaService.findInvoices.mockResolvedValue([
        makeInvoice({ status: 'paid', totalNet: 1000, totalVat: 230 }),
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.invoices?.unpaidCount).toBe(0);
      expect(result.invoices?.unpaidTotal).toBe(0);
      expect(result.invoices?.overdueCount).toBe(0);
      expect(result.invoices?.overdueTotal).toBe(0);
    });
  });

  // =============================================================
  // getDeadlinesSection — via getSummary
  // =============================================================

  describe('deadlines section', () => {
    it('returns user + tax deadlines sorted by daysUntil', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const later = new Date();
      later.setDate(later.getDate() + 20);

      mockWfirmaService.findTerms.mockResolvedValue([
        makeTerm({ id: 't1', date: later }),
        makeTerm({ id: 't2', date: soon }),
      ]);
      mockWfirmaService.findTermGroups.mockResolvedValue([]);

      const taxDeadline = { id: 'vat7', date: new Date(), name: 'VAT-7', description: 'dec.' };
      (taxCalendarService.getUpcomingDeadlines as jest.Mock).mockReturnValue([taxDeadline]);

      const result = await service.getSummary(USER_ID);
      expect(result.deadlines).not.toBeNull();
      // Tax deadline is today (0 days) → first after sort
      expect(result.deadlines![0].source).toBe('tax');
      expect(result.deadlines!.length).toBe(3);
    });

    it('classifies urgency correctly', async () => {
      const overdue = new Date();
      overdue.setDate(overdue.getDate() - 1);
      const urgent = new Date();
      urgent.setDate(urgent.getDate() + 2);
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const normal = new Date();
      normal.setDate(normal.getDate() + 15);

      mockWfirmaService.findTerms.mockResolvedValue([
        makeTerm({ id: 'a', date: overdue }),
        makeTerm({ id: 'b', date: urgent }),
        makeTerm({ id: 'c', date: soon }),
        makeTerm({ id: 'd', date: normal }),
      ]);
      mockWfirmaService.findTermGroups.mockResolvedValue([]);

      const result = await service.getSummary(USER_ID);
      const byId = Object.fromEntries(result.deadlines!.map((d) => [d.id, d.urgency]));
      expect(byId['a']).toBe('overdue');
      expect(byId['b']).toBe('urgent');
      expect(byId['c']).toBe('soon');
      expect(byId['d']).toBe('normal');
    });

    it('resolves group name from termGroups', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      mockWfirmaService.findTerms.mockResolvedValue([
        makeTerm({ id: 't1', date: future, groupId: 'g1' }),
      ]);
      mockWfirmaService.findTermGroups.mockResolvedValue([
        { id: 'g1', name: 'Finance', isReadonly: false },
      ]);
      const result = await service.getSummary(USER_ID);
      expect(result.deadlines![0].groupName).toBe('Finance');
    });
  });

  // =============================================================
  // getKSeFSection — via getSummary
  // =============================================================

  describe('ksef section', () => {
    it('calculates acceptance rate correctly (bug #94.4)', async () => {
      (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
        totalSent: 10,
        totalReceived: 5,
        acceptedCount: 8,
        rejectedCount: 2,
        pendingCount: 0,
        completedCount: 8,
        byMonth: [],
      });
      const result = await service.getSummary(USER_ID);
      expect(result.ksef?.acceptanceRate).toBe(80); // 8/10 * 100
    });

    it('acceptance rate is 0 when no invoices decided (no division by zero)', async () => {
      (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
        totalSent: 0,
        totalReceived: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        completedCount: 0,
        byMonth: [],
      });
      const result = await service.getSummary(USER_ID);
      expect(result.ksef?.acceptanceRate).toBe(0);
    });

    it('augments totalReceived with wFirma UBL21 expense count (bug #94.5)', async () => {
      (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
        totalSent: 0,
        totalReceived: 3,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        completedCount: 0,
        byMonth: [],
      });
      mockWfirmaService.findExpenses.mockResolvedValue([
        makeExpense({ parser: 'ubl21' }),
        makeExpense({ id: 'exp-2', parser: 'ubl21' }),
        makeExpense({ id: 'exp-3', parser: 'scanye' }),
        makeExpense({ id: 'exp-4' }), // no parser
      ]);
      const result = await service.getSummary(USER_ID);
      // 3 from ksefService + 2 ubl21 from wFirma
      expect(result.ksef?.totalReceived).toBe(5);
    });

    it('does not augment when user has no wFirma credentials', async () => {
      (mockFactory.hasUserCredentials as jest.Mock).mockResolvedValue(false);
      (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
        totalSent: 0,
        totalReceived: 7,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        completedCount: 0,
        byMonth: [],
      });
      const result = await service.getSummary(USER_ID);
      expect(result.ksef?.totalReceived).toBe(7);
    });

    it('falls back gracefully when wFirma augmentation throws (bug #94.6)', async () => {
      (mockKsefService.getStatistics as jest.Mock).mockResolvedValue({
        totalSent: 0,
        totalReceived: 4,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        completedCount: 0,
        byMonth: [],
      });
      // Simulate wFirma service throwing during KSeF augmentation
      mockWfirmaService.findExpenses.mockRejectedValue(new Error('wFirma timeout'));
      const result = await service.getSummary(USER_ID);
      // Falls back to ksefService count; wfirmaReceived defaults to 0
      expect(result.ksef?.totalReceived).toBe(4);
    });
  });
});
