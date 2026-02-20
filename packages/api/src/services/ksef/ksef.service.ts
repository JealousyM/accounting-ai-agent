/**
 * KSeF Service - Main Facade
 *
 * Provides a unified API for all KSeF (Krajowy System e-Faktur) operations.
 * Uses a strategy pattern to route requests through the preferred adapter
 * (wFirma proxy or direct KSeF API) based on the user's KSeFConfig.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { KSeFError } from './errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import type { IKSeFAdapter } from './adapters/adapter.interface';
import type { WFirmaKSeFAdapter } from './adapters/wfirma-adapter';
import type {
  KSeFAdapterType,
  KSeFInvoiceStatus,
  SendToKSeFOptions,
  SendToKSeFResult,
  KSeFInvoiceStatusInfo,
  KSeFUPO,
  QueryKSeFInvoicesOptions,
  KSeFInvoiceListItem,
  BulkSendToKSeFOptions,
  BulkSendToKSeFResult,
  KSeFStatistics,
  KSeFUserConfig,
  KSeFMonthlyStats,
  KSeFIncomingMatch,
  KSeFIncomingMatchedInvoice,
} from '../../types/ksef.types';

export class KSeFService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly wfirmaAdapter: WFirmaKSeFAdapter,
    private readonly directAdapter: IKSeFAdapter | null = null
  ) {
    logger.info('KSeFService initialized', {
      adapters: {
        wfirma: true,
        direct: directAdapter !== null,
      },
    });
  }

  // ------------------------------------------
  // Adapter resolution
  // ------------------------------------------

  /**
   * Resolve the adapter for a given user. Reads the user's KSeFConfig
   * to determine the preferred adapter, falling back to wFirma.
   */
  private async resolveAdapter(
    userId: string,
    overrideAdapter?: KSeFAdapterType
  ): Promise<IKSeFAdapter> {
    const adapterType = overrideAdapter ?? (await this.getPreferredAdapter(userId));

    if (adapterType === 'direct') {
      if (!this.directAdapter) {
        throw new KSeFError(
          'ADAPTER_NOT_AVAILABLE',
          'Direct KSeF adapter is not configured. Use the wFirma adapter or configure direct access.',
          undefined,
          400
        );
      }
      return this.directAdapter;
    }

    return this.wfirmaAdapter;
  }

  /**
   * Read the user's preferred adapter from KSeFConfig. Defaults to 'wfirma'.
   */
  private async getPreferredAdapter(userId: string): Promise<KSeFAdapterType> {
    const config = await this.prisma.kSeFConfig.findUnique({
      where: { userId },
      select: { preferredAdapter: true },
    });

    return (config?.preferredAdapter as KSeFAdapterType) ?? 'wfirma';
  }

  // ------------------------------------------
  // Invoice operations
  // ------------------------------------------

  /**
   * Check if an invoice has already been submitted to KSeF with an active status.
   * Returns the existing record if found, null otherwise.
   */
  private async findExistingSubmission(userId: string, options: SendToKSeFOptions) {
    const ACTIVE_STATUSES = ['pending', 'sending', 'sent', 'accepted', 'completed'] as const;
    if (options.invoiceId) {
      return this.prisma.kSeFInvoiceStatus.findFirst({
        where: { userId, wfirmaInvoiceId: options.invoiceId, status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (options.invoiceData?.invoiceNumber) {
      return this.prisma.kSeFInvoiceStatus.findFirst({
        where: { userId, ksefInvoiceNumber: options.invoiceData.invoiceNumber, status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return null;
  }

  /**
   * Send a single invoice to KSeF.
   * When invoiceData is provided directly (no wFirma), forces the direct adapter.
   */
  async sendInvoiceToKSeF(userId: string, options: SendToKSeFOptions): Promise<SendToKSeFResult> {
    logger.info('KSeFService.sendInvoiceToKSeF', { userId, invoiceId: options.invoiceId });

    // Deduplication check: return existing record if already submitted with active status
    const existing = await this.findExistingSubmission(userId, options);
    if (existing) {
      logger.info('KSeFService: duplicate invoice submission detected', {
        userId,
        existingId: existing.id,
        existingStatus: existing.status,
      });
      return {
        success: true,
        referenceNumber: existing.ksefReferenceNumber ?? existing.id,
        status: existing.status as KSeFInvoiceStatus,
        adapter: existing.adapter as KSeFAdapterType,
        message: `Invoice already submitted to KSeF (status: ${existing.status})`,
        timestamp: existing.sentAt ?? existing.createdAt,
        isDuplicate: true,
      };
    }

    // When invoice data is provided directly, always use direct adapter
    const adapterOverride = options.invoiceData ? 'direct' : options.adapter;
    const adapter = await this.resolveAdapter(userId, adapterOverride);
    return adapter.sendInvoice(userId, options);
  }

  /**
   * Check status of an invoice in KSeF
   */
  async getInvoiceStatus(
    userId: string,
    referenceNumber: string
  ): Promise<KSeFInvoiceStatusInfo> {
    logger.info('KSeFService.getInvoiceStatus', { userId, referenceNumber });

    // Look up the record to determine which adapter owns it
    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        userId,
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
          { ksefReferenceNumber: referenceNumber },
        ],
      },
      select: { adapter: true },
    });

    const adapterType = (record?.adapter as KSeFAdapterType) ?? 'wfirma';
    const adapter = await this.resolveAdapter(userId, adapterType);
    return adapter.getInvoiceStatus(userId, referenceNumber);
  }

  /**
   * Download UPO (official confirmation) for an accepted invoice
   */
  async downloadUPO(userId: string, referenceNumber: string): Promise<KSeFUPO> {
    logger.info('KSeFService.downloadUPO', { userId, referenceNumber });

    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        userId,
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
          { ksefReferenceNumber: referenceNumber },
        ],
      },
      select: { adapter: true, ksefReferenceNumber: true, id: true },
    });

    // Cross-adapter: wFirma record that now has a KSeF reference → use direct adapter for UPO
    if (record?.adapter === 'wfirma' && record.ksefReferenceNumber && this.directAdapter) {
      return this.directAdapter.downloadUPO(userId, record.ksefReferenceNumber);
    }

    const adapterType = (record?.adapter as KSeFAdapterType) ?? 'wfirma';
    const adapter = await this.resolveAdapter(userId, adapterType);
    return adapter.downloadUPO(userId, referenceNumber);
  }

  /**
   * Query KSeF invoices with filters.
   * Uses the user's preferred adapter (direct or wFirma).
   */
  async queryInvoices(
    userId: string,
    options: QueryKSeFInvoicesOptions
  ): Promise<KSeFInvoiceListItem[]> {
    logger.info('KSeFService.queryInvoices', { userId, options });

    const adapter = await this.resolveAdapter(userId);
    return adapter.queryInvoices(userId, options);
  }

  /**
   * Get full invoice payload stored for a given KSeF invoice (for copy functionality).
   * Returns the invoicePayload JSON for direct-adapter invoices, or null if not available.
   */
  async getInvoiceDetails(
    userId: string,
    referenceNumber: string
  ): Promise<{ invoicePayload: Record<string, unknown> | null; adapter: string } | null> {
    logger.info('KSeFService.getInvoiceDetails', { userId, referenceNumber });

    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        userId,
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
          { ksefReferenceNumber: referenceNumber },
          { ksefInvoiceNumber: referenceNumber },
        ],
      },
      select: { invoicePayload: true, adapter: true },
    });

    if (!record) return null;

    return {
      invoicePayload: (record.invoicePayload as Record<string, unknown> | null) ?? null,
      adapter: record.adapter,
    };
  }

  /**
   * Bulk send multiple invoices to KSeF
   */
  async bulkSendInvoices(
    userId: string,
    options: BulkSendToKSeFOptions
  ): Promise<BulkSendToKSeFResult> {
    logger.info('KSeFService.bulkSendInvoices', { userId, count: options.invoiceIds.length });

    const adapter = await this.resolveAdapter(userId, options.adapter);
    return adapter.bulkSendInvoices(userId, options);
  }

  // ------------------------------------------
  // Statistics
  // ------------------------------------------

  /**
   * Get KSeF statistics for a user using Prisma aggregations
   */
  async getStatistics(userId: string): Promise<KSeFStatistics> {
    logger.info('KSeFService.getStatistics', { userId });

    try {
      const [statusCounts, directionCounts, lastDates, monthlyRaw] = await Promise.all([
        // Count by status
        this.prisma.kSeFInvoiceStatus.groupBy({
          by: ['status'],
          where: { userId },
          _count: { id: true },
        }),

        // Count by direction
        this.prisma.kSeFInvoiceStatus.groupBy({
          by: ['direction'],
          where: { userId },
          _count: { id: true },
        }),

        // Last sent / received dates
        Promise.all([
          this.prisma.kSeFInvoiceStatus.findFirst({
            where: { userId, direction: 'sent' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
          this.prisma.kSeFInvoiceStatus.findFirst({
            where: { userId, direction: 'received' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]),

        // Monthly breakdown (raw records to aggregate in JS)
        this.prisma.kSeFInvoiceStatus.findMany({
          where: { userId },
          select: { createdAt: true, direction: true, status: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      // Build status counts map
      const statusMap = new Map<string, number>();
      for (const row of statusCounts) {
        statusMap.set(row.status, row._count.id);
      }

      // Build direction counts map
      const directionMap = new Map<string, number>();
      for (const row of directionCounts) {
        directionMap.set(row.direction, row._count.id);
      }

      // Monthly aggregation
      const monthlyMap = new Map<string, KSeFMonthlyStats>();
      for (const record of monthlyRaw) {
        const monthKey = `${record.createdAt.getFullYear()}-${String(record.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthKey, sent: 0, received: 0, accepted: 0, rejected: 0 });
        }
        const entry = monthlyMap.get(monthKey)!;
        if (record.direction === 'sent') entry.sent++;
        if (record.direction === 'received') entry.received++;
        if (record.status === 'accepted') entry.accepted++;
        if (record.status === 'rejected') entry.rejected++;
      }

      return {
        totalSent: directionMap.get('sent') ?? 0,
        totalReceived: directionMap.get('received') ?? 0,
        acceptedCount: statusMap.get('accepted') ?? 0,
        rejectedCount: statusMap.get('rejected') ?? 0,
        pendingCount: statusMap.get('pending') ?? 0,
        completedCount: statusMap.get('completed') ?? 0,
        lastSentAt: lastDates[0]?.createdAt ?? undefined,
        lastReceivedAt: lastDates[1]?.createdAt ?? undefined,
        byMonth: Array.from(monthlyMap.values()),
      };
    } catch (error) {
      logger.error('Failed to compute KSeF statistics', { error, userId });
      throw new KSeFError(
        'STATISTICS_ERROR',
        `Failed to compute statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // Configuration
  // ------------------------------------------

  /**
   * Get user KSeF configuration. Returns defaults when no record exists.
   */
  async getConfig(userId: string): Promise<KSeFUserConfig> {
    logger.info('KSeFService.getConfig', { userId });

    const config = await this.prisma.kSeFConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      return {
        preferredAdapter: 'wfirma',
        autoSendEnabled: false,
        autoSendOnCreate: false,
        environment: 'test',
        notifyOnAccepted: true,
        notifyOnRejected: true,
        ksefToken: undefined,
        ksefNip: undefined,
      };
    }

    return {
      preferredAdapter: config.preferredAdapter as KSeFAdapterType,
      autoSendEnabled: config.autoSendEnabled,
      autoSendOnCreate: config.autoSendOnCreate,
      environment: config.environment as 'test' | 'production',
      defaultCertId: config.defaultCertId ?? undefined,
      notifyOnAccepted: config.notifyOnAccepted,
      notifyOnRejected: config.notifyOnRejected,
      notificationEmail: config.notificationEmail ?? undefined,
      ksefToken: config.ksefToken ?? undefined,
      ksefNip: config.ksefNip ?? undefined,
    };
  }

  /**
   * Update user KSeF configuration. Creates the record if it does not exist.
   */
  async updateConfig(userId: string, updates: Partial<KSeFUserConfig>): Promise<KSeFUserConfig> {
    logger.info('KSeFService.updateConfig', { userId, updates });

    try {
      const data: Record<string, unknown> = {};
      if (updates.preferredAdapter !== undefined) data.preferredAdapter = updates.preferredAdapter;
      if (updates.autoSendEnabled !== undefined) data.autoSendEnabled = updates.autoSendEnabled;
      if (updates.autoSendOnCreate !== undefined) data.autoSendOnCreate = updates.autoSendOnCreate;
      if (updates.environment !== undefined) data.environment = updates.environment;
      if (updates.defaultCertId !== undefined) data.defaultCertId = updates.defaultCertId;
      if (updates.notifyOnAccepted !== undefined) data.notifyOnAccepted = updates.notifyOnAccepted;
      if (updates.notifyOnRejected !== undefined) data.notifyOnRejected = updates.notifyOnRejected;
      if (updates.notificationEmail !== undefined) data.notificationEmail = updates.notificationEmail;
      if (updates.ksefToken !== undefined) data.ksefToken = updates.ksefToken || null;
      if (updates.ksefNip !== undefined) data.ksefNip = updates.ksefNip || null;

      const config = await this.prisma.kSeFConfig.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
        },
        update: data,
      });

      return {
        preferredAdapter: config.preferredAdapter as KSeFAdapterType,
        autoSendEnabled: config.autoSendEnabled,
        autoSendOnCreate: config.autoSendOnCreate,
        environment: config.environment as 'test' | 'production',
        defaultCertId: config.defaultCertId ?? undefined,
        notifyOnAccepted: config.notifyOnAccepted,
        notifyOnRejected: config.notifyOnRejected,
        notificationEmail: config.notificationEmail ?? undefined,
        ksefToken: config.ksefToken ?? undefined,
        ksefNip: config.ksefNip ?? undefined,
      };
    } catch (error) {
      logger.error('Failed to update KSeF config', { error, userId });
      throw new KSeFError(
        'CONFIG_UPDATE_ERROR',
        `Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // Incoming Invoices
  // ------------------------------------------

  /**
   * Get incoming (received) invoices from KSeF.
   * First tries to fetch fresh data from KSeF API (if direct adapter available),
   * then returns all received invoices from local DB.
   */
  async getIncomingInvoices(
    userId: string,
    options: Omit<QueryKSeFInvoicesOptions, 'direction'>
  ): Promise<KSeFInvoiceListItem[]> {
    logger.info('KSeFService.getIncomingInvoices', { userId, options });

    // Try to fetch fresh incoming invoices from KSeF API
    if (this.directAdapter?.fetchIncomingInvoices) {
      try {
        const now = new Date();
        const dateFrom = options.dateFrom
          ? options.dateFrom.toISOString()
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // default: last 30 days
        const dateTo = options.dateTo
          ? options.dateTo.toISOString()
          : now.toISOString();

        logger.info('Calling directAdapter.fetchIncomingInvoices', { dateFrom, dateTo });
        const fetched = await this.directAdapter.fetchIncomingInvoices(userId, dateFrom, dateTo);
        logger.info('Successfully fetched incoming invoices from KSeF API', { count: fetched.length });
      } catch (fetchError) {
        // Non-fatal: fall through to return whatever is in local DB
        logger.error('Could not fetch incoming invoices from KSeF API, returning local data', {
          error: fetchError instanceof Error ? { message: fetchError.message, stack: fetchError.stack } : 'Unknown',
        });
      }
    } else {
      logger.warn('No directAdapter.fetchIncomingInvoices available — skipping KSeF API fetch');
    }

    // Return received invoices from local DB — query ALL invoices regardless of adapter
    // (incoming invoices are stored by the direct adapter, but we want them visible for all users)
    const records = await this.prisma.kSeFInvoiceStatus.findMany({
      where: {
        userId,
        direction: 'received',
        ...(options.status ? { status: options.status } : {}),
        ...(options.dateFrom || options.dateTo ? {
          createdAt: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        } : {}),
      },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      referenceNumber: r.ksefReferenceNumber ?? r.id,
      invoiceNumber: r.ksefInvoiceNumber ?? '',
      issueDate: r.invoiceDate ?? r.createdAt,
      contractorName: r.contractorName ?? '',
      totalGross: r.totalGross ? Number(r.totalGross) : 0,
      currency: r.currency ?? 'PLN',
      status: r.status as any,
      direction: 'received' as const,
      adapter: (r.adapter ?? 'direct') as any,
      errorCode: r.errorCode ?? undefined,
      errorMessage: r.errorMessage ?? undefined,
    }));
  }

  /**
   * Download invoice from KSeF (PDF or XML format)
   */
  async downloadInvoice(
    userId: string,
    referenceNumber: string,
    format: 'pdf' | 'xml' = 'pdf'
  ): Promise<{ content: Buffer; fileName: string; contentType: string }> {
    logger.info('KSeFService.downloadInvoice', { userId, referenceNumber, format });

    if (!this.directAdapter?.downloadInvoice) {
      throw new KSeFError(
        'NOT_SUPPORTED',
        'Invoice download is only supported via the direct KSeF adapter',
        undefined,
        501
      );
    }

    return this.directAdapter.downloadInvoice(userId, referenceNumber, format);
  }

  /**
   * Match an incoming KSeF invoice with existing wFirma records.
   * Searches by invoice number, contractor NIP, and gross amount.
   */
  async matchIncomingInvoice(
    userId: string,
    referenceNumber: string
  ): Promise<KSeFIncomingMatch> {
    logger.info('KSeFService.matchIncomingInvoice', { userId, referenceNumber });

    try {
      // Get KSeF invoice details
      const ksefRecord = await this.prisma.kSeFInvoiceStatus.findFirst({
        where: {
          userId,
          direction: 'received',
          OR: [
            ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber }] : []),
            { ksefReferenceNumber: referenceNumber },
          ],
        },
      });

      if (!ksefRecord) {
        throw new KSeFError(
          'INVOICE_NOT_FOUND',
          `No incoming KSeF invoice found for reference ${referenceNumber}`,
          undefined,
          404
        );
      }

      // Search for matching wFirma invoices in cache by invoice number
      const invoiceNumber = ksefRecord.ksefInvoiceNumber ?? '';
      const cachedInvoices = await this.prisma.wFirmaCache.findMany({
        where: {
          userId,
          dataType: 'invoice',
          isValid: true,
        },
        take: 100,
      });

      // Filter cached invoices by matching invoice number in JSON data
      const wfirmaMatches = cachedInvoices.filter((cache) => {
        const data = cache.data as Record<string, unknown>;
        return data.invoiceNumber === invoiceNumber;
      });

      const matched = wfirmaMatches.length > 0;
      const matchedInvoices: KSeFIncomingMatchedInvoice[] = wfirmaMatches.map((cache) => {
        const data = cache.data as Record<string, unknown>;
        return {
          wfirmaInvoiceId: cache.wfirmaId,
          invoiceNumber: (data.invoiceNumber as string) ?? '',
          contractorName: (data.contractorName as string) ?? '',
          totalGross: Number(data.totalGross) || 0,
          currency: (data.currency as string) ?? 'PLN',
          issueDate: data.issueDate ? new Date(data.issueDate as string) : cache.cachedAt,
        };
      });

      return {
        referenceNumber: ksefRecord.ksefReferenceNumber ?? ksefRecord.id,
        ksefInvoiceNumber: ksefRecord.ksefInvoiceNumber ?? '',
        matched,
        matchCount: matchedInvoices.length,
        matchedInvoices,
      };
    } catch (error) {
      logger.error('Failed to match incoming KSeF invoice', { error, userId, referenceNumber });
      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'MATCH_ERROR',
        `Failed to match invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
