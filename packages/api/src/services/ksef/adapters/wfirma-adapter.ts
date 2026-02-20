/**
 * WFirma KSeF Adapter
 * Proxies KSeF operations through the wFirma API integration.
 *
 * wFirma handles the KSeF session management, FA(3) XML generation,
 * and invoice submission internally. This adapter delegates to
 * WFirmaIntegrationService and tracks results in KSeFInvoiceStatus.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { WFirmaIntegrationService } from '../../wfirma';
import { KSeFError } from '../errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import type { IKSeFAdapter } from './adapter.interface';
import type {
  SendToKSeFOptions,
  SendToKSeFResult,
  KSeFInvoiceStatusInfo,
  KSeFUPO,
  QueryKSeFInvoicesOptions,
  KSeFInvoiceListItem,
  BulkSendToKSeFOptions,
  BulkSendToKSeFResult,
  KSeFInvoiceStatus,
} from '../../../types/ksef.types';

export class WFirmaKSeFAdapter implements IKSeFAdapter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly wfirmaService: WFirmaIntegrationService
  ) {
    logger.info('WFirmaKSeFAdapter initialized');
  }

  // ------------------------------------------
  // sendInvoice
  // ------------------------------------------

  async sendInvoice(userId: string, options: SendToKSeFOptions): Promise<SendToKSeFResult> {
    logger.info('Sending invoice to KSeF via wFirma', { userId, invoiceId: options.invoiceId });

    try {
      if (!options.invoiceId) {
        throw new KSeFError('INVOICE_ID_REQUIRED', 'invoiceId is required for wFirma adapter');
      }
      // Get invoice from wFirma to validate it exists and check KSeF status
      const invoice = await this.wfirmaService.getInvoiceById(options.invoiceId);
      if (!invoice) {
        throw new KSeFError('INVOICE_NOT_FOUND', `Invoice ${options.invoiceId} not found in wFirma`);
      }

      // Check if we already have a tracking record for this invoice
      const existingRecord = await this.prisma.kSeFInvoiceStatus.findFirst({
        where: { userId, wfirmaInvoiceId: options.invoiceId },
        orderBy: { createdAt: 'desc' },
      });

      // If wFirma already sent this invoice to KSeF (auto-send configured in wFirma settings)
      if (invoice.ksefReferenceNumber) {
        const data = {
          userId,
          wfirmaInvoiceId: options.invoiceId,
          ksefReferenceNumber: invoice.ksefReferenceNumber,
          ksefInvoiceNumber: invoice.invoiceNumber,
          contractorName: invoice.contractorName,
          contractorNip: invoice.contractorNip,
          totalGross: invoice.total,
          currency: invoice.currency,
          invoiceDate: invoice.issueDate ? new Date(invoice.issueDate) : null,
          status: 'accepted' as const,
          adapter: 'wfirma' as const,
          direction: 'sent' as const,
          sentAt: new Date(),
          acceptedAt: new Date(),
        };

        existingRecord
          ? await this.prisma.kSeFInvoiceStatus.update({ where: { id: existingRecord.id }, data })
          : await this.prisma.kSeFInvoiceStatus.create({ data });

        logger.info('wFirma already sent invoice to KSeF', {
          userId,
          invoiceId: options.invoiceId,
          ksefReferenceNumber: invoice.ksefReferenceNumber,
        });

        return {
          success: true,
          referenceNumber: invoice.ksefReferenceNumber,
          status: 'accepted',
          adapter: 'wfirma',
          message: 'Invoice already sent to KSeF by wFirma',
          timestamp: new Date(),
        };
      }

      // wFirma hasn't sent to KSeF yet (pending wFirma auto-send or manual trigger)
      const data = {
        userId,
        wfirmaInvoiceId: options.invoiceId,
        ksefInvoiceNumber: invoice.invoiceNumber,
        contractorName: invoice.contractorName,
        contractorNip: invoice.contractorNip,
        totalGross: invoice.total,
        currency: invoice.currency,
        invoiceDate: invoice.issueDate ? new Date(invoice.issueDate) : null,
        status: 'pending' as const,
        adapter: 'wfirma' as const,
        direction: 'sent' as const,
      };

      const record = existingRecord
        ? await this.prisma.kSeFInvoiceStatus.update({ where: { id: existingRecord.id }, data })
        : await this.prisma.kSeFInvoiceStatus.create({ data });

      return {
        success: true,
        referenceNumber: record.id,
        status: 'pending',
        adapter: 'wfirma',
        message: 'Invoice queued for KSeF submission via wFirma. Status will update automatically when wFirma processes it.',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send invoice to KSeF via wFirma', {
        error,
        userId,
        invoiceId: options.invoiceId,
      });

      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'WFIRMA_KSEF_ERROR',
        `Failed to send to KSeF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // getInvoiceStatus
  // ------------------------------------------

  async getInvoiceStatus(userId: string, referenceNumber: string): Promise<KSeFInvoiceStatusInfo> {
    logger.info('Getting KSeF invoice status via wFirma', { userId, referenceNumber });

    try {
      // Query from local DB first
      const record = await this.prisma.kSeFInvoiceStatus.findFirst({
        where: {
          userId,
          OR: [
            ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
            { ksefReferenceNumber: referenceNumber },
          ],
        },
      });

      if (!record) {
        throw new KSeFError(
          'STATUS_NOT_FOUND',
          `No KSeF status found for reference ${referenceNumber}`,
          undefined,
          404
        );
      }

      // For pending/sending records, re-fetch from wFirma to check if KSeF reference is now available
      if ((record.status === 'pending' || record.status === 'sending') && record.wfirmaInvoiceId) {
        try {
          const freshInvoice = await this.wfirmaService.getInvoiceById(record.wfirmaInvoiceId);
          if (freshInvoice?.ksefReferenceNumber) {
            // wFirma has processed it — update our record
            await this.prisma.kSeFInvoiceStatus.update({
              where: { id: record.id },
              data: {
                ksefReferenceNumber: freshInvoice.ksefReferenceNumber,
                status: 'accepted',
                acceptedAt: new Date(),
              },
            });
            logger.info('wFirma invoice now has KSeF reference, updating status to accepted', {
              userId,
              invoiceId: record.wfirmaInvoiceId,
              ksefReferenceNumber: freshInvoice.ksefReferenceNumber,
            });
            return {
              referenceNumber: freshInvoice.ksefReferenceNumber,
              invoiceNumber: record.ksefInvoiceNumber ?? '',
              status: 'accepted',
              adapter: 'wfirma',
              sentAt: record.sentAt ?? undefined,
              acceptedAt: new Date(),
              upoAvailable: false,
              errorCode: undefined,
              errorMessage: undefined,
            };
          }
        } catch (pollError) {
          // Non-critical: log but don't fail status check
          logger.warn('Failed to re-fetch wFirma invoice for KSeF status update', {
            error: pollError instanceof Error ? pollError.message : 'Unknown',
            invoiceId: record.wfirmaInvoiceId,
          });
        }
      }

      return {
        referenceNumber: record.ksefReferenceNumber ?? record.id,
        invoiceNumber: record.ksefInvoiceNumber ?? '',
        status: record.status as KSeFInvoiceStatus,
        adapter: 'wfirma',
        sentAt: record.sentAt ?? undefined,
        acceptedAt: record.acceptedAt ?? undefined,
        rejectedAt: record.rejectedAt ?? undefined,
        upoAvailable: record.upoDownloaded,
        errorCode: record.errorCode ?? undefined,
        errorMessage: record.errorMessage ?? undefined,
      };
    } catch (error) {
      logger.error('Failed to get KSeF invoice status via wFirma', {
        error,
        userId,
        referenceNumber,
      });

      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'WFIRMA_KSEF_ERROR',
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // downloadUPO
  // ------------------------------------------

  async downloadUPO(userId: string, referenceNumber: string): Promise<KSeFUPO> {
    logger.info('Downloading UPO via wFirma', { userId, referenceNumber });

    try {
      const record = await this.prisma.kSeFInvoiceStatus.findFirst({
        where: {
          userId,
          OR: [
            ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
            { ksefReferenceNumber: referenceNumber },
          ],
        },
      });

      if (!record) {
        throw new KSeFError(
          'STATUS_NOT_FOUND',
          `No KSeF status found for reference ${referenceNumber}`,
          undefined,
          404
        );
      }

      // Return cached UPO if already downloaded
      if (record.upoDownloaded && record.upoContent) {
        return {
          referenceNumber: record.ksefReferenceNumber ?? record.id,
          upoContent: record.upoContent,
          timestamp: record.upoDownloadedAt ?? record.updatedAt,
          fileName: `UPO_${record.ksefInvoiceNumber ?? record.id}.xml`,
        };
      }

      // UPO download for wFirma adapter invoices that have a KSeF reference number
      // is handled at the KSeFService facade level (cross-adapter delegation to DirectKSeFAdapter).
      // This path is reached only when ksefReferenceNumber is not yet available.
      throw new KSeFError(
        'UPO_NOT_AVAILABLE',
        'UPO is not yet available. The invoice is pending KSeF processing by wFirma. ' +
        'Once wFirma sends the invoice to KSeF and the reference number is assigned, UPO will be downloadable automatically.',
        undefined,
        409
      );
    } catch (error) {
      logger.error('Failed to download UPO via wFirma', {
        error,
        userId,
        referenceNumber,
      });

      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'WFIRMA_KSEF_ERROR',
        `Failed to download UPO: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // queryInvoices
  // ------------------------------------------

  async queryInvoices(
    userId: string,
    options: QueryKSeFInvoicesOptions
  ): Promise<KSeFInvoiceListItem[]> {
    logger.info('Querying KSeF invoices via wFirma', { userId, options });

    try {
      const where: any = { userId };

      if (options.status) {
        where.status = options.status;
      }

      if (options.direction) {
        where.direction = options.direction;
      }

      if (options.dateFrom || options.dateTo) {
        where.createdAt = {};
        if (options.dateFrom) where.createdAt.gte = options.dateFrom;
        if (options.dateTo) where.createdAt.lte = options.dateTo;
      }

      const records = await this.prisma.kSeFInvoiceStatus.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      });

      return records.map((record) => ({
        referenceNumber: record.ksefReferenceNumber ?? record.id,
        invoiceNumber: record.ksefInvoiceNumber ?? '',
        issueDate: record.invoiceDate ?? record.createdAt,
        contractorName: record.contractorName ?? '',
        totalGross: record.totalGross ? Number(record.totalGross) : 0,
        currency: record.currency ?? 'PLN',
        status: record.status as KSeFInvoiceStatus,
        direction: record.direction as 'sent' | 'received',
        adapter: 'wfirma',
        errorCode: record.errorCode ?? undefined,
        errorMessage: record.errorMessage ?? undefined,
      }));
    } catch (error) {
      logger.error('Failed to query KSeF invoices via wFirma', {
        error,
        userId,
      });

      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'WFIRMA_KSEF_ERROR',
        `Failed to query invoices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // bulkSendInvoices
  // ------------------------------------------

  async bulkSendInvoices(
    userId: string,
    options: BulkSendToKSeFOptions
  ): Promise<BulkSendToKSeFResult> {
    logger.info('Bulk sending invoices to KSeF via wFirma', {
      userId,
      count: options.invoiceIds.length,
      continueOnError: options.continueOnError,
    });

    const results: SendToKSeFResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const invoiceId of options.invoiceIds) {
      try {
        const result = await this.sendInvoice(userId, {
          invoiceId,
          adapter: 'wfirma',
        });
        results.push(result);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({
          success: false,
          status: 'failed',
          adapter: 'wfirma',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });

        if (!options.continueOnError) {
          logger.warn('Bulk send aborted due to error (continueOnError=false)', {
            userId,
            invoiceId,
            processedSoFar: results.length,
          });
          break;
        }
      }
    }

    logger.info('Bulk send completed', {
      userId,
      total: options.invoiceIds.length,
      successful,
      failed,
    });

    return {
      total: options.invoiceIds.length,
      successful,
      failed,
      results,
    };
  }
}
