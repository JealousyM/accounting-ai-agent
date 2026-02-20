/**
 * KSeF Status Poller Service
 * Background service to poll pending KSeF invoices and update statuses
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { KSeFService } from './ksef.service';
import { emailService } from '../email.service';

export class KSeFStatusPoller {
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ksefService: KSeFService,
    private readonly pollIntervalMs: number = 60000, // 1 minute
  ) {}

  start(): void {
    if (this.intervalId) {
      logger.warn('KSeF status poller already running');
      return;
    }

    logger.info('Starting KSeF status poller', { intervalMs: this.pollIntervalMs });

    this.intervalId = setInterval(() => {
      this.pollPendingInvoices().catch((error) => {
        logger.error('KSeF status poller error', { error: error instanceof Error ? error.message : 'Unknown' });
      });
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('KSeF status poller stopped');
    }
  }

  private async pollPendingInvoices(): Promise<void> {
    // Find invoices that need status check (sent/sending) or UPO download (accepted)
    const pending = await this.prisma.kSeFInvoiceStatus.findMany({
      where: {
        status: { in: ['sent', 'sending', 'accepted'] },
        ksefReferenceNumber: { not: null },
        OR: [
          { sentAt: { lt: new Date(Date.now() - 60000) } }, // Sent > 1 min ago
          { sentAt: null }, // Received invoices or records without sentAt
        ],
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) return;

    logger.info('Polling KSeF invoice statuses', { count: pending.length });

    for (const invoice of pending) {
      try {
        // For sent/sending invoices, check status first
        if (invoice.status === 'sent' || invoice.status === 'sending') {
          const status = await this.ksefService.getInvoiceStatus(
            invoice.userId,
            invoice.ksefReferenceNumber!,
          );

          if (status.status !== invoice.status) {
            await this.prisma.kSeFInvoiceStatus.update({
              where: { id: invoice.id },
              data: {
                status: status.status,
                acceptedAt: status.acceptedAt,
                rejectedAt: status.rejectedAt,
                errorCode: status.errorCode,
                errorMessage: status.errorMessage,
              },
            });

            logger.info('KSeF invoice status updated', {
              invoiceId: invoice.id,
              oldStatus: invoice.status,
              newStatus: status.status,
            });

            // Send email notification for terminal status changes
            if (status.status === 'accepted' || status.status === 'rejected') {
              this.sendStatusNotification(
                invoice.userId,
                invoice.id,
                status.status as 'accepted' | 'rejected',
                {
                  ksefInvoiceNumber: invoice.ksefInvoiceNumber,
                  ksefReferenceNumber: invoice.ksefReferenceNumber,
                  errorCode: status.errorCode,
                  errorMessage: status.errorMessage,
                },
              ).catch(() => {}); // Non-blocking: method handles errors internally
            }

            // Update in-memory status for UPO check below
            (invoice as any).status = status.status;
          }
        }

        // Mark as completed if UPO already downloaded (e.g. manually)
        if (invoice.status === 'accepted' && invoice.upoDownloaded) {
          await this.prisma.kSeFInvoiceStatus.update({
            where: { id: invoice.id },
            data: { status: 'completed' },
          });
          logger.info('KSeF invoice marked completed (UPO already downloaded)', {
            invoiceId: invoice.id,
            referenceNumber: invoice.ksefReferenceNumber,
          });
          continue;
        }

        // Auto-download UPO for accepted invoices
        if (invoice.status === 'accepted' && !invoice.upoDownloaded) {
          try {
            const upo = await this.ksefService.downloadUPO(
              invoice.userId,
              invoice.ksefReferenceNumber!,
            );

            await this.prisma.kSeFInvoiceStatus.update({
              where: { id: invoice.id },
              data: {
                upoDownloaded: true,
                upoContent: upo.upoContent,
                upoDownloadedAt: new Date(),
                status: 'completed',
              },
            });

            logger.info('KSeF UPO auto-downloaded', {
              invoiceId: invoice.id,
              referenceNumber: invoice.ksefReferenceNumber,
            });
          } catch (upoError) {
            logger.error('Failed to auto-download UPO', {
              error: upoError instanceof Error ? upoError.message : 'Unknown',
              invoiceId: invoice.id,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to poll invoice status', {
          error: error instanceof Error ? error.message : 'Unknown',
          invoiceId: invoice.id,
          referenceNumber: invoice.ksefReferenceNumber,
        });
      }
    }

    // Poll wFirma pending records: re-fetch from wFirma to check if KSeF reference is now available
    const wfirmaPending = await this.prisma.kSeFInvoiceStatus.findMany({
      where: {
        status: 'pending',
        adapter: 'wfirma',
        wfirmaInvoiceId: { not: null },
        ksefReferenceNumber: null,
        createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // older than 5 minutes
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    if (wfirmaPending.length > 0) {
      logger.info('Polling wFirma pending KSeF records', { count: wfirmaPending.length });

      for (const record of wfirmaPending) {
        try {
          // getInvoiceStatus() will re-fetch from wFirma and update DB if KSeF ref is now available
          await this.ksefService.getInvoiceStatus(record.userId, record.id);
        } catch (err) {
          logger.warn('wFirma pending KSeF poll failed', {
            invoiceId: record.id,
            error: err instanceof Error ? err.message : 'Unknown',
          });
        }
      }
    }
  }

  /**
   * Send email notification for KSeF status change.
   * Non-blocking -- errors are logged but never propagated.
   */
  private async sendStatusNotification(
    userId: string,
    invoiceId: string,
    newStatus: 'accepted' | 'rejected',
    invoiceData: {
      ksefInvoiceNumber?: string | null;
      ksefReferenceNumber?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
    }
  ): Promise<void> {
    try {
      const config = await this.prisma.kSeFConfig.findUnique({
        where: { userId },
      });

      if (!config) return;
      if (newStatus === 'accepted' && !config.notifyOnAccepted) return;
      if (newStatus === 'rejected' && !config.notifyOnRejected) return;

      // Determine recipient email and locale
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, locale: true },
      });

      const recipientEmail = config.notificationEmail || user?.email;
      if (!recipientEmail) return;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      await emailService.sendKSeFNotification(
        recipientEmail,
        {
          invoiceNumber: invoiceData.ksefInvoiceNumber || invoiceId,
          status: newStatus,
          referenceNumber: invoiceData.ksefReferenceNumber ?? undefined,
          errorCode: invoiceData.errorCode ?? undefined,
          errorMessage: invoiceData.errorMessage ?? undefined,
          dashboardLink: `${frontendUrl}/ksef`,
        },
        user?.locale || 'en',
      );
    } catch (error) {
      logger.error('Failed to send KSeF status notification', {
        error: error instanceof Error ? error.message : 'Unknown',
        userId,
        invoiceId,
      });
    }
  }
}
