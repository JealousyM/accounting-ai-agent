/**
 * WFirma KSeF Adapter Unit Tests
 *
 * Tests the WFirmaKSeFAdapter: sending invoices, status checks,
 * UPO download, and query filtering.
 */

import { WFirmaKSeFAdapter } from '../ksef/adapters/wfirma-adapter';
import { KSeFError } from '../ksef/errors';

// -----------------------------------------------
// Test data
// -----------------------------------------------

const USER_ID = 'user-123';
const INVOICE_ID = 'wfirma-invoice-456';
const KSEF_REF = '1234567890-20260220-ABCDEF12';
const INVOICE_NUMBER = 'FV/2026/02/001';
const RECORD_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// -----------------------------------------------
// Mock Prisma
// -----------------------------------------------

const mockPrisma: any = {
  kSeFInvoiceStatus: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// -----------------------------------------------
// Mock WFirmaIntegrationService
// -----------------------------------------------

const mockWfirmaService: any = {
  getInvoiceById: jest.fn(),
  getCompanyData: jest.fn(),
  getContractorById: jest.fn(),
};

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function makeWfirmaInvoice(overrides: Record<string, any> = {}) {
  return {
    id: INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    contractorName: 'Test Contractor sp. z o.o.',
    contractorNip: '0987654321',
    contractorId: 'contractor-1',
    total: 1230,
    totalNet: 1000,
    totalVat: 230,
    currency: 'PLN',
    issueDate: '2026-02-20',
    sellDate: '2026-02-20',
    dueDate: '2026-03-06',
    paymentMethod: 'transfer',
    items: [
      {
        name: 'Consulting',
        quantity: 10,
        unit: 'h',
        priceNet: 100,
        vatRate: 23,
        totalNet: 1000,
        totalVat: 230,
        totalGross: 1230,
      },
    ],
    ksefReferenceNumber: null,
    ...overrides,
  };
}

function makeDbRecord(overrides: Record<string, any> = {}) {
  return {
    id: RECORD_UUID,
    userId: USER_ID,
    wfirmaInvoiceId: INVOICE_ID,
    ksefReferenceNumber: null,
    ksefInvoiceNumber: INVOICE_NUMBER,
    contractorName: 'Test Contractor sp. z o.o.',
    contractorNip: '0987654321',
    totalGross: 1230,
    currency: 'PLN',
    invoiceDate: new Date('2026-02-20'),
    status: 'pending',
    adapter: 'wfirma',
    direction: 'sent',
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    upoDownloaded: false,
    upoContent: null,
    upoDownloadedAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date('2026-02-20T09:00:00Z'),
    updatedAt: new Date('2026-02-20T09:00:00Z'),
    ...overrides,
  };
}

describe('WFirmaKSeFAdapter', () => {
  let adapter: WFirmaKSeFAdapter;

  beforeEach(() => {
    adapter = new WFirmaKSeFAdapter(mockPrisma, mockWfirmaService);
  });

  // ==============================================
  // sendInvoice
  // ==============================================

  describe('sendInvoice', () => {
    it('should throw INVOICE_ID_REQUIRED when no invoiceId provided', async () => {
      await expect(
        adapter.sendInvoice(USER_ID, {})
      ).rejects.toThrow(KSeFError);

      try {
        await adapter.sendInvoice(USER_ID, {});
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('INVOICE_ID_REQUIRED');
      }
    });

    it('should throw INVOICE_NOT_FOUND when wFirma returns null for the invoice', async () => {
      mockWfirmaService.getInvoiceById.mockResolvedValue(null);

      await expect(
        adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID })
      ).rejects.toThrow(KSeFError);

      try {
        await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });
      } catch (error) {
        expect((error as KSeFError).code).toBe('INVOICE_NOT_FOUND');
      }
    });

    it('should return accepted status when wFirma invoice already has KSeF reference', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF });
      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ status: 'accepted', ksefReferenceNumber: KSEF_REF }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.success).toBe(true);
      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(result.adapter).toBe('wfirma');
    });

    it('should create new DB record as accepted when no existing record and wFirma has KSeF ref', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF });
      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(mockPrisma.kSeFInvoiceStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          wfirmaInvoiceId: INVOICE_ID,
          ksefReferenceNumber: KSEF_REF,
          status: 'accepted',
          adapter: 'wfirma',
        }),
      });
      expect(mockPrisma.kSeFInvoiceStatus.update).not.toHaveBeenCalled();
    });

    it('should update existing DB record to accepted when it exists and wFirma has KSeF ref', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF });
      const existingRecord = makeDbRecord({ status: 'pending' });

      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(existingRecord);
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(mockPrisma.kSeFInvoiceStatus.update).toHaveBeenCalledWith({
        where: { id: RECORD_UUID },
        data: expect.objectContaining({
          ksefReferenceNumber: KSEF_REF,
          status: 'accepted',
        }),
      });
      expect(mockPrisma.kSeFInvoiceStatus.create).not.toHaveBeenCalled();
    });

    it('should create new pending record when wFirma has no KSeF reference', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: null });
      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ status: 'pending' }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.status).toBe('pending');
      expect(result.adapter).toBe('wfirma');
      expect(mockPrisma.kSeFInvoiceStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pending',
          adapter: 'wfirma',
          direction: 'sent',
        }),
      });
    });

    it('should update existing record to pending when in failed state and wFirma has no KSeF ref', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: null });
      const existingRecord = makeDbRecord({ status: 'failed' });

      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(existingRecord);
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'pending' }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.status).toBe('pending');
      expect(mockPrisma.kSeFInvoiceStatus.update).toHaveBeenCalledWith({
        where: { id: RECORD_UUID },
        data: expect.objectContaining({
          status: 'pending',
        }),
      });
    });
  });

  // ==============================================
  // getInvoiceStatus
  // ==============================================

  describe('getInvoiceStatus', () => {
    it('should return pending status from DB when record exists with pending status and no KSeF ref in wFirma', async () => {
      const record = makeDbRecord({ status: 'pending' });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      // Re-fetch from wFirma returns no KSeF ref
      mockWfirmaService.getInvoiceById.mockResolvedValue(makeWfirmaInvoice({ ksefReferenceNumber: null }));

      const result = await adapter.getInvoiceStatus(USER_ID, RECORD_UUID);

      expect(result.status).toBe('pending');
      expect(result.adapter).toBe('wfirma');
      expect(result.referenceNumber).toBe(RECORD_UUID);
    });

    it('should update record to accepted when wFirma re-fetch returns ksefReferenceNumber for a pending record', async () => {
      const record = makeDbRecord({ status: 'pending', wfirmaInvoiceId: INVOICE_ID });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      mockWfirmaService.getInvoiceById.mockResolvedValue(
        makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF })
      );
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      const result = await adapter.getInvoiceStatus(USER_ID, RECORD_UUID);

      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(mockPrisma.kSeFInvoiceStatus.update).toHaveBeenCalledWith({
        where: { id: RECORD_UUID },
        data: expect.objectContaining({
          ksefReferenceNumber: KSEF_REF,
          status: 'accepted',
        }),
      });
    });

    it('should update record to accepted when wFirma re-fetch returns ksefReferenceNumber for a sending record', async () => {
      const record = makeDbRecord({ status: 'sending', wfirmaInvoiceId: INVOICE_ID });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      mockWfirmaService.getInvoiceById.mockResolvedValue(
        makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF })
      );
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      const result = await adapter.getInvoiceStatus(USER_ID, RECORD_UUID);

      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe(KSEF_REF);
    });

    it('should return current status without re-fetch for non-pending statuses', async () => {
      const record = makeDbRecord({
        status: 'accepted',
        ksefReferenceNumber: KSEF_REF,
        acceptedAt: new Date(),
        upoDownloaded: true,
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const result = await adapter.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(result.status).toBe('accepted');
      expect(result.upoAvailable).toBe(true);
      // Should NOT call wfirmaService.getInvoiceById because status is accepted
      expect(mockWfirmaService.getInvoiceById).not.toHaveBeenCalled();
    });

    it('should gracefully handle wFirma re-fetch error and return current DB status', async () => {
      const record = makeDbRecord({ status: 'pending', wfirmaInvoiceId: INVOICE_ID });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      mockWfirmaService.getInvoiceById.mockRejectedValue(new Error('wFirma API timeout'));

      const result = await adapter.getInvoiceStatus(USER_ID, RECORD_UUID);

      expect(result.status).toBe('pending');
      expect(result.referenceNumber).toBe(RECORD_UUID);
    });

    it('should throw STATUS_NOT_FOUND when no record exists in DB', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      await expect(
        adapter.getInvoiceStatus(USER_ID, KSEF_REF)
      ).rejects.toThrow(KSeFError);

      try {
        await adapter.getInvoiceStatus(USER_ID, KSEF_REF);
      } catch (error) {
        expect((error as KSeFError).code).toBe('STATUS_NOT_FOUND');
        expect((error as KSeFError).statusCode).toBe(404);
      }
    });
  });

  // ==============================================
  // downloadUPO
  // ==============================================

  describe('downloadUPO', () => {
    it('should return cached UPO content when already downloaded', async () => {
      const upoContent = Buffer.from('<UPO>test</UPO>');
      const record = makeDbRecord({
        ksefReferenceNumber: KSEF_REF,
        upoDownloaded: true,
        upoContent,
        upoDownloadedAt: new Date('2026-02-20T12:00:00Z'),
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const result = await adapter.downloadUPO(USER_ID, KSEF_REF);

      expect(result.upoContent).toEqual(upoContent);
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(result.fileName).toContain(INVOICE_NUMBER);
    });

    it('should throw UPO_NOT_AVAILABLE (409) when no KSeF reference number assigned yet', async () => {
      const record = makeDbRecord({
        status: 'pending',
        ksefReferenceNumber: null,
        upoDownloaded: false,
        upoContent: null,
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      try {
        await adapter.downloadUPO(USER_ID, RECORD_UUID);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('UPO_NOT_AVAILABLE');
        expect((error as KSeFError).statusCode).toBe(409);
      }
    });

    it('should throw STATUS_NOT_FOUND when no record exists', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      try {
        await adapter.downloadUPO(USER_ID, KSEF_REF);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('STATUS_NOT_FOUND');
        expect((error as KSeFError).statusCode).toBe(404);
      }
    });
  });

  // ==============================================
  // queryInvoices
  // ==============================================

  describe('queryInvoices', () => {
    const makeRecords = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        makeDbRecord({
          id: `record-${i}`,
          ksefReferenceNumber: `ref-${i}`,
          ksefInvoiceNumber: `FV/2026/02/00${i + 1}`,
          status: i % 2 === 0 ? 'accepted' : 'pending',
          direction: 'sent',
          totalGross: 100 * (i + 1),
        })
      );

    it('should return all invoices for user without filters', async () => {
      const records = makeRecords(3);
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue(records);

      const result = await adapter.queryInvoices(USER_ID, {});

      expect(result).toHaveLength(3);
      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          take: 50,
          skip: 0,
        })
      );
    });

    it('should filter by status', async () => {
      const records = makeRecords(1);
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue(records);

      await adapter.queryInvoices(USER_ID, { status: 'accepted' });

      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            status: 'accepted',
          }),
        })
      );
    });

    it('should filter by direction', async () => {
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue([]);

      await adapter.queryInvoices(USER_ID, { direction: 'received' });

      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            direction: 'received',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2026-02-01');
      const dateTo = new Date('2026-02-28');
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue([]);

      await adapter.queryInvoices(USER_ID, { dateFrom, dateTo });

      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
        })
      );
    });

    it('should respect limit and offset for pagination', async () => {
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue([]);

      await adapter.queryInvoices(USER_ID, { limit: 10, offset: 20 });

      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should map records to KSeFInvoiceListItem format', async () => {
      const records = [
        makeDbRecord({
          ksefReferenceNumber: KSEF_REF,
          ksefInvoiceNumber: INVOICE_NUMBER,
          totalGross: 1230,
          currency: 'PLN',
          status: 'accepted',
          direction: 'sent',
          invoiceDate: new Date('2026-02-20'),
          errorCode: null,
          errorMessage: null,
        }),
      ];
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue(records);

      const result = await adapter.queryInvoices(USER_ID, {});

      expect(result[0]).toEqual(
        expect.objectContaining({
          referenceNumber: KSEF_REF,
          invoiceNumber: INVOICE_NUMBER,
          totalGross: 1230,
          currency: 'PLN',
          status: 'accepted',
          direction: 'sent',
          adapter: 'wfirma',
        })
      );
    });
  });

  // ==============================================
  // bulkSendInvoices
  // ==============================================

  describe('bulkSendInvoices', () => {
    it('should process all invoices and return aggregate results', async () => {
      const invoice = makeWfirmaInvoice({ ksefReferenceNumber: KSEF_REF });
      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      const result = await adapter.bulkSendInvoices(USER_ID, {
        invoiceIds: ['inv-1', 'inv-2'],
        continueOnError: true,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should stop on first error when continueOnError is false', async () => {
      mockWfirmaService.getInvoiceById.mockResolvedValue(null);

      const result = await adapter.bulkSendInvoices(USER_ID, {
        invoiceIds: ['inv-1', 'inv-2', 'inv-3'],
        continueOnError: false,
      });

      expect(result.total).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });
});
