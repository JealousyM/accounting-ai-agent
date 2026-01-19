/**
 * wFirma Invoice Service
 * Handles invoice operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaInvoice,
  WFirmaInvoiceFilters,
  WFirmaInvoiceItem,
  SendInvoiceOptions,
  SendInvoiceResult,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaInvoiceService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Find invoices with filtering, sorting, and pagination
   */
  async findInvoices(filters?: WFirmaInvoiceFilters): Promise<WFirmaInvoice[]> {
    logger.info('Fetching invoices from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.dateFrom) {
          const dateFrom = filters.dateFrom instanceof Date
            ? filters.dateFrom.toISOString().split('T')[0]
            : filters.dateFrom;
          conditions.push({
            field: 'date',
            operator: 'ge',
            value: dateFrom,
          });
        }

        if (filters?.dateTo) {
          const dateTo = filters.dateTo instanceof Date
            ? filters.dateTo.toISOString().split('T')[0]
            : filters.dateTo;
          conditions.push({
            field: 'date',
            operator: 'le',
            value: dateTo,
          });
        }

        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        if (filters?.contractorId) {
          conditions.push({
            field: 'contractor',
            operator: 'eq',
            value: filters.contractorId,
          });
        }

        if (filters?.invoiceNumber) {
          conditions.push({
            field: 'fullnumber',
            operator: 'like',
            value: `%${filters.invoiceNumber}%`,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const invoicesParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        if (filters?.sortBy) {
          const sortField = this.mapInvoiceSortField(filters.sortBy);
          if (filters.sortOrder === 'asc') {
            invoicesParams.parameters.order = { asc: sortField };
          } else {
            invoicesParams.parameters.order = { desc: sortField };
          }
        } else {
          invoicesParams.parameters.order = { desc: 'Invoice.id' };
        }

        if (conditions.length > 0) {
          invoicesParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            invoices: invoicesParams,
          },
        };

        logger.debug('wFirma findInvoices payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/invoices/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch invoices',
            data.status
          );
        }

        let invoicesData = data.invoices?.invoice;

        if (!invoicesData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            invoicesData = [];
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoicesData.push(invoicesObj[key].invoice);
              }
            }
          }
        }

        if (!invoicesData || invoicesData.length === 0) {
          return [];
        }

        if (!Array.isArray(invoicesData)) {
          invoicesData = [invoicesData];
        }

        let invoices: WFirmaInvoice[] = invoicesData.map((inv: any) => this.mapInvoiceData(inv));

        if (filters?.status) {
          invoices = invoices.filter(inv => inv.status === filters.status);
        }

        logger.info('Successfully fetched invoices from wFirma', {
          count: invoices.length,
        });

        return invoices;
      } catch (error) {
        logger.error('Failed to fetch invoices from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single invoice by ID from wFirma
   */
  async getInvoiceById(id: string): Promise<WFirmaInvoice | null> {
    logger.info('Fetching invoice by ID from wFirma', { invoiceId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/invoices/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch invoice',
            data.status
          );
        }

        let invoiceData = data.invoices?.invoice;
        if (!invoiceData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoiceData = invoicesObj[key].invoice;
                break;
              }
            }
          }
        }

        if (!invoiceData) {
          return null;
        }

        const invoice = this.mapInvoiceData(invoiceData);

        logger.info('Successfully fetched invoice by ID', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });

        return invoice;
      } catch (error) {
        logger.error('Failed to fetch invoice by ID', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId: string, options: SendInvoiceOptions = {}): Promise<SendInvoiceResult> {
    logger.info('Sending invoice via email', { invoiceId, options });

    return this.client.withRetry(async () => {
      try {
        if (!invoiceId) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const parameters: Array<{ name: string; value: string }> = [];

        if (options.email) {
          parameters.push({ name: 'email', value: options.email });
        }
        if (options.subject) {
          parameters.push({ name: 'subject', value: options.subject });
        }
        if (options.body) {
          parameters.push({ name: 'body', value: options.body });
        }
        parameters.push({ name: 'page', value: options.page || 'invoice' });
        parameters.push({ name: 'leaflet', value: options.leaflet ? '1' : '0' });
        parameters.push({ name: 'duplicate', value: options.duplicate ? '1' : '0' });

        const payload = {
          api: {
            invoices: {
              parameters: {
                parameter: parameters,
              },
            },
          },
        };

        logger.debug('wFirma sendInvoice payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/invoices/send/${invoiceId}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to send invoice',
            data.status
          );
        }

        let deliveryId: string | undefined;
        if (data.invoice_deliveries) {
          const deliveriesObj = data.invoice_deliveries;
          for (const key in deliveriesObj) {
            if (!isNaN(Number(key)) && deliveriesObj[key]?.invoice_delivery) {
              deliveryId = deliveriesObj[key].invoice_delivery.id;
              break;
            }
          }
        }

        const result: SendInvoiceResult = {
          success: true,
          invoiceId,
          deliveryId,
          email: options.email || '',
          sentAt: new Date(),
          message: 'Invoice sent successfully',
        };

        logger.info('Successfully sent invoice', { invoiceId, deliveryId });

        return result;
      } catch (error) {
        logger.error('Failed to send invoice', { error, invoiceId });
        throw error;
      }
    });
  }

  /**
   * Delete an invoice delivery
   */
  async deleteInvoiceDelivery(deliveryId: string): Promise<DeleteResult> {
    logger.info('Deleting invoice delivery', { deliveryId });

    return this.client.withRetry(async () => {
      try {
        if (!deliveryId) {
          throw new WFirmaValidationError('Delivery ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'DELETE',
          url: `/invoice_deliveries/delete/${deliveryId}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Invoice delivery with ID ${deliveryId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to delete invoice delivery',
            data.status
          );
        }

        logger.info('Successfully deleted invoice delivery', { deliveryId });

        return {
          success: true,
          id: deliveryId,
          message: `Invoice delivery ${deliveryId} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete invoice delivery', { error, deliveryId });
        throw error;
      }
    });
  }

  /**
   * Map sort field name to wFirma field
   */
  private mapInvoiceSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      date: 'Invoice.date',
      dueDate: 'Invoice.paymentdate',
      total: 'Invoice.total',
      invoiceNumber: 'Invoice.fullnumber',
    };
    return fieldMap[sortBy] || 'Invoice.id';
  }

  /**
   * Map wFirma invoice data to our WFirmaInvoice type
   */
  mapInvoiceData(inv: any): WFirmaInvoice {
    const items: WFirmaInvoiceItem[] = [];
    if (inv.invoicecontents) {
      let contentsData = inv.invoicecontents.invoicecontent;
      if (!contentsData) {
        const contentsObj = inv.invoicecontents;
        contentsData = [];
        for (const key in contentsObj) {
          if (!isNaN(Number(key)) && contentsObj[key]?.invoicecontent) {
            contentsData.push(contentsObj[key].invoicecontent);
          }
        }
      }
      if (contentsData && !Array.isArray(contentsData)) {
        contentsData = [contentsData];
      }
      if (contentsData) {
        for (const item of contentsData) {
          items.push({
            name: item.name || '',
            quantity: parseFloat(item.count || '1'),
            unit: item.unit || 'szt.',
            priceNet: parseFloat(item.price || '0'),
            vatRate: parseFloat(item.vat || '23'),
            totalNet: parseFloat(item.netto || '0'),
            totalVat: parseFloat(item.vat_price || '0'),
            totalGross: parseFloat(item.brutto || '0'),
          });
        }
      }
    }

    let status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled' = 'issued';
    const alreadyPaid = parseFloat(inv.alreadypaid || '0');
    const total = parseFloat(inv.total || inv.brutto || '0');
    const paymentDate = inv.paymentdate ? new Date(inv.paymentdate) : null;
    const now = new Date();

    if (inv.disposaldate_empty === '1' || inv.type === 'proforma') {
      status = 'draft';
    } else if (alreadyPaid >= total && total > 0) {
      status = 'paid';
    } else if (paymentDate && paymentDate < now && alreadyPaid < total) {
      status = 'overdue';
    } else if (inv.sended === '1') {
      status = 'sent';
    }

    return {
      id: inv.id || '',
      invoiceNumber: inv.fullnumber || inv.number || '',
      issueDate: new Date(inv.date || Date.now()),
      dueDate: paymentDate || new Date(inv.date || Date.now()),
      sellDate: inv.disposaldate ? new Date(inv.disposaldate) : undefined,
      contractorId: inv.contractor || '',
      contractorName: inv.contractor_name || inv.contractorDetail?.name || '',
      contractorNip: inv.contractor_nip || inv.contractorDetail?.nip,
      items,
      total: parseFloat(inv.total || inv.brutto || '0'),
      totalNet: parseFloat(inv.netto || '0'),
      totalVat: parseFloat(inv.tax || '0'),
      currency: inv.currency || 'PLN',
      status,
      paymentMethod: inv.paymentmethod,
      notes: inv.notes,
      createdAt: new Date(inv.created || Date.now()),
      updatedAt: new Date(inv.modified || Date.now()),
    };
  }
}
