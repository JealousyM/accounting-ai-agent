/**
 * Direct KSeF Adapter Unit Tests
 *
 * Tests the DirectKSeFAdapter: sending invoices with and without
 * KSeF credentials, fetching from wFirma, status checks, and UPO download.
 */

import { DirectKSeFAdapter } from '../ksef/adapters/direct-adapter';
import { KSeFError } from '../ksef/errors';

// -----------------------------------------------
// Mock external dependencies
// -----------------------------------------------

// Mock the DirectKSeFClient class
jest.mock('../ksef/adapters/direct-ksef-client', () => {
  const mockClient = {
    openSessionWithToken: jest.fn().mockResolvedValue({
      sessionToken: 'mock-jwt',
      referenceNumber: 'mock-session-ref',
      expiresAt: new Date('2026-02-21'),
    }),
    sendInvoice: jest.fn().mockResolvedValue({
      elementReferenceNumber: 'mock-element-ref',
      processingCode: 200,
    }),
    getInvoiceStatus: jest.fn().mockResolvedValue({
      processingCode: 200,
      processingDescription: 'Accepted',
      ksefReferenceNumber: '1234567890-20260220-ABCDEF12',
    }),
    closeSession: jest.fn().mockResolvedValue(undefined),
    getSessionRef: jest.fn().mockReturnValue('mock-session-ref'),
    authenticate: jest.fn().mockResolvedValue('mock-jwt-token'),
    downloadUPOWithToken: jest.fn().mockResolvedValue(Buffer.from('<UPO/>')),
  };

  return {
    DirectKSeFClient: jest.fn().mockImplementation(() => mockClient),
    __mockClient: mockClient,
  };
});

// Mock the XML generator
jest.mock('../ksef/xml-generator', () => ({
  KSeFXMLGenerator: jest.fn().mockImplementation(() => ({
    generateFA3XML: jest.fn().mockReturnValue('<Faktura>mock</Faktura>'),
  })),
}));

// Mock the invoice-pdf-generator module
jest.mock('../ksef/invoice-pdf-generator', () => ({
  parseFA3XML: jest.fn(),
  generateInvoicePDF: jest.fn(),
  createPDFDataFromMetadata: jest.fn(),
  extractSkrotFromUPO: jest.fn(),
  buildKSeFVerificationUrl: jest.fn(),
  computeXmlSkrot: jest.fn(),
}));

// -----------------------------------------------
// Test data
// -----------------------------------------------

const USER_ID = 'user-123';
const INVOICE_ID = 'wfirma-invoice-456';
const KSEF_REF = '1234567890-20260220-ABCDEF12';
const INVOICE_NUMBER = 'FV/2026/02/001';
const RECORD_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const NIP = '1234567890';

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
  kSeFConfig: {
    findUnique: jest.fn(),
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
// Mock CertificateService
// -----------------------------------------------

const mockCertificateService: any = {};

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function makeInvoiceData(overrides: Record<string, any> = {}) {
  return {
    invoiceNumber: INVOICE_NUMBER,
    issueDate: new Date('2026-02-20'),
    sellDate: new Date('2026-02-20'),
    dueDate: new Date('2026-03-06'),
    sellerName: 'My Company sp. z o.o.',
    sellerNip: NIP,
    sellerAddress: { street: 'Marszalkowska 1', city: 'Warszawa', zip: '00-001', country: 'PL' },
    buyerName: 'Test Buyer sp. z o.o.',
    buyerNip: '0987654321',
    buyerAddress: { street: 'Mokotowska 5', city: 'Warszawa', zip: '00-640', country: 'PL' },
    items: [
      {
        name: 'Consulting',
        quantity: 10,
        unit: 'h',
        priceNet: 100,
        vatRate: '23',
        totalNet: 1000,
        totalVat: 230,
        totalGross: 1230,
      },
    ],
    totalNet: 1000,
    totalVat: 230,
    totalGross: 1230,
    currency: 'PLN',
    paymentMethod: 'transfer',
    ...overrides,
  };
}

function makeWfirmaInvoice(overrides: Record<string, any> = {}) {
  return {
    id: INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    contractorName: 'Test Buyer sp. z o.o.',
    contractorNip: '0987654321',
    contractorId: 'contractor-1',
    total: 1230,
    totalNet: 1000,
    totalVat: 230,
    currency: 'PLN',
    issueDate: new Date('2026-02-20'),
    sellDate: new Date('2026-02-20'),
    dueDate: new Date('2026-03-06'),
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
    ksefSessionRef: null,
    contractorName: 'Test Buyer sp. z o.o.',
    contractorNip: '0987654321',
    totalGross: 1230,
    currency: 'PLN',
    invoiceDate: new Date('2026-02-20'),
    status: 'pending',
    adapter: 'direct',
    direction: 'sent',
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    upoDownloaded: false,
    upoContent: null,
    upoDownloadedAt: null,
    invoicePayload: null,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date('2026-02-20T09:00:00Z'),
    updatedAt: new Date('2026-02-20T09:00:00Z'),
    ...overrides,
  };
}

// Get the mock client from the mocked module
function getMockKSeFClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { __mockClient } = require('../ksef/adapters/direct-ksef-client');
  return __mockClient;
}

describe('DirectKSeFAdapter', () => {
  let adapter: DirectKSeFAdapter;

  beforeEach(() => {
    adapter = new DirectKSeFAdapter(mockPrisma, mockWfirmaService, mockCertificateService);
  });

  // ==============================================
  // sendInvoice with invoiceData (direct path)
  // ==============================================

  describe('sendInvoice with invoiceData (direct path)', () => {
    it('should create pending record when no KSeF credentials configured', async () => {
      const invoiceData = makeInvoiceData();
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null); // No credentials
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceData });

      expect(result.status).toBe('pending');
      expect(result.adapter).toBe('direct');
      expect(result.success).toBe(true);
      expect(mockPrisma.kSeFInvoiceStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          status: 'pending',
          adapter: 'direct',
          direction: 'sent',
          ksefInvoiceNumber: INVOICE_NUMBER,
          contractorName: 'Test Buyer sp. z o.o.',
          contractorNip: '0987654321',
        }),
      });
    });

    it('should return pending result with record ID when no credentials', async () => {
      const invoiceData = makeInvoiceData();
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceData });

      expect(result.referenceNumber).toBe(RECORD_UUID);
      expect(result.status).toBe('pending');
      expect(result.message).toContain('Configure ksefToken');
    });

    it('should successfully submit when credentials are configured', async () => {
      const invoiceData = makeInvoiceData();
      const mockClient = getMockKSeFClient();

      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({
        ksefToken: 'test-token',
        ksefNip: NIP,
        environment: 'test',
      });
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      mockClient.sendInvoice.mockResolvedValue({
        elementReferenceNumber: 'mock-element-ref',
        processingCode: 200,
      });
      mockClient.getInvoiceStatus.mockResolvedValue({
        processingCode: 200,
        processingDescription: 'Accepted',
        ksefReferenceNumber: KSEF_REF,
      });

      const result = await adapter.sendInvoice(USER_ID, { invoiceData });

      expect(result.success).toBe(true);
      expect(result.adapter).toBe('direct');
      expect(mockClient.openSessionWithToken).toHaveBeenCalledWith(NIP, 'test-token');
      expect(mockClient.sendInvoice).toHaveBeenCalled();
    });

    it('should return accepted with KSeF reference number on successful submission', async () => {
      const invoiceData = makeInvoiceData();
      const mockClient = getMockKSeFClient();

      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({
        ksefToken: 'test-token',
        ksefNip: NIP,
        environment: 'test',
      });
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'accepted' }));

      mockClient.sendInvoice.mockResolvedValue({
        elementReferenceNumber: 'mock-element-ref',
        processingCode: 200,
      });
      mockClient.getInvoiceStatus.mockResolvedValue({
        processingCode: 200,
        processingDescription: 'Accepted',
        ksefReferenceNumber: KSEF_REF,
      });

      const result = await adapter.sendInvoice(USER_ID, { invoiceData });

      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe('mock-element-ref');
    });

    it('should set invoicePayload in DB with full FA3 data', async () => {
      const invoiceData = makeInvoiceData();
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));

      await adapter.sendInvoice(USER_ID, { invoiceData });

      expect(mockPrisma.kSeFInvoiceStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoicePayload: expect.objectContaining({
            invoiceNumber: INVOICE_NUMBER,
            sellerName: 'My Company sp. z o.o.',
            buyerName: 'Test Buyer sp. z o.o.',
            totalGross: 1230,
          }),
        }),
      });
    });

    it('should handle KSeF API error gracefully and update record to failed', async () => {
      const invoiceData = makeInvoiceData();
      const mockClient = getMockKSeFClient();

      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({
        ksefToken: 'test-token',
        ksefNip: NIP,
        environment: 'test',
      });
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(makeDbRecord({ status: 'failed' }));

      mockClient.sendInvoice.mockRejectedValue(new Error('KSeF submission failed'));

      await expect(
        adapter.sendInvoice(USER_ID, { invoiceData })
      ).rejects.toThrow('KSeF submission failed');

      // Should have updated the record to 'failed'
      expect(mockPrisma.kSeFInvoiceStatus.update).toHaveBeenCalledWith({
        where: { id: RECORD_UUID },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'KSeF submission failed',
        }),
      });
    });
  });

  // ==============================================
  // sendInvoice with invoiceId (wFirma path)
  // ==============================================

  describe('sendInvoice with invoiceId (wFirma path)', () => {
    it('should fetch invoice from wFirma and build FA3 data', async () => {
      const invoice = makeWfirmaInvoice();
      const company = {
        name: 'My Company sp. z o.o.',
        nip: NIP,
        address: { street: 'Marszalkowska 1', city: 'Warszawa', zip: '00-001', country: 'PL' },
      };

      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockWfirmaService.getCompanyData.mockResolvedValue(company);
      mockWfirmaService.getContractorById.mockResolvedValue({
        address: { street: 'Mokotowska 5', city: 'Warszawa', zip: '00-640', country: 'PL' },
      });
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null); // No credentials
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));

      const result = await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(mockWfirmaService.getInvoiceById).toHaveBeenCalledWith(INVOICE_ID);
      expect(mockWfirmaService.getCompanyData).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
    });

    it('should throw INVOICE_NOT_FOUND when wFirma returns null', async () => {
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

    it('should get company data for seller information', async () => {
      const invoice = makeWfirmaInvoice();
      const company = {
        name: 'My Company sp. z o.o.',
        nip: NIP,
        address: { street: 'Marszalkowska 1', city: 'Warszawa', zip: '00-001', country: 'PL' },
      };

      mockWfirmaService.getInvoiceById.mockResolvedValue(invoice);
      mockWfirmaService.getCompanyData.mockResolvedValue(company);
      mockWfirmaService.getContractorById.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null);
      mockPrisma.kSeFInvoiceStatus.create.mockResolvedValue(makeDbRecord({ id: RECORD_UUID }));

      await adapter.sendInvoice(USER_ID, { invoiceId: INVOICE_ID });

      expect(mockWfirmaService.getCompanyData).toHaveBeenCalled();
      // Invoice payload should contain seller info from company
      expect(mockPrisma.kSeFInvoiceStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoicePayload: expect.objectContaining({
            sellerName: 'My Company sp. z o.o.',
            sellerNip: NIP,
          }),
        }),
      });
    });

    it('should throw MISSING_INVOICE_DATA when neither invoiceId nor invoiceData provided', async () => {
      await expect(
        adapter.sendInvoice(USER_ID, {})
      ).rejects.toThrow(KSeFError);

      try {
        await adapter.sendInvoice(USER_ID, {});
      } catch (error) {
        expect((error as KSeFError).code).toBe('MISSING_INVOICE_DATA');
      }
    });
  });

  // ==============================================
  // getInvoiceStatus
  // ==============================================

  describe('getInvoiceStatus', () => {
    it('should return status from DB for accepted records', async () => {
      const record = makeDbRecord({
        status: 'accepted',
        adapter: 'direct',
        ksefReferenceNumber: KSEF_REF,
        acceptedAt: new Date('2026-02-20T12:00:00Z'),
        upoDownloaded: true,
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const result = await adapter.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(result.adapter).toBe('direct');
      expect(result.upoAvailable).toBe(true);
    });

    it('should return status from DB for rejected records', async () => {
      const record = makeDbRecord({
        status: 'rejected',
        adapter: 'direct',
        ksefReferenceNumber: KSEF_REF,
        rejectedAt: new Date(),
        errorCode: '400',
        errorMessage: 'Invalid XML',
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const result = await adapter.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(result.status).toBe('rejected');
      expect(result.errorCode).toBe('400');
      expect(result.errorMessage).toBe('Invalid XML');
    });

    it('should throw NOT_FOUND when no record exists', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      try {
        await adapter.getInvoiceStatus(USER_ID, KSEF_REF);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('NOT_FOUND');
        expect((error as KSeFError).statusCode).toBe(404);
      }
    });
  });

  // ==============================================
  // downloadUPO
  // ==============================================

  describe('downloadUPO', () => {
    it('should return cached UPO from DB when already downloaded', async () => {
      const upoContent = Buffer.from('<UPO>cached</UPO>');
      const record = makeDbRecord({
        adapter: 'direct',
        ksefReferenceNumber: KSEF_REF,
        upoDownloaded: true,
        upoContent,
        upoDownloadedAt: new Date('2026-02-20T12:00:00Z'),
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const result = await adapter.downloadUPO(USER_ID, KSEF_REF);

      expect(result.upoContent).toEqual(upoContent);
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(result.fileName).toContain(KSEF_REF);
    });

    it('should throw UPO_NOT_AVAILABLE when status is not accepted and has no session ref', async () => {
      const record = makeDbRecord({
        adapter: 'direct',
        status: 'pending',
        ksefReferenceNumber: null,
        ksefSessionRef: null,
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

    it('should throw NOT_FOUND when no record exists', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      try {
        await adapter.downloadUPO(USER_ID, KSEF_REF);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('NOT_FOUND');
        expect((error as KSeFError).statusCode).toBe(404);
      }
    });

    it('should download UPO from KSeF API when session ref and invoice ref are available', async () => {
      const record = makeDbRecord({
        adapter: 'direct',
        status: 'accepted',
        ksefReferenceNumber: KSEF_REF,
        ksefSessionRef: 'session-ref-123',
        upoDownloaded: false,
        upoContent: null,
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({
        ksefToken: 'test-token',
        ksefNip: NIP,
        environment: 'test',
      });
      mockPrisma.kSeFInvoiceStatus.update.mockResolvedValue(record);

      const mockClient = getMockKSeFClient();
      mockClient.authenticate.mockResolvedValue('mock-jwt');
      mockClient.downloadUPOWithToken.mockResolvedValue(Buffer.from('<UPO>fresh</UPO>'));

      const result = await adapter.downloadUPO(USER_ID, KSEF_REF);

      expect(result.upoContent).toEqual(Buffer.from('<UPO>fresh</UPO>'));
      expect(result.referenceNumber).toBe(KSEF_REF);
      expect(mockPrisma.kSeFInvoiceStatus.update).toHaveBeenCalledWith({
        where: { id: RECORD_UUID },
        data: expect.objectContaining({
          upoDownloaded: true,
          upoContent: Buffer.from('<UPO>fresh</UPO>'),
        }),
      });
    });

    it('should throw UPO_NOT_AVAILABLE when KSeF credentials are not configured', async () => {
      const record = makeDbRecord({
        adapter: 'direct',
        status: 'accepted',
        ksefReferenceNumber: KSEF_REF,
        ksefSessionRef: 'session-ref-123',
        upoDownloaded: false,
        upoContent: null,
      });
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null); // No credentials

      try {
        await adapter.downloadUPO(USER_ID, KSEF_REF);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KSeFError);
        expect((error as KSeFError).code).toBe('UPO_NOT_AVAILABLE');
      }
    });
  });

  // ==============================================
  // queryInvoices
  // ==============================================

  describe('queryInvoices', () => {
    it('should filter by adapter=direct in queries', async () => {
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue([]);

      await adapter.queryInvoices(USER_ID, {});

      expect(mockPrisma.kSeFInvoiceStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            adapter: 'direct',
          }),
        })
      );
    });

    it('should map records to KSeFInvoiceListItem format with adapter=direct', async () => {
      const records = [
        makeDbRecord({
          ksefReferenceNumber: KSEF_REF,
          ksefInvoiceNumber: INVOICE_NUMBER,
          totalGross: 1230,
          currency: 'PLN',
          status: 'accepted',
          direction: 'sent',
        }),
      ];
      mockPrisma.kSeFInvoiceStatus.findMany.mockResolvedValue(records);

      const result = await adapter.queryInvoices(USER_ID, {});

      expect(result[0]).toEqual(
        expect.objectContaining({
          referenceNumber: KSEF_REF,
          invoiceNumber: INVOICE_NUMBER,
          adapter: 'direct',
        })
      );
    });
  });
});
