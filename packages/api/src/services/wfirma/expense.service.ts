/**
 * wFirma Expense Service
 * Handles expense operations (read-only)
 */

import { logger } from '../../utils/logger';
import {
  WFirmaExpense,
  WFirmaExpensePart,
  ExpenseFilters,
  ExpenseType,
  AccountingEffect,
  TaxEvaluationMethod,
  ExpensePartType,
  ExpenseSchema,
  PaymentMethod,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaExpenseService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Find expenses with filtering and pagination
   */
  async findExpenses(filters?: ExpenseFilters): Promise<WFirmaExpense[]> {
    logger.info('Fetching expenses from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        // Date range filters
        if (filters?.dateFrom) {
          const dateFrom =
            filters.dateFrom instanceof Date
              ? filters.dateFrom.toISOString().split('T')[0]
              : filters.dateFrom;
          conditions.push({
            field: 'date',
            operator: 'ge',
            value: dateFrom,
          });
        }

        if (filters?.dateTo) {
          const dateTo =
            filters.dateTo instanceof Date
              ? filters.dateTo.toISOString().split('T')[0]
              : filters.dateTo;
          conditions.push({
            field: 'date',
            operator: 'le',
            value: dateTo,
          });
        }

        // Contractor filter
        if (filters?.contractorId) {
          conditions.push({
            field: 'contractor_id',
            operator: 'eq',
            value: filters.contractorId,
          });
        }

        // Paid status filter
        if (filters?.paid !== undefined) {
          conditions.push({
            field: 'paid',
            operator: 'eq',
            value: filters.paid ? '1' : '0',
          });
        }

        // Type filter
        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        // Accounting effect filter
        if (filters?.accountingEffect) {
          conditions.push({
            field: 'accounting_effect',
            operator: 'eq',
            value: filters.accountingEffect,
          });
        }

        // Pagination
        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const expensesParams: any = {
          parameters: {
            limit,
            page,
            order: { desc: 'Expense.date' },
          },
        };

        if (conditions.length > 0) {
          expensesParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            expenses: expensesParams,
          },
        };

        logger.info('wFirma findExpenses REQUEST', {
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/expenses/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        logger.info('wFirma findExpenses RESPONSE', {
          responseData: JSON.stringify(data, null, 2),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch expenses',
            data.status
          );
        }

        // Parse flexible response format
        let expensesData = data.expenses?.expense;
        if (!expensesData) {
          const expensesObj = data.expenses;
          if (expensesObj) {
            expensesData = [];
            for (const key in expensesObj) {
              if (!isNaN(Number(key)) && expensesObj[key]?.expense) {
                expensesData.push(expensesObj[key].expense);
              }
            }
          }
        }

        if (!expensesData || expensesData.length === 0) {
          return [];
        }

        if (!Array.isArray(expensesData)) {
          expensesData = [expensesData];
        }

        logger.info('wFirma expenses data BEFORE mapping', {
          expensesData: JSON.stringify(expensesData, null, 2),
        });

        const expenses: WFirmaExpense[] = expensesData.map((e: any) =>
          this.mapExpenseData(e)
        );

        logger.info('wFirma expenses data AFTER mapping', {
          expenses: JSON.stringify(expenses, null, 2),
        });

        logger.info('Successfully fetched expenses from wFirma', {
          count: expenses.length,
        });

        return expenses;
      } catch (error) {
        logger.error('Failed to fetch expenses from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single expense by ID
   */
  async getExpense(id: string): Promise<WFirmaExpense | null> {
    logger.info('Fetching expense by ID from wFirma', { expenseId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Expense ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/expenses/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        logger.info('wFirma getExpense RESPONSE', {
          responseData: JSON.stringify(data, null, 2),
        });

        if (data.status?.code !== 'OK') {
          if (
            data.status?.code === 'NOT FOUND' ||
            data.status?.code === 'ACTION NOT FOUND'
          ) {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch expense',
            data.status
          );
        }

        // Parse flexible response format
        let expenseData = data.expenses?.expense;
        if (!expenseData) {
          const expensesObj = data.expenses;
          if (expensesObj) {
            for (const key in expensesObj) {
              if (!isNaN(Number(key)) && expensesObj[key]?.expense) {
                expenseData = expensesObj[key].expense;
                break;
              }
            }
          }
        }

        if (!expenseData) {
          return null;
        }

        const expense = this.mapExpenseData(expenseData);

        logger.info('Successfully fetched expense by ID', {
          expenseId: expense.id,
        });

        return expense;
      } catch (error) {
        logger.error('Failed to fetch expense by ID', { error, expenseId: id });
        throw error;
      }
    });
  }

  /**
   * Map wFirma expense data to WFirmaExpense type
   */
  private mapExpenseData(e: any): WFirmaExpense {
    // Map expense parts
    let parts: WFirmaExpensePart[] = [];

    if (e.expense_parts) {
      let partsData = e.expense_parts.expense_part;

      // Handle flexible response format
      if (!partsData) {
        const partsObj = e.expense_parts;
        if (partsObj) {
          partsData = [];
          for (const key in partsObj) {
            if (!isNaN(Number(key)) && partsObj[key]?.expense_part) {
              partsData.push(partsObj[key].expense_part);
            }
          }
        }
      }

      if (!Array.isArray(partsData) && partsData) {
        partsData = [partsData];
      }

      if (Array.isArray(partsData)) {
        parts = partsData.map((p: any) => this.mapExpensePartData(p));
      }
    }

    // Calculate totals from parts if not provided
    // Try multiple field name variations from wFirma API
    let totalNet = parseFloat(
      e.netto || e.total_net || e.totalNet || e.net || '0'
    );
    let totalVat = parseFloat(
      e.vat || e.tax || e.total_vat || e.totalVat || '0'
    );
    let total = parseFloat(
      e.brutto || e.total || e.gross || e.amount || e.value || '0'
    );

    // If VAT is not provided, calculate it from brutto - netto
    if (totalVat === 0 && total > 0 && totalNet > 0) {
      totalVat = total - totalNet;
    }

    // If still zero, try to calculate from parts
    if (parts.length > 0 && total === 0) {
      totalNet = parts.reduce((sum, p) => sum + p.totalNet, 0);
      totalVat = parts.reduce((sum, p) => sum + p.totalVat, 0);
      total = parts.reduce((sum, p) => sum + p.totalGross, 0);
    }

    return {
      id: e.id || '',
      type: (e.type || 'invoice') as ExpenseType,
      date: new Date(e.date || Date.now()),
      taxregisterDate: e.taxregister_date ? new Date(e.taxregister_date) : undefined,
      paymentDate: e.payment_date ? new Date(e.payment_date) : undefined,
      paymentMethod: e.payment_method as PaymentMethod,
      paid: e.paymentstate === 'paid' || e.paid === '1' || e.paid === true,
      alreadypaidInitial: parseFloat(e.alreadypaid_initial || e.alreadypaid || '0'),
      currency: e.currency || 'PLN',
      accountingEffect: (e.accounting_effect || 'kpir_and_vat') as AccountingEffect,
      warehouseType: e.warehouse_type as any,
      schemaVatCashbox: e.schema_vat_cashbox === '1' || e.schema_vat_cashbox === true,
      wnt: e.wnt === '1' || e.wnt === true,
      serviceImport: e.service_import === '1' || e.service_import === true,
      serviceImport2: e.service_import2 === '1' || e.service_import2 === true,
      cargoImport: e.cargo_import === '1' || e.cargo_import === true,
      splitPayment: e.split_payment === '1' || e.split_payment === true,
      draft: e.draft === '1' || e.draft === true,
      taxEvaluationMethod: (e.tax_evaluation_method || 'netto') as TaxEvaluationMethod,

      // Contractor information
      contractorId: e.contractor_id || e.contractor?.id || e.contractor_detail?.id,
      contractorName: e.contractor_name || e.contractor_detail?.name || e.contractors?.contractor?.name,
      contractorNip: e.contractor_nip || e.contractor_detail?.nip || e.contractors?.contractor?.nip,

      // Totals
      total,
      totalNet,
      totalVat,

      // Parts
      parts,

      createdAt: new Date(e.created || Date.now()),
      updatedAt: new Date(e.modified || Date.now()),
    };
  }

  /**
   * Map wFirma expense part data to WFirmaExpensePart type
   */
  private mapExpensePartData(p: any): WFirmaExpensePart {
    // Get VAT content data if available (contains netto/brutto/tax)
    let vatContent: any = null;
    if (p.expense_part_vat_contents) {
      const vatContents = p.expense_part_vat_contents;
      // Handle flexible format
      if (vatContents['0']?.expense_part_vat_content) {
        vatContent = vatContents['0'].expense_part_vat_content;
      } else if (vatContents.expense_part_vat_content) {
        vatContent = Array.isArray(vatContents.expense_part_vat_content)
          ? vatContents.expense_part_vat_content[0]
          : vatContents.expense_part_vat_content;
      }
    }

    // Try multiple field name variations
    const count = parseFloat(p.count || p.quantity || p.amount || '1');
    const price = parseFloat(
      vatContent?.netto || p.price || p.netto || p.unit_price || p.price_net || '0'
    );
    const totalNet = parseFloat(
      vatContent?.netto || p.netto || p.total_net || p.totalNet || p.net || (price * count).toString() || '0'
    );
    const totalVat = parseFloat(
      vatContent?.tax || p.tax || p.vat || p.total_vat || p.totalVat || '0'
    );
    const totalGross = parseFloat(
      vatContent?.brutto || p.brutto || p.total_gross || p.totalGross || p.gross || (totalNet + totalVat).toString() || '0'
    );

    // Get VAT code from vat_code or from vat content
    const vatCodeId = vatContent?.vat_code?.id || p.vat_code?.id || p.vat_code || p.vatCode || '0';

    return {
      id: p.id || '',
      expensePartType: (p.expense_part_type || p.expensePartType || 'rates') as ExpensePartType,
      schema: (p.schema || 'cost') as ExpenseSchema,
      goodAction: p.good_action || p.goodAction,
      goodId: p.good_id || p.goodId,
      name: p.name || p.good_name || p.goodName || p.description || '-',
      unit: p.unit,
      unitId: p.unit_id || p.unitId,
      count,
      price,
      vatCode: vatCodeId.toString(),
      totalNet,
      totalVat,
      totalGross,
    };
  }
}
