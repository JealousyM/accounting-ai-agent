/**
 * Direct KSeF Adapter
 * Implements IKSeFAdapter for direct communication with the KSeF API.
 *
 * This adapter:
 * - Fetches invoice data from wFirma
 * - Generates FA(3) XML via KSeFXMLGenerator
 * - Sends the XML directly to KSeF using token-based authentication
 * - Tracks invoice status in KSeFInvoiceStatus table
 *
 * When ksefToken and ksefNip are configured in KSeFConfig, the adapter
 * opens a token-based session and submits invoices immediately.
 * Without credentials, invoices are queued with status 'pending'.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { KSeFXMLGenerator } from '../xml-generator';
import { KSeFCertificateService } from '../certificate.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { DirectKSeFClient } from './direct-ksef-client';
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
  KSeFEnvironment,
} from '../../../types/ksef.types';
import { KSeFError } from '../errors';
import { parseFA3XML, generateInvoicePDF, createPDFDataFromMetadata, extractSkrotFromUPO, buildKSeFVerificationUrl, computeXmlSkrot } from '../invoice-pdf-generator';
import { WFirmaIntegrationService } from '../../wfirma';
import { KSeFInvoiceBuilder } from '../invoice-builder';
import { KSeFStatusHelper } from '../status-helper';

export class DirectKSeFAdapter implements IKSeFAdapter {
  private readonly xmlGenerator = new KSeFXMLGenerator();
  private readonly invoiceBuilder: KSeFInvoiceBuilder;
  private readonly statusHelper: KSeFStatusHelper;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly wfirmaService: WFirmaIntegrationService,
    // Certificate service will be used for session auth when implemented
    readonly certificateService: KSeFCertificateService
  ) {
    this.invoiceBuilder = new KSeFInvoiceBuilder(wfirmaService);
    this.statusHelper = new KSeFStatusHelper(prisma);
    logger.info('DirectKSeFAdapter initialized');
  }

  // ------------------------------------------
  // sendInvoice
  // ------------------------------------------

  async sendInvoice(
    userId: string,
    options: SendToKSeFOptions
  ): Promise<SendToKSeFResult> {
    logger.info('Sending invoice to KSeF via direct API', {
      userId,
      invoiceId: options.invoiceId,
    });

    try {
      let fa3Data: import('../../../types/ksef.types').FA3InvoiceData;
      let invoiceNumber: string;

      if (options.invoiceData) {
        // Path A: invoice data provided directly — no wFirma needed
        fa3Data = options.invoiceData;
        invoiceNumber = fa3Data.invoiceNumber;
      } else if (options.invoiceId) {
        // Path B: fetch from wFirma using the invoice ID
        const invoice = await this.wfirmaService.getInvoiceById(options.invoiceId);
        if (!invoice) {
          throw new KSeFError(
            'INVOICE_NOT_FOUND',
            `Invoice ${options.invoiceId} not found`
          );
        }
        const company = await this.wfirmaService.getCompanyData();
        fa3Data = await this.invoiceBuilder.buildFromWFirma(invoice, company);
        invoiceNumber = invoice.invoiceNumber;
      } else {
        throw new KSeFError(
          'MISSING_INVOICE_DATA',
          'Either invoiceId or invoiceData must be provided'
        );
      }

      // Generate FA(3) XML
      const invoiceXml = this.xmlGenerator.generateFA3XML(fa3Data);
      invoiceNumber = fa3Data.invoiceNumber;

      // 4. Get user's KSeF token credentials
      const ksefConfig = await this.prisma.kSeFConfig.findUnique({
        where: { userId },
        select: { ksefToken: true, ksefNip: true, environment: true },
      });

      const ksefToken = ksefConfig?.ksefToken;
      const ksefNip = ksefConfig?.ksefNip;
      const environment = (ksefConfig?.environment ?? 'test') as KSeFEnvironment;

      // Create initial tracking record with metadata + full payload for copy functionality
      const record = await this.prisma.kSeFInvoiceStatus.create({
        data: {
          userId,
          wfirmaInvoiceId: options.invoiceId,
          ksefInvoiceNumber: invoiceNumber,
          contractorName: fa3Data.buyerName,
          contractorNip: fa3Data.buyerNip,
          totalGross: fa3Data.totalGross,
          currency: fa3Data.currency,
          invoiceDate: fa3Data.issueDate,
          status: 'pending',
          adapter: 'direct',
          direction: 'sent',
          invoicePayload: JSON.parse(JSON.stringify({
            invoiceNumber: fa3Data.invoiceNumber,
            issueDate: fa3Data.issueDate.toISOString(),
            sellDate: fa3Data.sellDate.toISOString(),
            dueDate: fa3Data.dueDate.toISOString(),
            sellerName: fa3Data.sellerName,
            sellerNip: fa3Data.sellerNip,
            sellerAddress: fa3Data.sellerAddress,
            buyerName: fa3Data.buyerName,
            buyerNip: fa3Data.buyerNip,
            buyerAddress: fa3Data.buyerAddress,
            items: fa3Data.items,
            totalNet: fa3Data.totalNet,
            totalVat: fa3Data.totalVat,
            totalGross: fa3Data.totalGross,
            currency: fa3Data.currency,
            paymentMethod: fa3Data.paymentMethod,
            paymentAccount: fa3Data.paymentAccount,
          })),
        },
      });

      // 6. If token configured, open session and actually send to KSeF
      if (ksefToken && ksefNip) {
        const ksefClient = new DirectKSeFClient({ environment });
        try {
          await ksefClient.openSessionWithToken(ksefNip, ksefToken);

          // Update status to sending
          await this.prisma.kSeFInvoiceStatus.update({
            where: { id: record.id },
            data: { status: 'sending', sentAt: new Date() },
          });

          // Actually send the FA(3) XML to KSeF
          const sendResult = await ksefClient.sendInvoice(invoiceXml);

          // Update record with KSeF reference number and session ref (for poller)
          await this.prisma.kSeFInvoiceStatus.update({
            where: { id: record.id },
            data: {
              status: 'sent',
              ksefReferenceNumber: sendResult.elementReferenceNumber,
              ksefSessionRef: ksefClient.getSessionRef(),
            },
          });

          // Check invoice processing status within the active session
          let finalStatus: KSeFInvoiceStatus = 'sent';
          try {
            const statusResult = await ksefClient.getInvoiceStatus(
              sendResult.elementReferenceNumber,
            );

            await this.statusHelper.applyStatusResult(record, statusResult);

            if (statusResult.processingCode === 200) {
              finalStatus = 'accepted';
            } else if (statusResult.processingCode >= 400) {
              finalStatus = 'rejected';
            }
          } catch (statusError) {
            logger.warn('Could not check invoice status within session, will rely on poller', {
              error: statusError instanceof Error ? statusError.message : 'Unknown',
              elementRef: sendResult.elementReferenceNumber,
            });
          }

          await ksefClient.closeSession();

          logger.info('Invoice sent to KSeF via direct API', {
            invoiceId: options.invoiceId,
            ksefReferenceNumber: sendResult.elementReferenceNumber,
            status: finalStatus,
          });

          return {
            success: true,
            referenceNumber: sendResult.elementReferenceNumber,
            status: finalStatus,
            adapter: 'direct',
            message: finalStatus === 'accepted'
              ? 'Invoice accepted by KSeF.'
              : finalStatus === 'rejected'
                ? 'Invoice rejected by KSeF.'
                : 'Invoice sent to KSeF, awaiting processing.',
            timestamp: new Date(),
          };
        } catch (sendError) {
          // Mark as failed
          await this.prisma.kSeFInvoiceStatus.update({
            where: { id: record.id },
            data: {
              status: 'failed',
              errorMessage: sendError instanceof Error ? sendError.message : 'KSeF submission failed',
            },
          });
          await ksefClient.closeSession().catch(() => {});
          throw sendError;
        }
      }

      // No token configured: record stays pending, inform user
      return {
        success: true,
        referenceNumber: record.id,
        status: 'pending',
        adapter: 'direct',
        message:
          'Invoice queued for KSeF. Configure ksefToken and ksefNip in KSeF settings to enable automatic submission.',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send invoice to KSeF via direct API', {
        error,
        userId,
        invoiceId: options.invoiceId,
      });

      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'DIRECT_KSEF_ERROR',
        `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // getInvoiceStatus
  // ------------------------------------------

  async getInvoiceStatus(
    userId: string,
    referenceNumber: string
  ): Promise<KSeFInvoiceStatusInfo> {
    logger.info('Getting KSeF invoice status via direct API', {
      userId,
      referenceNumber,
    });

    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber, userId }] : []),
          { ksefReferenceNumber: referenceNumber, userId },
        ],
        adapter: 'direct',
      },
    });

    if (!record) {
      throw new KSeFError(
        'NOT_FOUND',
        `Invoice status not found for reference ${referenceNumber}`,
        undefined,
        404
      );
    }

    // If still pending in DB, try to check actual status from KSeF
    if (
      (record.status === 'sent' || record.status === 'sending') &&
      record.ksefReferenceNumber
    ) {
      try {
        const ksefConfig = await this.prisma.kSeFConfig.findUnique({
          where: { userId },
          select: { ksefToken: true, ksefNip: true, environment: true },
        });

        if (ksefConfig?.ksefToken && ksefConfig.ksefNip) {
          const environment = (ksefConfig.environment ?? 'test') as KSeFEnvironment;
          const ksefClient = new DirectKSeFClient({ environment });
          await ksefClient.openSessionWithToken(ksefConfig.ksefNip, ksefConfig.ksefToken);

          try {
            await this.statusHelper.checkLiveStatus(ksefClient, record);
          } finally {
            await ksefClient.closeSession().catch(() => {});
          }
        }
      } catch (err) {
        logger.warn('Failed to check live KSeF status, returning DB status', {
          error: err instanceof Error ? err.message : 'Unknown',
          referenceNumber: record.ksefReferenceNumber,
        });
      }
    }

    return {
      referenceNumber: record.ksefReferenceNumber ?? record.id,
      invoiceNumber: record.ksefInvoiceNumber ?? '',
      status: record.status as KSeFInvoiceStatus,
      adapter: 'direct',
      sentAt: record.sentAt ?? undefined,
      acceptedAt: record.acceptedAt ?? undefined,
      rejectedAt: record.rejectedAt ?? undefined,
      upoAvailable: record.upoDownloaded,
      errorCode: record.errorCode ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
    };
  }

  // ------------------------------------------
  // downloadUPO
  // ------------------------------------------

  async downloadUPO(
    userId: string,
    referenceNumber: string
  ): Promise<KSeFUPO> {
    logger.info('Downloading UPO via direct API', { userId, referenceNumber });

    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber, userId }] : []),
          { ksefReferenceNumber: referenceNumber, userId },
        ],
        adapter: 'direct',
      },
    });

    if (!record) {
      throw new KSeFError(
        'NOT_FOUND',
        `Invoice not found for reference ${referenceNumber}`,
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
        fileName: `UPO_${record.ksefReferenceNumber ?? record.id}.xml`,
      };
    }

    // Try to download UPO from KSeF API
    // UPO v2 endpoint: GET /sessions/{sessionRef}/invoices/{invoiceRef}/upo
    const sessionRef = record.ksefSessionRef;
    const invoiceRef = record.ksefReferenceNumber;

    if (!sessionRef || !invoiceRef) {
      throw new KSeFError(
        'UPO_NOT_AVAILABLE',
        `UPO is not yet available — missing ${!sessionRef ? 'session reference' : 'invoice reference'} for this invoice`,
        undefined,
        409
      );
    }

    const ksefConfig = await this.prisma.kSeFConfig.findUnique({
      where: { userId },
      select: { ksefToken: true, ksefNip: true, environment: true },
    });

    if (!ksefConfig?.ksefToken || !ksefConfig.ksefNip) {
      throw new KSeFError(
        'UPO_NOT_AVAILABLE',
        'KSeF credentials not configured — cannot download UPO',
        undefined,
        409
      );
    }

    const environment = (ksefConfig.environment ?? 'test') as KSeFEnvironment;
    const ksefClient = new DirectKSeFClient({ environment });

    try {
      // In KSeF 2.0 auth is decoupled from sessions — authenticate to get JWT
      // without opening a new interactive session (which would not have access
      // to UPO from the original closed session)
      const jwt = await ksefClient.authenticate(ksefConfig.ksefNip, ksefConfig.ksefToken);
      const upoBuffer = await ksefClient.downloadUPOWithToken(jwt, sessionRef, invoiceRef);

      // Cache UPO in DB
      await this.prisma.kSeFInvoiceStatus.update({
        where: { id: record.id },
        data: {
          upoDownloaded: true,
          upoContent: upoBuffer,
          upoDownloadedAt: new Date(),
        },
      });

      return {
        referenceNumber: record.ksefReferenceNumber ?? record.id,
        upoContent: upoBuffer,
        timestamp: new Date(),
        fileName: `UPO_${record.ksefReferenceNumber ?? record.id}.xml`,
      };
    } catch (upoError) {
      logger.warn('Failed to download UPO from KSeF API', {
        error: upoError instanceof Error ? upoError.message : 'Unknown',
        sessionRef,
        invoiceRef,
      });
      throw new KSeFError(
        'UPO_NOT_AVAILABLE',
        `UPO download failed: ${upoError instanceof Error ? upoError.message : 'Unknown error'}`,
        undefined,
        409
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
    logger.info('Querying KSeF invoices via direct API', { userId, options });

    const where: any = { userId, adapter: 'direct' };

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
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      referenceNumber: r.ksefReferenceNumber ?? r.id,
      invoiceNumber: r.ksefInvoiceNumber ?? '',
      issueDate: r.invoiceDate ?? r.createdAt,
      contractorName: r.contractorName ?? '',
      contractorNip: r.contractorNip ?? undefined,
      totalGross: r.totalGross ? Number(r.totalGross) : 0,
      currency: r.currency ?? 'PLN',
      status: r.status as KSeFInvoiceStatus,
      direction: r.direction as 'sent' | 'received',
      adapter: 'direct' as const,
      errorCode: r.errorCode ?? undefined,
      errorMessage: r.errorMessage ?? undefined,
    }));
  }

  // ------------------------------------------
  // bulkSendInvoices
  // ------------------------------------------

  async bulkSendInvoices(
    userId: string,
    options: BulkSendToKSeFOptions
  ): Promise<BulkSendToKSeFResult> {
    logger.info('Bulk sending invoices to KSeF via direct API', {
      userId,
      count: options.invoiceIds.length,
      continueOnError: options.continueOnError,
    });

    const results: SendToKSeFResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const invoiceId of options.invoiceIds) {
      try {
        const result = await this.sendInvoice(userId, { invoiceId });
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
          adapter: 'direct',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });

        if (!options.continueOnError) {
          logger.warn(
            'Bulk send aborted due to error (continueOnError=false)',
            {
              userId,
              invoiceId,
              processedSoFar: results.length,
            }
          );
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

  // ------------------------------------------
  // fetchIncomingInvoices
  // ------------------------------------------

  /**
   * Fetch incoming (received) invoices from KSeF API and save to local DB.
   * Opens a session, queries subject2 invoices, upserts new records, returns all received.
   */
  async fetchIncomingInvoices(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<KSeFInvoiceListItem[]> {
    logger.info('Fetching incoming invoices from KSeF API', { userId, dateFrom, dateTo });

    const ksefConfig = await this.prisma.kSeFConfig.findUnique({
      where: { userId },
      select: { ksefToken: true, ksefNip: true, environment: true },
    });

    if (!ksefConfig?.ksefToken || !ksefConfig.ksefNip) {
      throw new KSeFError(
        'CREDENTIALS_MISSING',
        'KSeF credentials not configured. Set ksefToken and ksefNip in KSeF settings.',
        undefined,
        400
      );
    }

    const environment = (ksefConfig.environment ?? 'test') as KSeFEnvironment;
    const ksefClient = new DirectKSeFClient({ environment });

    try {
      await ksefClient.openSessionWithToken(ksefConfig.ksefNip, ksefConfig.ksefToken);

      const response = await ksefClient.queryInvoices({
        subjectType: 'subject2',
        dateFrom,
        dateTo,
      });

      await ksefClient.closeSession().catch(() => {});

      // Log raw response for debugging (KSeF v2 response structure may vary)
      logger.info('KSeF queryInvoices raw response keys', {
        keys: response ? Object.keys(response) : 'null',
        responsePreview: JSON.stringify(response)?.substring(0, 500),
      });

      // Parse KSeF v2 response — the invoice list is in the `invoices` field
      const invoiceHeaders: any[] =
        response?.invoices ??
        response?.invoiceHeaderList ??
        response?.invoiceHeaders ??
        response?.items ??
        response?.invoiceMetadataList ??
        (Array.isArray(response) ? response : []);

      logger.info('KSeF returned incoming invoices', { count: invoiceHeaders.length });

      const saved: KSeFInvoiceListItem[] = [];

      for (const header of invoiceHeaders) {
        // KSeF canonical reference format: {NIP}-{YYYYMMDD}-{hash}  (starts with sender's NIP)
        // Some KSeF API fields contain a session-internal reference (e.g. "20260218-EE-...")
        // which cannot be used with GET /invoices/ksef/{ref}. We must prefer the canonical one.
        const CANONICAL_RE = /^\d{10}-\d{8}-/;
        const refCandidates = [
          header.ksefReferenceNumber,     // canonical in most KSeF v2 responses
          header.ksefNumber,              // may be session-internal in subject2 queries
          header.invoiceReferenceNumber,
          header.referenceNumber,
        ].filter(Boolean).map(String);

        // Prefer the canonical NIP-date format; fall back to first available
        const ksefRef = refCandidates.find(r => CANONICAL_RE.test(r)) ?? refCandidates[0] ?? '';

        if (!ksefRef) continue;

        logger.info('Incoming invoice reference candidates', {
          ksefRef,
          ksefNumber: header.ksefNumber,
          ksefReferenceNumber: header.ksefReferenceNumber,
          isCanonical: CANONICAL_RE.test(ksefRef),
        });

        // KSeF v2: seller/buyer are top-level objects with { nip, name }
        const senderName =
          header.seller?.name ??
          header.subjectBy?.issuedByName ??
          header.senderName ??
          '';
        const senderNip =
          header.seller?.nip ??
          header.subjectBy?.issuedByIdentifier?.identifier ??
          header.senderNip ??
          '';
        // KSeF v2 uses `grossAmount`, fallback to older field names
        const gross =
          header.grossAmount ?? header.gross ?? header.totalGross ?? header.invoiceGrossValue ?? 0;
        const invoiceNumber =
          header.invoiceNumber ?? header.ksefInvoiceNumber ?? ksefRef;
        const invoiceDate = header.issueDate ?? header.invoicingDate ?? header.invoiceDate;
        const currency = header.currency ?? 'PLN';

        // Upsert: avoid duplicates by ksefReferenceNumber
        const existing = await this.prisma.kSeFInvoiceStatus.findFirst({
          where: { ksefReferenceNumber: ksefRef },
        });

        if (!existing) {
          await this.prisma.kSeFInvoiceStatus.create({
            data: {
              userId,
              ksefReferenceNumber: ksefRef,
              ksefInvoiceNumber: invoiceNumber,
              contractorName: senderName,
              contractorNip: senderNip,
              totalGross: gross ? Number(gross) : null,
              currency,
              invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
              status: 'accepted',
              adapter: 'direct',
              direction: 'received',
              acceptedAt: new Date(),
            },
          });
        }

        saved.push({
          referenceNumber: ksefRef,
          invoiceNumber,
          issueDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          contractorName: senderName,
          totalGross: Number(gross) || 0,
          currency,
          status: 'accepted',
          direction: 'received',
          adapter: 'direct',
        });
      }

      logger.info('Saved incoming invoices to DB', { count: saved.length });
      return saved;
    } catch (error) {
      await ksefClient.closeSession().catch(() => {});
      logger.error('Failed to fetch incoming invoices from KSeF', {
        error: error instanceof Error ? error.message : 'Unknown',
        userId,
      });
      if (error instanceof KSeFError) throw error;
      throw new KSeFError(
        'FETCH_INCOMING_ERROR',
        `Failed to fetch incoming invoices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ------------------------------------------
  // downloadInvoice
  // ------------------------------------------

  /**
   * Download invoice from KSeF.
   * Supports PDF (default) and XML formats.
   *
   * For PDF: downloads XML from KSeF, parses FA(3), generates professional PDF.
   * Falls back to a simplified PDF from DB metadata if XML download fails.
   *
   * For XML: downloads raw XML from KSeF.
   */
  async downloadInvoice(
    userId: string,
    referenceNumber: string,
    format: 'pdf' | 'xml' = 'pdf'
  ): Promise<{ content: Buffer; fileName: string; contentType: string }> {
    logger.info('Downloading invoice via direct API', { userId, referenceNumber, format });

    const record = await this.prisma.kSeFInvoiceStatus.findFirst({
      where: {
        OR: [
          ...(UUID_RE.test(referenceNumber) ? [{ id: referenceNumber, userId }] : []),
          { ksefReferenceNumber: referenceNumber, userId },
        ],
      },
    });

    if (!record) {
      throw new KSeFError(
        'NOT_FOUND',
        `Invoice not found for reference ${referenceNumber}`,
        undefined,
        404
      );
    }

    const ksefRef = record.ksefReferenceNumber;
    const invoiceNumber = record.ksefInvoiceNumber || ksefRef || referenceNumber;

    // Fetch ksefConfig once — needed for XML download, QR URL, and PDF fallback (userNip)
    const ksefConfig = await this.prisma.kSeFConfig.findUnique({
      where: { userId },
      select: { ksefToken: true, ksefNip: true, environment: true },
    });
    const userNip = ksefConfig?.ksefNip || undefined;

    // KSeF canonical reference format: {10-digit-NIP}-{YYYYMMDD}-{hash}
    // Element references (e.g. "20260218-EE-...") are assigned at submission time;
    // canonical references are only available after the invoice is processed/accepted.
    // GET /invoices/ksef/{ref} only accepts the canonical format (error 21405 otherwise).
    const CANONICAL_RE = /^\d{10}-\d{8}-/;
    let canonicalRef = ksefRef;

    if (ksefRef && !CANONICAL_RE.test(ksefRef) && ksefConfig?.ksefToken && ksefConfig.ksefNip) {
      logger.info('Stored reference is non-canonical, attempting to resolve', {
        ksefRef,
        ksefInvoiceNumber: record.ksefInvoiceNumber,
        ksefSessionRef: record.ksefSessionRef,
      });

      const environment = (ksefConfig.environment ?? 'test') as KSeFEnvironment;

      // Strategy 1: ksefInvoiceNumber already holds the canonical reference
      if (record.ksefInvoiceNumber && CANONICAL_RE.test(record.ksefInvoiceNumber)) {
        canonicalRef = record.ksefInvoiceNumber;
        logger.info('[Strategy 1] Using stored ksefInvoiceNumber as canonical reference', { canonicalRef });
      }

      // Strategy 2: Query the original send session for the invoice status → ksefReferenceNumber
      if (canonicalRef === ksefRef && record.ksefSessionRef) {
        const resolveClient = new DirectKSeFClient({ environment });
        try {
          await resolveClient.openSessionWithToken(ksefConfig.ksefNip, ksefConfig.ksefToken);
          logger.info('[Strategy 2] Querying invoice status via original session', {
            elementRef: ksefRef,
            sessionRef: record.ksefSessionRef,
          });
          const statusResult = await resolveClient.getInvoiceStatus(ksefRef, record.ksefSessionRef);
          await resolveClient.closeSession().catch(() => {});

          const resolved = statusResult.ksefReferenceNumber;
          if (resolved && CANONICAL_RE.test(resolved)) {
            canonicalRef = resolved;
            await this.prisma.kSeFInvoiceStatus.update({
              where: { id: record.id },
              data: { ksefReferenceNumber: canonicalRef },
            });
            logger.info('[Strategy 2] Resolved canonical KSeF reference via session', { canonicalRef });
          } else {
            logger.warn('[Strategy 2] Session query did not return canonical ref', {
              returned: resolved,
              processingCode: statusResult.processingCode,
            });
          }
        } catch (resolveErr) {
          await resolveClient.closeSession().catch(() => {});
          logger.warn('[Strategy 2] Failed to query invoice status via session', {
            error: resolveErr instanceof Error ? resolveErr.message : 'Unknown',
            elementRef: ksefRef,
            sessionRef: record.ksefSessionRef,
          });
        }
      }

      // Strategy 3: Query KSeF sent invoices for the invoice date and match by invoice number.
      // Used when ksefSessionRef is null (e.g. record created before ksefSessionRef field was added).
      if (canonicalRef === ksefRef) {
        const userInvoiceNumber = record.ksefInvoiceNumber; // user-defined, e.g. "MC/2026/1"
        const invoiceDateStr = record.invoiceDate
          ? record.invoiceDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const resolveClient = new DirectKSeFClient({ environment });
        try {
          await resolveClient.openSessionWithToken(ksefConfig.ksefNip, ksefConfig.ksefToken);
          logger.info('[Strategy 3] Querying sent invoices to find canonical ref', {
            invoiceDateStr,
            userInvoiceNumber,
            elementRef: ksefRef,
          });

          const queryResponse = await resolveClient.queryInvoices({
            subjectType: 'subject1',
            dateFrom: invoiceDateStr,
            dateTo: invoiceDateStr,
          });
          await resolveClient.closeSession().catch(() => {});

          const headers: any[] =
            queryResponse?.invoices ??
            queryResponse?.invoiceHeaderList ??
            queryResponse?.invoiceHeaders ??
            queryResponse?.items ??
            (Array.isArray(queryResponse) ? queryResponse : []);

          logger.info('[Strategy 3] Query returned invoice headers', { count: headers.length });

          for (const header of headers) {
            // Collect all reference candidates from the header
            const refCandidates = [
              header.ksefReferenceNumber,
              header.ksefNumber,
              header.invoiceReferenceNumber,
              header.referenceNumber,
            ].filter(Boolean).map(String);

            const canonicalCandidate = refCandidates.find(r => CANONICAL_RE.test(r));
            if (!canonicalCandidate) continue;

            // Match by user-defined invoice number OR by element reference
            const headerInvoiceNum = String(header.invoiceNumber ?? header.ksefInvoiceNumber ?? '');
            const elementCandidates = refCandidates.filter(r => !CANONICAL_RE.test(r));

            const matchedByNumber = userInvoiceNumber && headerInvoiceNum === userInvoiceNumber;
            const matchedByElement = elementCandidates.some(r => r === ksefRef);

            if (matchedByNumber || matchedByElement) {
              canonicalRef = canonicalCandidate;
              await this.prisma.kSeFInvoiceStatus.update({
                where: { id: record.id },
                data: { ksefReferenceNumber: canonicalRef },
              });
              logger.info('[Strategy 3] Resolved canonical KSeF reference via invoice query', {
                canonicalRef,
                matchedByNumber,
                matchedByElement,
              });
              break;
            }
          }

          if (canonicalRef === ksefRef) {
            logger.warn('[Strategy 3] Could not match canonical ref in query results', {
              ksefRef,
              userInvoiceNumber,
              headersCount: headers.length,
            });
          }
        } catch (queryErr) {
          await resolveClient.closeSession().catch(() => {});
          logger.warn('[Strategy 3] Failed to query invoices for canonical ref resolution', {
            error: queryErr instanceof Error ? queryErr.message : 'Unknown',
            ksefRef,
          });
        }
      }
    }

    // Try to download XML from KSeF
    let xmlBuffer: Buffer | null = null;

    if (canonicalRef && ksefConfig?.ksefToken && ksefConfig.ksefNip) {
      const environment = (ksefConfig.environment ?? 'test') as KSeFEnvironment;
      const ksefClient = new DirectKSeFClient({ environment });

      try {
        await ksefClient.openSessionWithToken(ksefConfig.ksefNip, ksefConfig.ksefToken);
        xmlBuffer = await ksefClient.downloadInvoice(canonicalRef);
        await ksefClient.closeSession().catch(() => {});
      } catch (error) {
        await ksefClient.closeSession().catch(() => {});
        logger.warn('Failed to download invoice XML from KSeF, will use DB metadata for PDF', {
          error: error instanceof Error ? error.message : 'Unknown',
          ksefRef: canonicalRef,
        });
      }
    }

    // If XML format requested, return it (or error if no XML available)
    if (format === 'xml') {
      if (!xmlBuffer) {
        throw new KSeFError(
          'INVOICE_DOWNLOAD_FAILED',
          'Could not download invoice XML from KSeF. Check credentials and KSeF reference.',
          undefined,
          409
        );
      }
      return {
        content: xmlBuffer,
        fileName: `${invoiceNumber}.xml`,
        contentType: 'application/xml',
      };
    }

    // Build KSeF verification URL for the QR code.
    // Skrot = SHA-256 of the FA(3) XML bytes (same bytes KSeF received and hashed).
    // Primary: compute from downloaded XML. Secondary: extract from stored UPO XML.
    let ksefQrUrl: string | undefined;
    if (canonicalRef && CANONICAL_RE.test(canonicalRef)) {
      // Reuse already-fetched ksefConfig (no second DB query needed)
      const env = ksefConfig?.environment === 'production' ? 'production' : 'test';

      let skrot: string | undefined;

      if (xmlBuffer) {
        // Primary: SHA-256 of the downloaded FA(3) XML bytes
        skrot = computeXmlSkrot(xmlBuffer);
        logger.info('Computed KSeF skrot from invoice XML', { skrot: skrot.substring(0, 8) + '...' });
      }

      if (!skrot && record.upoContent) {
        // Secondary: extract from stored UPO XML
        skrot = await extractSkrotFromUPO(record.upoContent as Buffer);
        if (skrot) logger.info('Extracted KSeF skrot from UPO XML', { skrot: skrot.substring(0, 8) + '...' });
      }

      if (skrot) {
        ksefQrUrl = buildKSeFVerificationUrl(canonicalRef, skrot, env);
        logger.info('Built KSeF QR verification URL', { ksefQrUrl });
      }
    }

    // Generate PDF
    try {
      let pdfData;
      if (xmlBuffer) {
        // Parse FA(3) XML and generate full PDF
        const xmlString = xmlBuffer.toString('utf-8');
        pdfData = await parseFA3XML(xmlString);
        pdfData.ksefReference = canonicalRef || ksefRef || undefined;
        pdfData.ksefQrUrl = ksefQrUrl;
      } else {
        // Fallback: generate simplified PDF from DB metadata
        // Pass userNip so the PDF shows the user's own NIP as seller (sent) or buyer (received)
        pdfData = createPDFDataFromMetadata(record, userNip);
        pdfData.ksefQrUrl = ksefQrUrl;
      }

      const pdfBuffer = await generateInvoicePDF(pdfData);
      return {
        content: pdfBuffer,
        fileName: `${invoiceNumber}.pdf`,
        contentType: 'application/pdf',
      };
    } catch (pdfError) {
      logger.error('Failed to generate invoice PDF', {
        error: pdfError instanceof Error ? pdfError.message : 'Unknown',
        referenceNumber,
      });
      throw new KSeFError(
        'PDF_GENERATION_FAILED',
        `Failed to generate invoice PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
        undefined,
        500
      );
    }
  }
}
