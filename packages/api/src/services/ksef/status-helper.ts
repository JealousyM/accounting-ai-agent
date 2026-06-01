/**
 * KSeF Status Helper
 * Live status checking and DB status application for direct-adapter invoices.
 *
 * Extracted from DirectKSeFAdapter (checkLiveStatus / applyStatusResult).
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { DirectKSeFClient } from './adapters/direct-ksef-client';

export class KSeFStatusHelper {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Check live KSeF status for an invoice record and update DB if changed.
   * Uses stored ksefSessionRef to query the original session.
   * Falls back to session-level status check if invoice-level fails.
   */
  async checkLiveStatus(
    ksefClient: DirectKSeFClient,
    record: any,
  ): Promise<void> {
    const invoiceRef = record.ksefReferenceNumber;
    const sessionRef = record.ksefSessionRef;

    // Strategy 1: Query invoice status within the original session
    if (sessionRef) {
      try {
        const statusResult = await ksefClient.getInvoiceStatus(invoiceRef, sessionRef);
        await this.applyStatusResult(record, statusResult);
        return;
      } catch (invoiceErr) {
        logger.debug('Invoice-level status check failed, trying session status', {
          error: invoiceErr instanceof Error ? invoiceErr.message : 'Unknown',
          invoiceRef,
          sessionRef,
        });
      }

      // Strategy 2: Check the session-level status
      try {
        const sessionStatus = await ksefClient.getSessionStatus(sessionRef);
        // Session processingCode >= 400 means the session had errors
        if (sessionStatus.processingCode >= 400) {
          await this.prisma.kSeFInvoiceStatus.update({
            where: { id: record.id },
            data: {
              status: 'rejected',
              rejectedAt: new Date(),
              errorCode: String(sessionStatus.processingCode),
              errorMessage: sessionStatus.processingDescription,
            },
          });
          record.status = 'rejected';
          record.rejectedAt = new Date();
          record.errorCode = String(sessionStatus.processingCode);
          record.errorMessage = sessionStatus.processingDescription;
          return;
        }

      } catch (sessionErr) {
        logger.debug('Session-level status check failed', {
          error: sessionErr instanceof Error ? sessionErr.message : 'Unknown',
          sessionRef,
        });
      }
    }

    // Strategy 3: No stored sessionRef — try invoice status in current session (unlikely to work)
    try {
      const statusResult = await ksefClient.getInvoiceStatus(invoiceRef);
      await this.applyStatusResult(record, statusResult);
    } catch {
      // All strategies exhausted
      logger.debug('All status check strategies failed', { invoiceRef });
    }
  }

  /**
   * Apply a KSeF processing result to a DB record.
   */
  async applyStatusResult(
    record: any,
    result: {
      processingCode: number;
      processingDescription: string;
      ksefReferenceNumber?: string;
    },
  ): Promise<void> {
    if (result.processingCode === 200) {
      await this.prisma.kSeFInvoiceStatus.update({
        where: { id: record.id },
        data: {
          status: 'accepted',
          // Store canonical reference in both fields for download compatibility
          ksefReferenceNumber: result.ksefReferenceNumber ?? undefined,
          ksefInvoiceNumber: result.ksefReferenceNumber ?? undefined,
          acceptedAt: new Date(),
        },
      });
      record.status = 'accepted';
      record.acceptedAt = new Date();
      record.ksefReferenceNumber = result.ksefReferenceNumber ?? record.ksefReferenceNumber;
      record.ksefInvoiceNumber = result.ksefReferenceNumber ?? null;
    } else if (result.processingCode >= 400) {
      await this.prisma.kSeFInvoiceStatus.update({
        where: { id: record.id },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          errorCode: String(result.processingCode),
          errorMessage: result.processingDescription,
        },
      });
      record.status = 'rejected';
      record.rejectedAt = new Date();
      record.errorCode = String(result.processingCode);
      record.errorMessage = result.processingDescription;
    }
  }
}
