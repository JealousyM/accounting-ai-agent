/**
 * wFirma Invoice Service
 * Handles invoice operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaInvoice,
  WFirmaInvoiceFilters,
  SendInvoiceOptions,
  SendInvoiceResult,
  DeleteResult,
  InvoiceDownloadOptions,
  InvoiceDownloadResult,
  CreateInvoiceData,
  UpdateInvoiceData,
  FiscalizeResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';
import { mapInvoiceData, extractInvoiceFromResponse } from './invoice.mapper';

export class WFirmaInvoiceService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Find invoices with filtering, sorting, and pagination
   */
  async findInvoices(filters?: WFirmaInvoiceFilters): Promise<WFirmaInvoice[]> {
    logger.info('Fetching invoices from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: Array<Record<string, unknown>> = [];

        if (filters?.dateFrom) {
          conditions.push(this.client.buildDateCondition('date', 'ge', filters.dateFrom));
        }

        if (filters?.dateTo) {
          conditions.push(this.client.buildDateCondition('date', 'le', filters.dateTo));
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

        const builtConditions = this.client.buildConditions(conditions);
        if (builtConditions) {
          invoicesParams.parameters.conditions = builtConditions;
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

        // Debug log to see raw invoice data structure
        if (invoicesData.length > 0) {
          logger.debug('wFirma raw invoice data sample', {
            sampleKeys: Object.keys(invoicesData[0]),
            hasContractorName: !!invoicesData[0].contractor_name,
            hasContractors: !!invoicesData[0].contractors,
            currency: invoicesData[0].currency,
            currencyName: invoicesData[0].currency_name,
            contractorFields: {
              contractor: invoicesData[0].contractor,
              contractor_name: invoicesData[0].contractor_name,
              contractor_detail: invoicesData[0].contractor_detail,
              contractors: invoicesData[0].contractors,
            },
          });
        }

        let invoices: WFirmaInvoice[] = invoicesData.map((inv: any) => mapInvoiceData(inv));

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

        // Debug log to see raw invoice data structure from get endpoint
        logger.debug('wFirma raw invoice data from get', {
          keys: Object.keys(invoiceData),
          hasContractorName: !!invoiceData.contractor_name,
          hasContractors: !!invoiceData.contractors,
          currency: invoiceData.currency,
          contractorFields: {
            contractor: invoiceData.contractor,
            contractor_name: invoiceData.contractor_name,
            contractor_detail: invoiceData.contractor_detail,
            contractors: invoiceData.contractors,
          },
        });

        const invoice = mapInvoiceData(invoiceData);

        logger.info('Successfully fetched invoice by ID', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          contractorName: invoice.contractorName,
          currency: invoice.currency,
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
   * Download invoice as PDF
   */
  async downloadInvoice(
    invoiceId: string,
    options: InvoiceDownloadOptions = {}
  ): Promise<InvoiceDownloadResult> {
    logger.info('Downloading invoice PDF', { invoiceId, options });

    return this.client.withRetry(async () => {
      try {
        if (!invoiceId) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        // First get invoice info for filename
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
          throw new WFirmaError(
            'WFIRMA_NOT_FOUND',
            `Invoice with ID ${invoiceId} not found`,
            {},
            404
          );
        }

        // Build parameters
        const parameters: Array<{ name: string; value: string }> = [];
        parameters.push({ name: 'page', value: options.page || 'invoice' });
        parameters.push({ name: 'address', value: options.address ? '1' : '0' });
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

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/invoices/download/${invoiceId}`,
          params: this.client.buildQueryParams(),
          data: payload,
          responseType: 'arraybuffer',
        });

        const content = Buffer.from(response.data);
        const safeNumber = invoice.invoiceNumber.replace(/[/\\]/g, '_');
        const filename = `${safeNumber}.pdf`;

        logger.info('Successfully downloaded invoice PDF', {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          size: content.length,
        });

        return {
          content,
          filename,
          mimeType: 'application/pdf',
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
        };
      } catch (error) {
        logger.error('Failed to download invoice PDF', { error, invoiceId });
        throw error;
      }
    });
  }

  /**
   * Create a new invoice in wFirma
   */
  async createInvoice(data: CreateInvoiceData): Promise<WFirmaInvoice> {
    logger.info('Creating invoice in wFirma', { type: data.type });

    return this.client.withRetry(async () => {
      try {
        // Validate required fields
        if (!data.contractor) {
          throw new WFirmaValidationError('Contractor is required');
        }
        if (!data.type) {
          throw new WFirmaValidationError('Invoice type is required');
        }
        if (!data.invoicecontents || data.invoicecontents.length === 0) {
          throw new WFirmaValidationError('At least one invoice item is required');
        }

        const invoicePayload = this.buildCreateInvoicePayload(data);

        const payload = {
          api: {
            invoices: {
              invoice: invoicePayload,
            },
          },
        };

        logger.debug('wFirma create invoice payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/invoices/add',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        // Debug log ENTIRE response to see what wFirma returns
        logger.debug('wFirma create invoice FULL response', {
          fullResponseData: JSON.stringify(responseData, null, 2),
          responseKeys: Object.keys(responseData),
          statusCode: responseData.status?.code,
          statusMessage: responseData.status?.message,
          statusFields: responseData.status?.fields,
          fullStatus: responseData.status,
        });

        if (responseData.status?.code !== 'OK') {
          // Extract errors from invoice response (wFirma puts them in invoices['0'].invoice.errors)
          const invoiceResponse = responseData.invoices?.['0']?.invoice;
          const invoiceErrors = invoiceResponse?.errors;

          const errorMessages: string[] = [];
          if (invoiceErrors) {
            // Parse nested error objects: { "0": { "error": { "field": "...", "message": "..." } } }
            for (const key of Object.keys(invoiceErrors)) {
              const err = invoiceErrors[key]?.error;
              if (err?.message) {
                errorMessages.push(`${err.field || 'unknown'}: ${err.message}`);
              }
            }
          }

          const errorMessage = errorMessages.length > 0
            ? errorMessages.join('; ')
            : responseData.status?.message || 'Unknown error';

          logger.error('wFirma create invoice failed', {
            errorMessage,
            parsedErrors: errorMessages,
            invoiceErrors,
            fullStatus: responseData.status,
          });

          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            `wFirma error: ${errorMessage}`,
            { status: responseData.status, errors: invoiceErrors }
          );
        }

        // Extract created invoice from response
        const createdInvoice = extractInvoiceFromResponse(responseData);
        if (!createdInvoice) {
          throw new WFirmaError('WFIRMA_API_ERROR', 'No invoice data in response', responseData);
        }

        const invoice = mapInvoiceData(createdInvoice);
        logger.info('Successfully created invoice in wFirma', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });

        return invoice;
      } catch (error) {
        logger.error('Failed to create invoice', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing invoice in wFirma
   */
  async updateInvoice(id: string, data: UpdateInvoiceData): Promise<WFirmaInvoice> {
    logger.info('Updating invoice in wFirma', { invoiceId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const invoicePayload: Record<string, any> = { id };
        this.applyUpdateFields(invoicePayload, data);

        const payload = {
          api: {
            invoices: {
              invoice: invoicePayload,
            },
          },
        };

        logger.debug('wFirma update invoice payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/invoices/edit/${id}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError('WFIRMA_NOT_FOUND', `Invoice ${id} not found`, responseData.status, 404);
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update invoice',
            responseData.status
          );
        }

        const updatedInvoice = extractInvoiceFromResponse(responseData);
        if (!updatedInvoice) {
          throw new WFirmaError('WFIRMA_API_ERROR', 'No invoice data in response', responseData);
        }

        const invoice = mapInvoiceData(updatedInvoice);
        logger.info('Successfully updated invoice', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });

        return invoice;
      } catch (error) {
        logger.error('Failed to update invoice', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Delete an invoice from wFirma
   */
  async deleteInvoice(id: string): Promise<DeleteResult> {
    logger.info('Deleting invoice from wFirma', { invoiceId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'DELETE',
          url: `/invoices/delete/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError('WFIRMA_NOT_FOUND', `Invoice ${id} not found`, responseData.status, 404);
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete invoice',
            responseData.status
          );
        }

        logger.info('Successfully deleted invoice', { invoiceId: id });
        return { success: true, id, message: `Invoice ${id} deleted successfully` };
      } catch (error) {
        logger.error('Failed to delete invoice', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Mark fiscal receipt as fiscalized
   */
  async fiscalizeInvoice(id: string): Promise<FiscalizeResult> {
    logger.info('Fiscalizing invoice', { invoiceId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/invoices/fiscalize/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to fiscalize invoice',
            responseData.status
          );
        }

        logger.info('Successfully fiscalized invoice', { invoiceId: id });
        return { success: true, invoiceId: id, fiscalized: true, message: 'Invoice fiscalized successfully' };
      } catch (error) {
        logger.error('Failed to fiscalize invoice', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Undo fiscalization of a fiscal receipt
   */
  async unfiscalizeInvoice(id: string): Promise<FiscalizeResult> {
    logger.info('Unfiscalizing invoice', { invoiceId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/invoices/unfiscalize/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to unfiscalize invoice',
            responseData.status
          );
        }

        logger.info('Successfully unfiscalized invoice', { invoiceId: id });
        return { success: true, invoiceId: id, fiscalized: false, message: 'Invoice unfiscalized successfully' };
      } catch (error) {
        logger.error('Failed to unfiscalize invoice', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Build payload for creating an invoice
   */
  private buildCreateInvoicePayload(data: CreateInvoiceData): Record<string, any> {
    const payload: Record<string, any> = {
      type: data.type,
    };

    // Contractor reference - must be nested object, not just ID string
    if (data.contractor.contractor_id) {
      // When referencing existing contractor by ID, use nested object format
      payload.contractor = { id: data.contractor.contractor_id };
    } else {
      // Inline contractor - create new contractor with data
      const contractorData: Record<string, string> = {};
      if (data.contractor.name) contractorData.name = data.contractor.name;
      if (data.contractor.nip) contractorData.nip = data.contractor.nip;
      if (data.contractor.zip) contractorData.zip = data.contractor.zip;
      if (data.contractor.city) contractorData.city = data.contractor.city;
      if (data.contractor.street) contractorData.street = data.contractor.street;
      if (data.contractor.country) contractorData.country = data.contractor.country;
      payload.contractor = contractorData;
    }

    // Invoice items - wFirma expects numeric keys with nested invoicecontent objects
    const invoiceContentsObj: Record<string, any> = {};
    data.invoicecontents.forEach((item, index) => {
      invoiceContentsObj[index.toString()] = {
        invoicecontent: {
          name: item.name,
          count: item.count.toString(),
          unit_count: item.unit_count,
          price: item.price.toString(),
          unit: item.unit || '',
          vat: item.vat || '23',
        },
      };
    });
    payload.invoicecontents = invoiceContentsObj;

    // Optional fields
    if (data.date) payload.date = data.date;
    if (data.disposaldate) payload.disposaldate = data.disposaldate;
    if (data.paymentdate) payload.paymentdate = data.paymentdate;
    if (data.paymentmethod) payload.paymentmethod = data.paymentmethod;
    if (data.currency) payload.currency = data.currency;
    if (data.description) payload.description = data.description;
    if (data.series) payload.series = data.series;
    if (data.alreadypaid_initial !== undefined) {
      payload.alreadypaid_initial = data.alreadypaid_initial.toString();
    }
    if (data.tags && data.tags.length > 0) {
      payload.tags = data.tags.map(t => `(${t})`).join(',');
    }

    return payload;
  }

  /**
   * Apply update fields to payload
   */
  private applyUpdateFields(payload: Record<string, any>, data: UpdateInvoiceData): void {
    if (data.type) payload.type = data.type;
    if (data.date) payload.date = data.date;
    if (data.disposaldate) payload.disposaldate = data.disposaldate;
    if (data.paymentdate) payload.paymentdate = data.paymentdate;
    if (data.paymentmethod) payload.paymentmethod = data.paymentmethod;
    if (data.currency) payload.currency = data.currency;
    if (data.description !== undefined) payload.description = data.description;
    if (data.alreadypaid !== undefined) payload.alreadypaid = data.alreadypaid.toString();

    if (data.contractor) {
      if (data.contractor.contractor_id) {
        // When referencing existing contractor by ID, use nested object format
        payload.contractor = { id: data.contractor.contractor_id };
      } else {
        // Inline contractor data
        const contractorData: Record<string, string> = {};
        if (data.contractor.name) contractorData.name = data.contractor.name;
        if (data.contractor.nip) contractorData.nip = data.contractor.nip;
        if (data.contractor.city) contractorData.city = data.contractor.city;
        if (data.contractor.zip) contractorData.zip = data.contractor.zip;
        payload.contractor = contractorData;
      }
    }

    if (data.invoicecontents && data.invoicecontents.length > 0) {
      // wFirma expects numeric keys with nested invoicecontent objects
      const invoiceContentsObj: Record<string, any> = {};
      data.invoicecontents.forEach((item, index) => {
        invoiceContentsObj[index.toString()] = {
          invoicecontent: {
            name: item.name,
            count: item.count.toString(),
            unit_count: item.unit_count,
            price: item.price.toString(),
            unit: item.unit || '',
            vat: item.vat || '23',
          },
        };
      });
      payload.invoicecontents = invoiceContentsObj;
    }
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

}

// Re-export for callers that used to call invoiceService.mapInvoiceData directly
export { mapInvoiceData } from './invoice.mapper';
