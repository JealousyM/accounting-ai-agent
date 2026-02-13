/**
 * HR Routes
 * API endpoints for employee management, contracts, payroll, and absences
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { hrService } from '../services/hr/hr.instance';
import { fileStorageService } from '../services/file-storage.instance';
import { HRPdfGenerator } from '../services/hr/pdf-generator';
import { logger } from '../utils/logger';
import { z } from 'zod';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  CreateContractSchema,
  UpdateContractSchema,
  CreateAbsenceSchema,
  UpdateAbsenceSchema,
  PaymentType,
  ContractStatus,
  AbsenceType,
} from '../types/hr.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// EMPLOYEE ROUTES
// ============================================

/**
 * GET /api/hr/employees
 * List employees with optional filters
 */
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { search, isActive, limit, offset } = req.query;

    const employees = await hrService.getEmployees(userId, {
      search: search as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return res.status(200).json(employees);
  } catch (error) {
    logger.error('Failed to fetch employees', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

/**
 * POST /api/hr/employees
 * Create a new employee
 */
router.post('/employees', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const employee = await hrService.createEmployee(userId, parsed.data);
    return res.status(201).json(employee);
  } catch (error) {
    logger.error('Failed to create employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to create employee' });
  }
});

/**
 * GET /api/hr/employees/:id
 * Get employee by ID
 */
router.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const employee = await hrService.getEmployeeById(userId, id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json(employee);
  } catch (error) {
    logger.error('Failed to fetch employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      employeeId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

/**
 * PUT /api/hr/employees/:id
 * Update an employee
 */
router.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const parsed = UpdateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const employee = await hrService.updateEmployee(userId, id, parsed.data);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json(employee);
  } catch (error) {
    logger.error('Failed to update employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      employeeId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to update employee' });
  }
});

/**
 * DELETE /api/hr/employees/:id
 * Soft delete an employee
 */
router.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const result = await hrService.deleteEmployee(userId, id);
    if (!result) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json({ success: true, id });
  } catch (error) {
    logger.error('Failed to delete employee', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      employeeId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============================================
// CONTRACT ROUTES
// ============================================

/**
 * GET /api/hr/contracts
 * List contracts with optional filters
 */
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { employeeId, status, type } = req.query;

    const contracts = await hrService.getContracts(userId, {
      employeeId: employeeId as string,
      status: status as ContractStatus,
      type: type as PaymentType,
    });

    return res.status(200).json(contracts);
  } catch (error) {
    logger.error('Failed to fetch contracts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

/**
 * POST /api/hr/contracts
 * Create a new contract
 */
router.post('/contracts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const contract = await hrService.createContract(userId, parsed.data);
    return res.status(201).json(contract);
  } catch (error) {
    logger.error('Failed to create contract', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to create contract' });
  }
});

/**
 * PUT /api/hr/contracts/:id
 * Update a contract
 */
router.put('/contracts/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const parsed = UpdateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const contract = await hrService.updateContract(userId, id, parsed.data);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    return res.status(200).json(contract);
  } catch (error) {
    logger.error('Failed to update contract', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      contractId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to update contract' });
  }
});

/**
 * PATCH /api/hr/contracts/:id/terminate
 * Terminate a contract
 */
router.patch('/contracts/:id/terminate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const endDateSchema = z.object({
      endDate: z.coerce.date(),
    });

    const parsed = endDateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const contract = await hrService.terminateContract(userId, id, parsed.data.endDate);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    return res.status(200).json(contract);
  } catch (error) {
    logger.error('Failed to terminate contract', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      contractId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to terminate contract' });
  }
});

// ============================================
// PAYROLL ROUTES
// ============================================

/**
 * GET /api/hr/payroll
 * List payroll records with optional filters
 */
router.get('/payroll', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { employeeId, period, periodFrom, periodTo } = req.query;

    const records = await hrService.getPayrollRecords(userId, {
      employeeId: employeeId as string,
      period: period as string,
      periodFrom: periodFrom as string,
      periodTo: periodTo as string,
    });

    return res.status(200).json(records);
  } catch (error) {
    logger.error('Failed to fetch payroll records', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

/**
 * POST /api/hr/payroll/calculate
 * Calculate payroll without saving
 */
const payrollCalculateSchema = z.object({
  contractId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  bonuses: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});

router.post('/payroll/calculate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = payrollCalculateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const { contractId, period, bonuses, deductions } = parsed.data;
    const calculation = await hrService.calculatePayroll(userId, contractId, period, bonuses, deductions);
    return res.status(200).json(calculation);
  } catch (error) {
    logger.error('Failed to calculate payroll', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

/**
 * POST /api/hr/payroll
 * Calculate and save payroll record
 */
router.post('/payroll', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = payrollCalculateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const { contractId, period, bonuses, deductions } = parsed.data;
    const record = await hrService.savePayrollRecord(userId, contractId, period, bonuses, deductions);
    return res.status(201).json(record);
  } catch (error) {
    logger.error('Failed to create payroll record', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to create payroll record' });
  }
});

/**
 * DELETE /api/hr/payroll/:id
 * Delete a payroll record
 */
router.delete('/payroll/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const result = await hrService.deletePayrollRecord(userId, id);
    if (!result) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    return res.status(200).json({ success: true, id });
  } catch (error) {
    logger.error('Failed to delete payroll record', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      payrollId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to delete payroll record' });
  }
});

// ============================================
// ABSENCE ROUTES
// ============================================

/**
 * GET /api/hr/absences
 * List absences with optional filters
 */
router.get('/absences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { employeeId, type, year } = req.query;

    const absences = await hrService.getAbsences(userId, {
      employeeId: employeeId as string,
      type: type as AbsenceType,
      year: year ? parseInt(year as string, 10) : undefined,
    });

    return res.status(200).json(absences);
  } catch (error) {
    logger.error('Failed to fetch absences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

/**
 * POST /api/hr/absences
 * Create a new absence
 */
router.post('/absences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateAbsenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const absence = await hrService.createAbsence(userId, parsed.data);
    return res.status(201).json(absence);
  } catch (error) {
    logger.error('Failed to create absence', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to create absence' });
  }
});

/**
 * PUT /api/hr/absences/:id
 * Update an absence
 */
router.put('/absences/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const parsed = UpdateAbsenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const absence = await hrService.updateAbsence(userId, id, parsed.data);
    if (!absence) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    return res.status(200).json(absence);
  } catch (error) {
    logger.error('Failed to update absence', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      absenceId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to update absence' });
  }
});

/**
 * DELETE /api/hr/absences/:id
 * Delete an absence
 */
router.delete('/absences/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const result = await hrService.deleteAbsence(userId, id);
    if (!result) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    return res.status(200).json({ success: true, id });
  } catch (error) {
    logger.error('Failed to delete absence', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      absenceId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to delete absence' });
  }
});

// ============================================
// SUMMARY ROUTE
// ============================================

/**
 * GET /api/hr/summary
 * Get HR summary (total employees, active contracts, payroll fund)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const summary = await hrService.getHRSummary(userId);
    return res.status(200).json(summary);
  } catch (error) {
    logger.error('Failed to fetch HR summary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to fetch HR summary' });
  }
});

// ============================================
// PDF DOWNLOAD ROUTES (Phase 2)
// ============================================

const pdfGenerator = new HRPdfGenerator();

/**
 * GET /api/hr/payroll/:id/pdf
 * Download payslip PDF for a specific payroll record
 */
router.get('/payroll/:id/pdf', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    // Get payroll record by ID directly (includes employee and contract)
    const record = await hrService.getPayrollRecordById(userId, id);
    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const employee = record.employee;
    const contract = record.contract;

    // TODO: Get company info from user profile/settings
    const companyName = 'Firma';
    const companyAddress = '';
    const companyNip = '';

    const pdfBuffer = await pdfGenerator.generatePayslip({
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        pesel: (employee as any).pesel,
        nip: (employee as any).nip,
        street: (employee as any).street,
        city: (employee as any).city,
        zip: (employee as any).zip,
      },
      contract: {
        type: contract.type,
        position: (contract as any).position,
        baseSalaryGross: Number((contract as any).baseSalaryGross),
      },
      payroll: {
        period: record.period,
        grossAmount: Number((record as any).grossAmount),
        bonuses: Number((record as any).bonuses),
        deductions: Number((record as any).deductions),
        zusEmerytalne: Number((record as any).zusEmerytalne),
        zusRentowe: Number((record as any).zusRentowe),
        zusChorobowe: Number((record as any).zusChorobowe),
        zusZdrowotne: Number((record as any).zusZdrowotne),
        zusEmerytalneEmployer: Number((record as any).zusEmerytalneEmployer),
        zusRentoweEmployer: Number((record as any).zusRentoweEmployer),
        zusWypadkowe: Number((record as any).zusWypadkowe),
        zusFP: Number((record as any).zusFP),
        zusFGSP: Number((record as any).zusFGSP),
        taxBase: Number((record as any).taxBase),
        incomeTax: Number((record as any).incomeTax),
        netAmount: Number((record as any).netAmount),
        totalEmployerCost: Number((record as any).totalEmployerCost),
      },
      companyName,
      companyAddress,
      companyNip,
    });

    const filename = `lista-plac-${record.period}-${employee.lastName}.pdf`;
    const fileId = await fileStorageService.storeFile(
      filename,
      pdfBuffer.toString('base64'),
      userId,
      'application/pdf',
    );

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/files/download/${fileId}`;

    return res.status(200).json({ downloadUrl, filename, fileId });
  } catch (error) {
    logger.error('Failed to generate payslip PDF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      payrollId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to generate payslip PDF' });
  }
});

/**
 * GET /api/hr/declarations/pit11/:employeeId/:year
 * Download PIT-11 for employee
 */
router.get('/declarations/pit11/:employeeId/:year', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { employeeId, year } = req.params;
    const yearNum = parseInt(year, 10);

    const summary = await hrService.getAnnualPayrollSummary(userId, employeeId, yearNum);
    const emp = summary.employee;
    const byType = summary.incomeByContractType;

    const formatDob = (d: Date | null | undefined): string | undefined => {
      if (!d) return undefined;
      const dt = d instanceof Date ? d : new Date(d);
      const dd = dt.getDate().toString().padStart(2, '0');
      const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
      return `${dd}-${mm}-${dt.getFullYear()}`;
    };

    const empIncome = byType['employment'];
    const workIncome = byType['work_contract'];
    const mandateIncome = byType['mandate_contract'];

    const pdfBuffer = await pdfGenerator.generatePIT11({
      payerNip: '',
      year: yearNum,
      informationNumber: 1,
      taxOfficeName: emp.taxOffice || '',
      purpose: 1,
      payerType: 1,
      payerFullName: 'Firma',
      taxObligationType: 1,
      taxpayerPesel: emp.pesel || undefined,
      lastName: emp.lastName,
      firstName: emp.firstName,
      dateOfBirth: formatDob(emp.dateOfBirth),
      country: emp.country || 'Polska',
      voivodeship: emp.voivodeship || undefined,
      powiat: emp.powiat || undefined,
      gmina: emp.gmina || undefined,
      street: emp.street || undefined,
      houseNumber: emp.houseNumber || undefined,
      apartmentNumber: emp.apartmentNumber || undefined,
      city: emp.city || undefined,
      postalCode: emp.zip || undefined,
      employmentIncome: empIncome ? {
        income: empIncome.grossIncome,
        costs: empIncome.kup,
        netIncome: empIncome.grossIncome - empIncome.zusSocial - empIncome.kup,
        taxExempt: 0,
        taxAdvance: empIncome.taxWithheld,
      } : undefined,
      workContractIncome: workIncome ? {
        income: workIncome.grossIncome,
        costs: workIncome.kup,
        netIncome: workIncome.grossIncome - workIncome.zusSocial - workIncome.kup,
        taxAdvance: workIncome.taxWithheld,
      } : undefined,
      mandateContractIncome: mandateIncome ? {
        income: mandateIncome.grossIncome,
        costs: mandateIncome.kup,
        netIncome: mandateIncome.grossIncome - mandateIncome.zusSocial - mandateIncome.kup,
        taxAdvance: mandateIncome.taxWithheld,
      } : undefined,
      zusSocial: summary.totals.zusSocial,
      zusSocialExempt: 0,
      zusSocialFromExemptIncome: 0,
      healthInsurance: summary.totals.zusHealth,
      pitRAttached: false,
    });

    const filename = `PIT-11-${yearNum}-${summary.employee.lastName}.pdf`;
    const fileId = await fileStorageService.storeFile(
      filename,
      pdfBuffer.toString('base64'),
      userId,
      'application/pdf',
    );

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/files/download/${fileId}`;

    return res.status(200).json({ downloadUrl, filename, fileId });
  } catch (error) {
    logger.error('Failed to generate PIT-11 PDF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to generate PIT-11 PDF' });
  }
});

/**
 * GET /api/hr/declarations/pit4r/:year
 * Download PIT-4R for year
 */
router.get('/declarations/pit4r/:year', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const yearNum = parseInt(req.params.year, 10);

    const taxSummary = await hrService.getAnnualTaxSummary(userId, yearNum);

    // Convert month numbers to Polish names
    const monthNames = [
      'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
    ];
    const monthlyBreakdown = taxSummary.monthlyBreakdown.map(m => ({
      ...m,
      month: monthNames[parseInt(m.month, 10) - 1] || m.month,
    }));

    const pdfBuffer = await pdfGenerator.generatePIT4R({
      year: yearNum,
      monthlyBreakdown,
      grandTotals: taxSummary.grandTotals,
      companyName: 'Firma',
      companyAddress: '',
      companyNip: '',
    });

    const filename = `PIT-4R-${yearNum}.pdf`;
    const fileId = await fileStorageService.storeFile(
      filename,
      pdfBuffer.toString('base64'),
      userId,
      'application/pdf',
    );

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/files/download/${fileId}`;

    return res.status(200).json({ downloadUrl, filename, fileId });
  } catch (error) {
    logger.error('Failed to generate PIT-4R PDF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to generate PIT-4R PDF' });
  }
});

/**
 * GET /api/hr/declarations/pit8ar/:year
 * Download PIT-8AR for year
 */
router.get('/declarations/pit8ar/:year', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const yearNum = parseInt(req.params.year, 10);

    const flatTaxSummary = await hrService.getAnnualFlatTaxSummary(userId, yearNum);

    const monthNames = [
      'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
    ];
    const monthlyBreakdown = flatTaxSummary.monthlyBreakdown.map(m => ({
      ...m,
      month: monthNames[parseInt(m.month, 10) - 1] || m.month,
    }));

    const records = flatTaxSummary.records.map(r => ({
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      incomeType: r.incomeType,
      totalGross: r.totalGross,
      totalTax: r.totalTax,
    }));

    const pdfBuffer = await pdfGenerator.generatePIT8AR({
      year: yearNum,
      records,
      monthlyBreakdown,
      companyName: 'Firma',
      companyAddress: '',
      companyNip: '',
    });

    const filename = `PIT-8AR-${yearNum}.pdf`;
    const fileId = await fileStorageService.storeFile(
      filename,
      pdfBuffer.toString('base64'),
      userId,
      'application/pdf',
    );

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const downloadUrl = `${backendUrl}/api/files/download/${fileId}`;

    return res.status(200).json({ downloadUrl, filename, fileId });
  } catch (error) {
    logger.error('Failed to generate PIT-8AR PDF', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    return res.status(500).json({ error: 'Failed to generate PIT-8AR PDF' });
  }
});

export default router;
