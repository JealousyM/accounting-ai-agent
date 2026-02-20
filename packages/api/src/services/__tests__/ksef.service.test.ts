/**
 * KSeF Service Unit Tests
 *
 * Tests the KSeFService facade: adapter routing, deduplication,
 * cross-adapter UPO download, and config management.
 */

import { KSeFService } from '../ksef/ksef.service';
import { KSeFError } from '../ksef/errors';
import { IKSeFAdapter } from '../ksef/adapters/adapter.interface';
import {
  SendToKSeFResult,
  KSeFInvoiceStatusInfo,
  KSeFUPO,
} from '../../types/ksef.types';

// -----------------------------------------------
// Mock Prisma
// -----------------------------------------------

const mockPrisma: any = {
  kSeFInvoiceStatus: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  kSeFConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  wFirmaCache: {
    findMany: jest.fn(),
  },
};

// -----------------------------------------------
// Mock adapters
// -----------------------------------------------

const mockWfirmaAdapter: any = {
  sendInvoice: jest.fn(),
  getInvoiceStatus: jest.fn(),
  downloadUPO: jest.fn(),
  queryInvoices: jest.fn(),
  bulkSendInvoices: jest.fn(),
};

const mockDirectAdapter: IKSeFAdapter = {
  sendInvoice: jest.fn(),
  getInvoiceStatus: jest.fn(),
  downloadUPO: jest.fn(),
  queryInvoices: jest.fn(),
  bulkSendInvoices: jest.fn(),
};

// -----------------------------------------------
// Test data
// -----------------------------------------------

const USER_ID = 'user-123';
const INVOICE_ID = 'wfirma-invoice-456';
const KSEF_REF = '1234567890-20260220-ABCDEF12';
const INVOICE_NUMBER = 'FV/2026/02/001';
const RECORD_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('KSeFService', () => {
  let service: KSeFService;

  beforeEach(() => {
    service = new KSeFService(mockPrisma, mockWfirmaAdapter, mockDirectAdapter);
  });

  // ==============================================
  // sendInvoiceToKSeF
  // ==============================================

  describe('sendInvoiceToKSeF', () => {
    it('should return isDuplicate: true when same wfirmaInvoiceId already has pending status', async () => {
      const existingRecord = {
        id: RECORD_UUID,
        userId: USER_ID,
        wfirmaInvoiceId: INVOICE_ID,
        ksefReferenceNumber: null,
        status: 'pending',
        adapter: 'wfirma',
        sentAt: null,
        createdAt: new Date('2026-02-20T10:00:00Z'),
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(existingRecord);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.isDuplicate).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBe(RECORD_UUID);
    });

    it('should return isDuplicate: true when same wfirmaInvoiceId already has accepted status', async () => {
      const existingRecord = {
        id: RECORD_UUID,
        userId: USER_ID,
        wfirmaInvoiceId: INVOICE_ID,
        ksefReferenceNumber: KSEF_REF,
        status: 'accepted',
        adapter: 'wfirma',
        sentAt: new Date('2026-02-20T10:00:00Z'),
        createdAt: new Date('2026-02-20T09:00:00Z'),
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(existingRecord);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.isDuplicate).toBe(true);
      expect(result.status).toBe('accepted');
      expect(result.referenceNumber).toBe(KSEF_REF);
    });

    it('should return isDuplicate: true when same invoice number already submitted (direct path)', async () => {
      const invoiceData = {
        invoiceNumber: INVOICE_NUMBER,
        issueDate: new Date(),
        sellDate: new Date(),
        dueDate: new Date(),
        sellerName: 'Seller',
        sellerNip: '1234567890',
        sellerAddress: { street: 'St', city: 'City', zip: '00-000', country: 'PL' },
        buyerName: 'Buyer',
        buyerNip: '0987654321',
        buyerAddress: { street: 'St', city: 'City', zip: '00-000', country: 'PL' },
        items: [{ name: 'Item', quantity: 1, unit: 'szt', priceNet: 100, vatRate: '23', totalNet: 100, totalVat: 23, totalGross: 123 }],
        totalNet: 100,
        totalVat: 23,
        totalGross: 123,
        currency: 'PLN',
        paymentMethod: 'transfer',
      };

      const existingRecord = {
        id: RECORD_UUID,
        userId: USER_ID,
        ksefInvoiceNumber: INVOICE_NUMBER,
        status: 'accepted',
        adapter: 'direct',
        ksefReferenceNumber: KSEF_REF,
        sentAt: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(existingRecord);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceData });

      expect(result.isDuplicate).toBe(true);
      expect(result.status).toBe('accepted');
    });

    it('should allow re-send when existing record has failed status (no deduplication block)', async () => {
      // findExistingSubmission only checks active statuses, so a 'failed' record returns null
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'wfirma' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: RECORD_UUID,
        status: 'pending',
        adapter: 'wfirma',
        message: 'Queued',
        timestamp: new Date(),
      };
      (mockWfirmaAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.isDuplicate).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockWfirmaAdapter.sendInvoice).toHaveBeenCalled();
    });

    it('should allow re-send when existing record has rejected status', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'wfirma' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: RECORD_UUID,
        status: 'pending',
        adapter: 'wfirma',
        message: 'Queued',
        timestamp: new Date(),
      };
      (mockWfirmaAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(result.isDuplicate).toBeUndefined();
      expect(mockWfirmaAdapter.sendInvoice).toHaveBeenCalled();
    });

    it('should route to wFirma adapter when preferred adapter is wfirma and no invoiceData', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'wfirma' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: RECORD_UUID,
        status: 'pending',
        adapter: 'wfirma',
        message: 'Queued',
        timestamp: new Date(),
      };
      (mockWfirmaAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(mockWfirmaAdapter.sendInvoice).toHaveBeenCalledWith(USER_ID, { invoiceId: INVOICE_ID });
      expect(mockDirectAdapter.sendInvoice).not.toHaveBeenCalled();
    });

    it('should route to direct adapter when preferred adapter is direct', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'direct' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: RECORD_UUID,
        status: 'pending',
        adapter: 'direct',
        message: 'Queued',
        timestamp: new Date(),
      };
      (mockDirectAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID, adapter: 'direct' });

      expect(mockDirectAdapter.sendInvoice).toHaveBeenCalled();
      expect(mockWfirmaAdapter.sendInvoice).not.toHaveBeenCalled();
    });

    it('should force direct adapter when invoiceData is provided even if preferred is wfirma', async () => {
      const invoiceData = {
        invoiceNumber: INVOICE_NUMBER,
        issueDate: new Date(),
        sellDate: new Date(),
        dueDate: new Date(),
        sellerName: 'Seller',
        sellerNip: '1234567890',
        sellerAddress: { street: 'St', city: 'City', zip: '00-000', country: 'PL' },
        buyerName: 'Buyer',
        buyerNip: '0987654321',
        buyerAddress: { street: 'St', city: 'City', zip: '00-000', country: 'PL' },
        items: [{ name: 'Item', quantity: 1, unit: 'szt', priceNet: 100, vatRate: '23', totalNet: 100, totalVat: 23, totalGross: 123 }],
        totalNet: 100,
        totalVat: 23,
        totalGross: 123,
        currency: 'PLN',
        paymentMethod: 'transfer',
      };

      // No existing submission
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      // Preferred is wfirma, but invoiceData overrides
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'wfirma' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: RECORD_UUID,
        status: 'pending',
        adapter: 'direct',
        message: 'Queued',
        timestamp: new Date(),
      };
      (mockDirectAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      await service.sendInvoiceToKSeF(USER_ID, { invoiceData });

      expect(mockDirectAdapter.sendInvoice).toHaveBeenCalled();
      expect(mockWfirmaAdapter.sendInvoice).not.toHaveBeenCalled();
    });

    it('should throw when direct adapter not configured but requested', async () => {
      const serviceWithoutDirect = new KSeFService(mockPrisma, mockWfirmaAdapter, null);

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      await expect(
        serviceWithoutDirect.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID, adapter: 'direct' })
      ).rejects.toThrow(KSeFError);

      await expect(
        serviceWithoutDirect.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID, adapter: 'direct' })
      ).rejects.toMatchObject({ code: 'ADAPTER_NOT_AVAILABLE' });
    });

    it('should call adapter sendInvoice and return its result when no duplicate found', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue({ preferredAdapter: 'wfirma' });

      const adapterResult: SendToKSeFResult = {
        success: true,
        referenceNumber: KSEF_REF,
        status: 'accepted',
        adapter: 'wfirma',
        message: 'Invoice sent',
        timestamp: new Date(),
      };
      (mockWfirmaAdapter.sendInvoice as jest.Mock).mockResolvedValue(adapterResult);

      const result = await service.sendInvoiceToKSeF(USER_ID, { invoiceId: INVOICE_ID });

      expect(result).toEqual(adapterResult);
      expect(result.isDuplicate).toBeUndefined();
    });
  });

  // ==============================================
  // downloadUPO
  // ==============================================

  describe('downloadUPO', () => {
    it('should route to direct adapter when wFirma record has ksefReferenceNumber (cross-adapter)', async () => {
      const record = {
        id: RECORD_UUID,
        adapter: 'wfirma',
        ksefReferenceNumber: KSEF_REF,
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const upoResult: KSeFUPO = {
        referenceNumber: KSEF_REF,
        upoContent: Buffer.from('<UPO/>'),
        timestamp: new Date(),
        fileName: `UPO_${KSEF_REF}.xml`,
      };
      (mockDirectAdapter.downloadUPO as jest.Mock).mockResolvedValue(upoResult);

      const result = await service.downloadUPO(USER_ID, KSEF_REF);

      expect(mockDirectAdapter.downloadUPO).toHaveBeenCalledWith(USER_ID, KSEF_REF);
      expect(mockWfirmaAdapter.downloadUPO).not.toHaveBeenCalled();
      expect(result).toEqual(upoResult);
    });

    it('should route to wFirma adapter when wFirma record has no ksefReferenceNumber', async () => {
      const record = {
        id: RECORD_UUID,
        adapter: 'wfirma',
        ksefReferenceNumber: null,
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const upoResult: KSeFUPO = {
        referenceNumber: RECORD_UUID,
        upoContent: Buffer.from('<UPO/>'),
        timestamp: new Date(),
        fileName: `UPO_${RECORD_UUID}.xml`,
      };
      (mockWfirmaAdapter.downloadUPO as jest.Mock).mockResolvedValue(upoResult);

      // Use RECORD_UUID since that's a valid UUID format
      const result = await service.downloadUPO(USER_ID, RECORD_UUID);

      expect(mockWfirmaAdapter.downloadUPO).toHaveBeenCalledWith(USER_ID, RECORD_UUID);
      expect(mockDirectAdapter.downloadUPO).not.toHaveBeenCalled();
      expect(result).toEqual(upoResult);
    });

    it('should route to direct adapter for direct records (normal)', async () => {
      const record = {
        id: RECORD_UUID,
        adapter: 'direct',
        ksefReferenceNumber: KSEF_REF,
      };

      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const upoResult: KSeFUPO = {
        referenceNumber: KSEF_REF,
        upoContent: Buffer.from('<UPO/>'),
        timestamp: new Date(),
        fileName: `UPO_${KSEF_REF}.xml`,
      };
      (mockDirectAdapter.downloadUPO as jest.Mock).mockResolvedValue(upoResult);

      const result = await service.downloadUPO(USER_ID, KSEF_REF);

      expect(mockDirectAdapter.downloadUPO).toHaveBeenCalledWith(USER_ID, KSEF_REF);
      expect(result).toEqual(upoResult);
    });
  });

  // ==============================================
  // getInvoiceStatus
  // ==============================================

  describe('getInvoiceStatus', () => {
    it('should route by adapter field on DB record (wfirma)', async () => {
      const record = { adapter: 'wfirma' };
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const statusResult: KSeFInvoiceStatusInfo = {
        referenceNumber: KSEF_REF,
        invoiceNumber: INVOICE_NUMBER,
        status: 'accepted',
        adapter: 'wfirma',
        upoAvailable: false,
      };
      (mockWfirmaAdapter.getInvoiceStatus as jest.Mock).mockResolvedValue(statusResult);

      const result = await service.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(mockWfirmaAdapter.getInvoiceStatus).toHaveBeenCalledWith(USER_ID, KSEF_REF);
      expect(mockDirectAdapter.getInvoiceStatus).not.toHaveBeenCalled();
      expect(result).toEqual(statusResult);
    });

    it('should route by adapter field on DB record (direct)', async () => {
      const record = { adapter: 'direct' };
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(record);

      const statusResult: KSeFInvoiceStatusInfo = {
        referenceNumber: KSEF_REF,
        invoiceNumber: INVOICE_NUMBER,
        status: 'accepted',
        adapter: 'direct',
        upoAvailable: true,
      };
      (mockDirectAdapter.getInvoiceStatus as jest.Mock).mockResolvedValue(statusResult);

      const result = await service.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(mockDirectAdapter.getInvoiceStatus).toHaveBeenCalledWith(USER_ID, KSEF_REF);
      expect(mockWfirmaAdapter.getInvoiceStatus).not.toHaveBeenCalled();
      expect(result).toEqual(statusResult);
    });

    it('should default to wfirma adapter when no record found in DB', async () => {
      mockPrisma.kSeFInvoiceStatus.findFirst.mockResolvedValue(null);

      const statusResult: KSeFInvoiceStatusInfo = {
        referenceNumber: KSEF_REF,
        invoiceNumber: INVOICE_NUMBER,
        status: 'pending',
        adapter: 'wfirma',
        upoAvailable: false,
      };
      (mockWfirmaAdapter.getInvoiceStatus as jest.Mock).mockResolvedValue(statusResult);

      const result = await service.getInvoiceStatus(USER_ID, KSEF_REF);

      expect(mockWfirmaAdapter.getInvoiceStatus).toHaveBeenCalledWith(USER_ID, KSEF_REF);
      expect(result).toEqual(statusResult);
    });
  });

  // ==============================================
  // getConfig
  // ==============================================

  describe('getConfig', () => {
    it('should return defaults when no config exists', async () => {
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(null);

      const config = await service.getConfig(USER_ID);

      expect(config.preferredAdapter).toBe('wfirma');
      expect(config.autoSendEnabled).toBe(false);
      expect(config.autoSendOnCreate).toBe(false);
      expect(config.environment).toBe('test');
      expect(config.notifyOnAccepted).toBe(true);
      expect(config.notifyOnRejected).toBe(true);
    });

    it('should return stored config when it exists', async () => {
      const stored = {
        userId: USER_ID,
        preferredAdapter: 'direct',
        autoSendEnabled: true,
        autoSendOnCreate: false,
        environment: 'production',
        defaultCertId: 'cert-1',
        notifyOnAccepted: false,
        notifyOnRejected: true,
        notificationEmail: 'test@example.com',
        ksefToken: 'token-123',
        ksefNip: '1234567890',
      };
      mockPrisma.kSeFConfig.findUnique.mockResolvedValue(stored);

      const config = await service.getConfig(USER_ID);

      expect(config.preferredAdapter).toBe('direct');
      expect(config.autoSendEnabled).toBe(true);
      expect(config.environment).toBe('production');
      expect(config.ksefToken).toBe('token-123');
      expect(config.ksefNip).toBe('1234567890');
    });
  });

  // ==============================================
  // updateConfig
  // ==============================================

  describe('updateConfig', () => {
    it('should upsert config and return updated values', async () => {
      const upserted = {
        userId: USER_ID,
        preferredAdapter: 'direct',
        autoSendEnabled: true,
        autoSendOnCreate: false,
        environment: 'test',
        defaultCertId: null,
        notifyOnAccepted: true,
        notifyOnRejected: true,
        notificationEmail: null,
        ksefToken: 'new-token',
        ksefNip: '1234567890',
      };
      mockPrisma.kSeFConfig.upsert.mockResolvedValue(upserted);

      const config = await service.updateConfig(USER_ID, {
        preferredAdapter: 'direct',
        autoSendEnabled: true,
        ksefToken: 'new-token',
        ksefNip: '1234567890',
      });

      expect(mockPrisma.kSeFConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
        })
      );
      expect(config.preferredAdapter).toBe('direct');
      expect(config.ksefToken).toBe('new-token');
    });
  });
});
