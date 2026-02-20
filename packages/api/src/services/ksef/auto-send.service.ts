/**
 * KSeF Auto-Send Service
 * Automatically sends invoices to KSeF when they are created
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { KSeFService } from './ksef.service';

export class KSeFAutoSendService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ksefService: KSeFService,
  ) {}

  /**
   * Hook called after invoice creation.
   * Sends to KSeF if user has auto-send enabled.
   * Never throws -- invoice creation should succeed regardless.
   */
  async onInvoiceCreated(userId: string, invoiceId: string): Promise<void> {
    try {
      // Check if auto-send is enabled for this user
      const config = await this.prisma.kSeFConfig.findUnique({
        where: { userId },
      });

      if (!config?.autoSendEnabled || !config?.autoSendOnCreate) {
        return;
      }

      logger.info('Auto-sending invoice to KSeF', { userId, invoiceId });

      const result = await this.ksefService.sendInvoiceToKSeF(userId, { invoiceId });

      if (result.success) {
        logger.info('Invoice auto-sent to KSeF', {
          userId,
          invoiceId,
          referenceNumber: result.referenceNumber,
        });
      } else {
        logger.warn('Invoice auto-send to KSeF returned unsuccessful', {
          userId,
          invoiceId,
          message: result.message,
        });
      }
    } catch (error) {
      // Log but never throw -- invoice creation must not be blocked
      logger.error('Failed to auto-send invoice to KSeF', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        invoiceId,
      });
    }
  }
}
