/**
 * KSeF Routes
 * API endpoints for KSeF (Krajowy System e-Faktur) operations
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ksefService } from '../services/ksef/ksef.instance';
import { ksefContractorService } from '../services/ksef/contractor.instance';
import { logger } from '../utils/logger';
import { KSeFError } from '../services/ksef/errors';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// SEND ROUTES
// ============================================

/**
 * POST /api/ksef/send
 * Send a single invoice to KSeF (by wFirma invoice ID)
 */
const SendInvoiceSchema = z.object({
  invoiceId: z.string(),
  adapter: z.enum(['wfirma', 'direct']).optional(),
});

/**
 * POST /api/ksef/send-raw
 * Send invoice data directly to KSeF without wFirma connection.
 * Requires KSeF token + NIP configured in settings.
 */
// FA(3) XSD type constraints:
//   TZnakowy    = 1..256 chars   (P_2, P_7, names, unit)
//   TZnakowy512 = 1..512 chars   (AdresL1, AdresL2)
//   TKodWaluty  = 3-letter ISO 4217 code
//   NIP         = exactly 10 digits
//   country     = 2-letter ISO 3166-1 alpha-2

const FA3AddressSchema = z.object({
  street:  z.string().max(512).default(''),    // TZnakowy512 (AdresL1)
  city:    z.string().max(512).default(''),    // TZnakowy512 (AdresL2 / city)
  zip:     z.string().max(10).default(''),
  country: z.string().length(2).default('PL'), // ISO 3166-1 alpha-2
});

const FA3ItemSchema = z.object({
  name:       z.string().min(1).max(256),       // P_7: TZnakowy
  quantity:   z.number().positive(),            // P_8B: must be > 0
  unit:       z.string().max(256).default('szt.'), // P_8A: TZnakowy
  priceNet:   z.number(),                       // P_9A: TKwotowy2
  vatRate:    z.string(),                       // P_12: TStawkaPodatku ("23","8","5","0 KR","0 WDT","0 EX","zw","oo","np I","np II")
  totalNet:   z.number(),                       // P_11
  totalVat:   z.number(),
  totalGross: z.number(),                       // P_11A
});

const SendRawInvoiceSchema = z.object({
  invoiceNumber:  z.string().min(1).max(256),   // P_2: TZnakowy
  issueDate:      z.string(),
  sellDate:       z.string(),
  dueDate:        z.string(),
  sellerName:     z.string().min(1).max(256),   // Podmiot1 Nazwa: TZnakowy
  sellerNip:      z.string().regex(/^\d{10}$/, 'NIP must be exactly 10 digits'),
  sellerAddress:  FA3AddressSchema,
  buyerName:      z.string().min(1).max(256),   // Podmiot2 Nazwa: TZnakowy
  buyerNip:       z.string().min(1),
  buyerAddress:   FA3AddressSchema,
  items:          z.array(FA3ItemSchema).min(1),
  totalNet:       z.number(),
  totalVat:       z.number(),
  totalGross:     z.number(),
  currency:       z.string().length(3).default('PLN'), // TKodWaluty
  paymentMethod:  z.string().default('transfer'),
  paymentAccount: z.string().max(256).optional(),
});

router.post('/send-raw', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = SendRawInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid invoice data',
        details: parsed.error.errors,
      });
    }

    const d = parsed.data;
    const invoiceData = {
      ...d,
      issueDate: new Date(d.issueDate),
      sellDate: new Date(d.sellDate),
      dueDate: new Date(d.dueDate),
    };

    const result = await ksefService.sendInvoiceToKSeF(userId, { invoiceData });
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to send raw invoice to KSeF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    // Never return 401/403 for KSeF errors — those trigger frontend token refresh loop.
    // 401/403 should only mean "user session expired", not "KSeF upstream auth failed".
    const ksefStatus = error instanceof KSeFError ? (error.statusCode || 400) : 500;
    const statusCode = ksefStatus === 401 || ksefStatus === 403 ? 400 : ksefStatus;
    return res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to send invoice to KSeF',
    });
  }
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = SendInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const result = await ksefService.sendInvoiceToKSeF(userId, parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to send invoice to KSeF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    // Never return 401/403 for KSeF errors — those trigger frontend token refresh loop.
    // 401/403 should only mean "user session expired", not "KSeF upstream auth failed".
    const ksefStatus = error instanceof KSeFError ? (error.statusCode || 400) : 500;
    const statusCode = ksefStatus === 401 || ksefStatus === 403 ? 400 : ksefStatus;
    return res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to send invoice to KSeF',
    });
  }
});

// ============================================
// STATUS ROUTES
// ============================================

/**
 * GET /api/ksef/status/:referenceNumber
 * Check status of invoice in KSeF
 */
router.get('/status/:referenceNumber', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { referenceNumber } = req.params;

    const status = await ksefService.getInvoiceStatus(userId, referenceNumber);
    return res.status(200).json(status);
  } catch (error) {
    logger.error('Failed to check KSeF status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      referenceNumber: req.params.referenceNumber,
    });
    return res.status(500).json({ error: 'Failed to check KSeF status' });
  }
});

// ============================================
// UPO ROUTES
// ============================================

/**
 * GET /api/ksef/upo/:referenceNumber
 * Download UPO (official confirmation) from KSeF
 */
router.get('/upo/:referenceNumber', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { referenceNumber } = req.params;

    const upo = await ksefService.downloadUPO(userId, referenceNumber);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${upo.fileName}"`);
    return res.send(upo.upoContent);
  } catch (error) {
    logger.error('Failed to download KSeF UPO', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      referenceNumber: req.params.referenceNumber,
    });
    const statusCode = (error as any)?.statusCode ?? 500;
    const message = error instanceof Error ? error.message : 'Failed to download KSeF UPO';
    return res.status(statusCode).json({ error: message });
  }
});

// ============================================
// INVOICE QUERY ROUTES
// ============================================

/**
 * GET /api/ksef/invoices
 * List KSeF invoices with optional filters
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { dateFrom, dateTo, status, direction, limit, offset } = req.query;

    const options = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      status: status as any,
      direction: direction as 'sent' | 'received' | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    // When requesting received invoices, use getIncomingInvoices which also fetches from KSeF API
    let invoices;
    if (direction === 'received') {
      invoices = await ksefService.getIncomingInvoices(userId, options);
    } else {
      invoices = await ksefService.queryInvoices(userId, options);
    }

    return res.status(200).json(invoices);
  } catch (error) {
    logger.error('Failed to query KSeF invoices', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to query KSeF invoices' });
  }
});

// ============================================
// INVOICE DETAIL ROUTE
// ============================================

/**
 * GET /api/ksef/invoices/:referenceNumber
 * Get full invoice payload for copy functionality.
 * Returns invoicePayload for direct-adapter invoices.
 */
router.get('/invoices/:referenceNumber', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { referenceNumber } = req.params;

    const details = await ksefService.getInvoiceDetails(userId, referenceNumber);
    if (!details) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(200).json(details);
  } catch (error) {
    logger.error('Failed to get KSeF invoice details', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      referenceNumber: req.params.referenceNumber,
    });
    return res.status(500).json({ error: 'Failed to get invoice details' });
  }
});

// ============================================
// INVOICE DOWNLOAD ROUTES
// ============================================

/**
 * GET /api/ksef/invoices/:referenceNumber/download
 * Download invoice from KSeF.
 * Query params:
 *   format=pdf (default) — generates a professional PDF from FA(3) data
 *   format=xml — downloads raw FA(3) XML from KSeF
 */
router.get('/invoices/:referenceNumber/download', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { referenceNumber } = req.params;
    const format = (req.query.format as string) === 'xml' ? 'xml' : 'pdf';

    const invoice = await ksefService.downloadInvoice(userId, referenceNumber, format);

    res.setHeader('Content-Type', invoice.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.fileName}"`);
    return res.send(invoice.content);
  } catch (error) {
    logger.error('Failed to download KSeF invoice', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      referenceNumber: req.params.referenceNumber,
    });
    const statusCode = error instanceof KSeFError ? (error.statusCode || 500) : 500;
    return res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Failed to download invoice' });
  }
});

// ============================================
// BULK SEND ROUTES
// ============================================

/**
 * POST /api/ksef/bulk/send
 * Send multiple invoices to KSeF at once
 */
const BulkSendSchema = z.object({
  invoiceIds: z.array(z.string()).min(1),
  continueOnError: z.boolean().optional(),
});

router.post('/bulk/send', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = BulkSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const result = await ksefService.bulkSendInvoices(userId, parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to bulk send to KSeF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to bulk send to KSeF' });
  }
});

// ============================================
// STATISTICS ROUTES
// ============================================

/**
 * GET /api/ksef/statistics
 * Get KSeF statistics and summary
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const statistics = await ksefService.getStatistics(userId);
    return res.status(200).json(statistics);
  } catch (error) {
    logger.error('Failed to fetch KSeF statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch KSeF statistics' });
  }
});

// ============================================
// CONFIG ROUTES
// ============================================

/**
 * GET /api/ksef/config
 * Get user KSeF configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const config = await ksefService.getConfig(userId);
    return res.status(200).json(config);
  } catch (error) {
    logger.error('Failed to fetch KSeF config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch KSeF config' });
  }
});

/**
 * PATCH /api/ksef/config
 * Update user KSeF configuration
 */
const UpdateConfigSchema = z.object({
  preferredAdapter: z.enum(['wfirma', 'direct']).optional(),
  autoSendEnabled: z.boolean().optional(),
  autoSendOnCreate: z.boolean().optional(),
  environment: z.enum(['test', 'demo', 'production']).optional(),
  notifyOnAccepted: z.boolean().optional(),
  notifyOnRejected: z.boolean().optional(),
  notificationEmail: z.string().email().optional(),
  ksefToken: z.string().optional(),
  ksefNip: z.string().max(10).optional(),
}).strict();

router.patch('/config', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = UpdateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const config = await ksefService.updateConfig(userId, parsed.data);
    return res.status(200).json(config);
  } catch (error) {
    logger.error('Failed to update KSeF config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to update KSeF config' });
  }
});

// ============================================
// CONTRACTOR ROUTES (for invoice autocomplete)
// ============================================

const CreateKSeFContractorSchema = z.object({
  name:    z.string().min(1).max(256),
  nip:     z.string().optional(),
  email:   z.string().email().optional().or(z.literal('')),
  street:  z.string().max(512).optional(),
  city:    z.string().max(512).optional(),
  zip:     z.string().max(10).optional(),
  country: z.string().length(2).default('PL'),
});

/**
 * GET /api/ksef/contractors
 * List all KSeF contractors (wfirma + local + company) for the current user
 */
router.get('/contractors', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const search = req.query.search as string | undefined;
    const contractors = await ksefContractorService.listContractors(userId, search);
    return res.status(200).json(contractors);
  } catch (error) {
    logger.error('Failed to list KSeF contractors', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to list contractors' });
  }
});

/**
 * POST /api/ksef/contractors/sync
 * Trigger background sync of wFirma contractors + company data.
 * Returns 202 immediately; sync runs in background.
 */
router.post('/contractors/sync', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  ksefContractorService.syncFromWFirma(userId).catch(err =>
    logger.error('Background KSeF contractor sync failed', { userId, error: err })
  );
  return res.status(202).json({ message: 'Sync started' });
});

/**
 * POST /api/ksef/contractors
 * Create a local-only contractor
 */
router.post('/contractors', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = CreateKSeFContractorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid contractor data', details: parsed.error.errors });
    }
    const contractor = await ksefContractorService.createLocalContractor(userId, parsed.data);
    return res.status(201).json(contractor);
  } catch (error) {
    logger.error('Failed to create KSeF contractor', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to create contractor' });
  }
});

/**
 * PUT /api/ksef/contractors/:id
 * Update a local-only contractor
 */
router.put('/contractors/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const parsed = CreateKSeFContractorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid contractor data', details: parsed.error.errors });
    }
    const updated = await ksefContractorService.updateLocalContractor(userId, req.params.id, parsed.data);
    return res.status(200).json(updated);
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    logger.error('Failed to update KSeF contractor', { error, userId: req.user?.userId, id: req.params.id });
    return res.status(statusCode).json({ error: error.message ?? 'Failed to update contractor' });
  }
});

/**
 * DELETE /api/ksef/contractors/:id
 * Delete a local-only contractor (wFirma contractors cannot be deleted)
 */
router.delete('/contractors/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await ksefContractorService.deleteLocalContractor(userId, req.params.id);
    return res.status(204).send();
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    logger.error('Failed to delete KSeF contractor', { error, userId: req.user?.userId, id: req.params.id });
    return res.status(statusCode).json({ error: error.message ?? 'Failed to delete contractor' });
  }
});

/**
 * GET /api/ksef/company
 * Get own company entry for seller pre-fill
 */
router.get('/company', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const company = await ksefContractorService.getCompanyEntry(userId);
    if (!company) return res.status(404).json({ error: 'Company not synced yet' });
    return res.status(200).json(company);
  } catch (error) {
    logger.error('Failed to get KSeF company', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to get company' });
  }
});

export default router;
