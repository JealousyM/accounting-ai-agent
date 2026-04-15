/**
 * wFirma Payment Service
 * Handles payment operations for invoices and expenses
 */

import { logger } from '../../utils/logger';
import {
  WFirmaPayment,
  PaymentFilters,
  PaymentData,
  PaymentUpdateData,
  PaymentAccount,
  PaymentMethod,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaPaymentService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Find payments with filtering and pagination
   */
  async findPayments(filters?: PaymentFilters): Promise<WFirmaPayment[]> {
    logger.info('Fetching payments from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        // Object name filter
        if (filters?.objectName) {
          conditions.push({
            field: 'object_name',
            operator: 'eq',
            value: filters.objectName,
          });
        }

        // Object ID filter
        if (filters?.objectId) {
          conditions.push({
            field: 'object_id',
            operator: 'eq',
            value: filters.objectId,
          });
        }

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

        // Payment method filter
        if (filters?.paymentMethod) {
          conditions.push({
            field: 'payment_method',
            operator: 'eq',
            value: filters.paymentMethod,
          });
        }

        // Amount range filters
        if (filters?.minAmount !== undefined) {
          conditions.push({
            field: 'value',
            operator: 'ge',
            value: filters.minAmount.toString(),
          });
        }

        if (filters?.maxAmount !== undefined) {
          conditions.push({
            field: 'value',
            operator: 'le',
            value: filters.maxAmount.toString(),
          });
        }

        // Pagination
        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const paymentsParams: any = {
          parameters: {
            limit,
            page,
            order: { desc: 'Payment.date' },
          },
        };

        const builtConditions = this.client.buildConditions(conditions);
          if (builtConditions) {
            paymentsParams.parameters.conditions = builtConditions;
          }

        const payload = {
          api: {
            payments: paymentsParams,
          },
        };

        logger.info('wFirma findPayments REQUEST', {
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/payments/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        logger.info('wFirma findPayments RESPONSE', {
          responseData: JSON.stringify(data, null, 2),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch payments',
            data.status
          );
        }

        // Parse flexible response format
        let paymentsData = data.payments?.payment;
        if (!paymentsData) {
          const paymentsObj = data.payments;
          if (paymentsObj) {
            paymentsData = [];
            for (const key in paymentsObj) {
              if (!isNaN(Number(key)) && paymentsObj[key]?.payment) {
                paymentsData.push(paymentsObj[key].payment);
              }
            }
          }
        }

        if (!paymentsData || paymentsData.length === 0) {
          return [];
        }

        if (!Array.isArray(paymentsData)) {
          paymentsData = [paymentsData];
        }

        logger.info('wFirma payments data BEFORE mapping', {
          paymentsData: JSON.stringify(paymentsData, null, 2),
        });

        const payments: WFirmaPayment[] = paymentsData.map((p: any) =>
          this.mapPaymentData(p)
        );

        logger.info('wFirma payments data AFTER mapping', {
          payments: JSON.stringify(payments, null, 2),
        });

        logger.info('Successfully fetched payments from wFirma', {
          count: payments.length,
        });

        return payments;
      } catch (error) {
        logger.error('Failed to fetch payments from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single payment by ID
   */
  async getPayment(id: string): Promise<WFirmaPayment | null> {
    logger.info('Fetching payment by ID from wFirma', { paymentId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Payment ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/payments/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (
            data.status?.code === 'NOT FOUND' ||
            data.status?.code === 'ACTION NOT FOUND'
          ) {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch payment',
            data.status
          );
        }

        // Parse flexible response format
        let paymentData = data.payments?.payment;
        if (!paymentData) {
          const paymentsObj = data.payments;
          if (paymentsObj) {
            for (const key in paymentsObj) {
              if (!isNaN(Number(key)) && paymentsObj[key]?.payment) {
                paymentData = paymentsObj[key].payment;
                break;
              }
            }
          }
        }

        if (!paymentData) {
          return null;
        }

        const payment = this.mapPaymentData(paymentData);

        logger.info('Successfully fetched payment by ID', {
          paymentId: payment.id,
        });

        return payment;
      } catch (error) {
        logger.error('Failed to fetch payment by ID', { error, paymentId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new payment
   */
  async createPayment(data: PaymentData): Promise<WFirmaPayment> {
    logger.info('Creating payment in wFirma', {
      objectName: data.objectName,
      objectId: data.objectId,
    });

    return this.client.withRetry(async () => {
      try {
        // Validation
        if (!data.objectName || !data.objectId) {
          throw new WFirmaValidationError(
            'Object name and object ID are required'
          );
        }
        if (!data.value || data.value <= 0) {
          throw new WFirmaValidationError(
            'Payment value must be greater than 0'
          );
        }
        if (!data.date) {
          throw new WFirmaValidationError('Payment date is required');
        }

        const paymentData: Record<string, string> = {
          object_name: data.objectName,
          object_id: data.objectId,
          value: data.value.toString(),
          date:
            data.date instanceof Date
              ? data.date.toISOString().split('T')[0]
              : data.date,
        };

        if (data.account) paymentData.account = data.account;
        if (data.valuePln) paymentData.value_pln = data.valuePln.toString();
        if (data.paymentMethod) paymentData.payment_method = data.paymentMethod;

        const payload = {
          api: {
            payments: {
              payment: paymentData,
            },
          },
        };

        logger.info('wFirma create payment REQUEST', {
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/payments/add',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create payment RESPONSE', {
          responseData: JSON.stringify(responseData, null, 2),
        });

        if (responseData.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to create payment',
            responseData.status
          );
        }

        // Parse flexible response format
        let createdPayment = responseData.payments?.payment;
        if (!createdPayment && responseData.payments) {
          for (const key in responseData.payments) {
            if (!isNaN(Number(key)) && responseData.payments[key]?.payment) {
              createdPayment = responseData.payments[key].payment;
              break;
            }
          }
        }

        if (!createdPayment) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No payment data in response',
            responseData
          );
        }

        logger.info('wFirma payment data BEFORE mapping', {
          createdPayment: JSON.stringify(createdPayment, null, 2),
        });

        const payment = this.mapPaymentData(createdPayment);

        logger.info('wFirma payment data AFTER mapping', {
          payment: JSON.stringify(payment, null, 2),
        });

        logger.info('Successfully created payment in wFirma', {
          paymentId: payment.id,
        });

        return payment;
      } catch (error) {
        logger.error('Failed to create payment in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Update an existing payment
   * Note: Cannot update objectName or objectId
   */
  async updatePayment(
    id: string,
    data: PaymentUpdateData
  ): Promise<WFirmaPayment> {
    logger.info('Updating payment in wFirma', {
      paymentId: id,
      updates: Object.keys(data),
    });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Payment ID is required');
        }

        const paymentPayload: Record<string, unknown> = {};

        if (data.value !== undefined) {
          if (data.value <= 0) {
            throw new WFirmaValidationError(
              'Payment value must be greater than 0'
            );
          }
          paymentPayload.value = data.value.toString();
        }
        if (data.account !== undefined) paymentPayload.account = data.account;
        if (data.valuePln !== undefined)
          paymentPayload.value_pln = data.valuePln.toString();
        if (data.date !== undefined) {
          paymentPayload.date =
            data.date instanceof Date
              ? data.date.toISOString().split('T')[0]
              : data.date;
        }
        if (data.paymentMethod !== undefined)
          paymentPayload.payment_method = data.paymentMethod;

        if (Object.keys(paymentPayload).length === 0) {
          throw new WFirmaValidationError('No fields to update');
        }

        const payload = {
          api: {
            payments: {
              payment: paymentPayload,
            },
          },
        };

        logger.debug('wFirma update payment payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/payments/edit/${id}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (
            responseData.status?.code === 'NOT FOUND' ||
            responseData.status?.code === 'ACTION NOT FOUND'
          ) {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Payment with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update payment',
            responseData.status
          );
        }

        // Parse flexible response format
        let paymentData = responseData.payments?.payment;
        if (!paymentData) {
          const paymentsObj = responseData.payments;
          if (paymentsObj) {
            for (const key in paymentsObj) {
              if (!isNaN(Number(key)) && paymentsObj[key]?.payment) {
                paymentData = paymentsObj[key].payment;
                break;
              }
            }
          }
        }

        if (!paymentData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No payment data in response',
            responseData
          );
        }

        const payment = this.mapPaymentData(paymentData);

        logger.info('Successfully updated payment in wFirma', {
          paymentId: payment.id,
        });

        return payment;
      } catch (error) {
        logger.error('Failed to update payment in wFirma', {
          error,
          paymentId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Delete a payment
   */
  async deletePayment(id: string): Promise<DeleteResult> {
    logger.info('Deleting payment from wFirma', { paymentId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Payment ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'DELETE',
          url: `/payments/delete/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (
            responseData.status?.code === 'NOT FOUND' ||
            responseData.status?.code === 'ACTION NOT FOUND'
          ) {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Payment with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete payment',
            responseData.status
          );
        }

        logger.info('Successfully deleted payment from wFirma', {
          paymentId: id,
        });

        return {
          success: true,
          id,
          message: `Payment ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete payment from wFirma', {
          error,
          paymentId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Map wFirma payment data to WFirmaPayment type
   */
  private mapPaymentData(p: any): WFirmaPayment {
    return {
      id: p.id || '',
      objectName: p.object_name || 'invoice',
      objectId: p.object_id || '',
      value: parseFloat(p.value || '0'),
      currency: p.currency || p.invoice?.currency || undefined,
      valuePln: p.value_pln ? parseFloat(p.value_pln) : undefined,
      account: p.account as PaymentAccount,
      date: new Date(p.date || Date.now()),
      paymentMethod: p.payment_method as PaymentMethod,
      paymentType: p.payment_type,
      initial: p.initial === '1' || p.initial === true,
      type: p.type || '',
      createdAt: new Date(p.created || Date.now()),
      updatedAt: new Date(p.modified || Date.now()),
    };
  }
}
