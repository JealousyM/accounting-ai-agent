/**
 * Dashboard Types
 * Shared types for the KPI dashboard endpoint
 */

export interface DashboardFinancialSummary {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  vatPaid: number;
  pitPaid: number;
  zusPaid: number;
  currency: string;
  monthlyBreakdown: MonthlyFinancialData[];
}

export interface MonthlyFinancialData {
  month: string; // "2026-01"
  revenue: number;
  expenses: number;
}

export interface DashboardInvoiceSummary {
  unpaidCount: number;
  unpaidTotal: number;
  overdueCount: number;
  overdueTotal: number;
  currency: string;
}

export interface DashboardDeadline {
  id: string;
  date: string;
  description: string;
  groupName?: string;
  daysUntil: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'normal';
  source?: 'user' | 'tax';
}

export interface DashboardKSeFSummary {
  totalSent: number;
  totalReceived: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  acceptanceRate: number;
}

export interface DashboardSummaryResponse {
  financial: DashboardFinancialSummary | null;
  invoices: DashboardInvoiceSummary | null;
  deadlines: DashboardDeadline[] | null;
  ksef: DashboardKSeFSummary | null;
  generatedAt: string;
}
