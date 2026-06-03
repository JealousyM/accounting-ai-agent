import { PayrollService } from '../payroll.service';
import { TAX_CONFIG_2026 } from '../tax-config';
import {
  calculateEmploymentPayroll,
  calculateMandatePayroll,
  calculateWorkContractPayroll,
  calculateBoardResolutionPayroll,
  calculateDividendPayroll,
} from '../payroll-calculator';

// ---------------------------------------------------------------------------
// Prisma mock helpers
// ---------------------------------------------------------------------------

function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    employeeId: 'employee-1',
    type: 'employment',
    baseSalaryGross: 5000,
    costDeductionRate: null,
    employee: { id: 'employee-1', userId: 'user-1', deletedAt: null },
    ...overrides,
  };
}

function makePayrollRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    employeeId: 'employee-1',
    contractId: 'contract-1',
    period: '2026-01',
    grossAmount: 5000,
    bonuses: 0,
    deductions: 0,
    zusEmerytalne: 488,
    zusRentowe: 75,
    zusChorobowe: 122.5,
    zusZdrowotne: 0,
    zusEmerytalneEmployer: 488,
    zusRentoweEmployer: 325,
    zusWypadkowe: 83.5,
    zusFP: 122.5,
    zusFGSP: 5,
    taxBase: 0,
    incomeTax: 0,
    netAmount: 0,
    totalEmployerCost: 0,
    paidAt: null,
    ...overrides,
  };
}

function makePrisma(contractData: unknown = null, payrollData: unknown = null) {
  return {
    employmentContract: {
      findFirst: jest.fn().mockResolvedValue(contractData),
    },
    payrollRecord: {
      create: jest.fn().mockResolvedValue({ ...makePayrollRecord(), id: 'new-pr' }),
      findMany: jest.fn().mockResolvedValue([makePayrollRecord()]),
      findFirst: jest.fn().mockResolvedValue(payrollData),
      count: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn().mockResolvedValue({ _sum: { grossAmount: 0 } }),
    },
  } as unknown as import('@prisma/client').PrismaClient;
}

// ---------------------------------------------------------------------------
// calculatePayroll
// ---------------------------------------------------------------------------

describe('PayrollService.calculatePayroll', () => {
  it('throws when contract is not found', async () => {
    const prisma = makePrisma(null);
    const svc = new PayrollService(prisma);
    await expect(svc.calculatePayroll('u1', 'c1', '2026-01')).rejects.toThrow('Contract c1 not found');
  });

  it('delegates to calculateEmploymentPayroll for employment type', async () => {
    const contract = makeContract({ type: 'employment', baseSalaryGross: 5000 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01');
    const expected = calculateEmploymentPayroll(5000, TAX_CONFIG_2026, 0);

    expect(result).toEqual(expected);
    expect(result.gross).toBe(5000);
  });

  it('applies bonuses and deductions to gross', async () => {
    const contract = makeContract({ type: 'employment', baseSalaryGross: 5000 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01', 500, 200);
    const expected = calculateEmploymentPayroll(5300, TAX_CONFIG_2026, 0);

    expect(result).toEqual(expected);
    expect(result.gross).toBe(5300);
  });

  it('delegates to calculateMandatePayroll for mandate_contract type', async () => {
    const contract = makeContract({ type: 'mandate_contract', baseSalaryGross: 3000, costDeductionRate: 20 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01');
    const expected = calculateMandatePayroll(3000, TAX_CONFIG_2026, 0.20);

    expect(result).toEqual(expected);
  });

  it('delegates to calculateWorkContractPayroll for work_contract type', async () => {
    const contract = makeContract({ type: 'work_contract', baseSalaryGross: 2000, costDeductionRate: 50 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01');
    const expected = calculateWorkContractPayroll(2000, TAX_CONFIG_2026, 0.50);

    expect(result).toEqual(expected);
    expect(result.zusEmployee.emerytalne).toBe(0);
    expect(result.zusEmployee.rentowe).toBe(0);
  });

  it('delegates to calculateBoardResolutionPayroll for board_resolution type', async () => {
    const contract = makeContract({ type: 'board_resolution', baseSalaryGross: 10000 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01');
    const expected = calculateBoardResolutionPayroll(10000, TAX_CONFIG_2026);

    expect(result).toEqual(expected);
    expect(result.zusEmployee.emerytalne).toBe(0);
    expect(result.zusEmployee.zdrowotne).toBeGreaterThan(0);
  });

  it('delegates to calculateDividendPayroll for dividend type', async () => {
    const contract = makeContract({ type: 'dividend', baseSalaryGross: 20000 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-01');
    const expected = calculateDividendPayroll(20000, TAX_CONFIG_2026);

    expect(result).toEqual(expected);
    expect(result.zusEmployee.total).toBe(0);
    expect(result.incomeTax).toBeCloseTo(20000 * 0.19, 1);
  });

  it('throws for unsupported contract type', async () => {
    const contract = makeContract({ type: 'unknown_type' as unknown });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    await expect(svc.calculatePayroll('u1', 'contract-1', '2026-01')).rejects.toThrow(
      'Unsupported contract type',
    );
  });

  it('uses ytd income from payroll records for employment ZUS cap', async () => {
    const contract = makeContract({ type: 'employment', baseSalaryGross: 5000 });
    const prisma = makePrisma(contract);

    // Simulate 280,000 PLN YTD income (near the 282,600 cap)
    (prisma.payrollRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { grossAmount: 280000 },
    });

    const svc = new PayrollService(prisma);
    const result = await svc.calculatePayroll('u1', 'contract-1', '2026-03');
    const expected = calculateEmploymentPayroll(5000, TAX_CONFIG_2026, 280000);

    expect(result).toEqual(expected);
    // With 280k YTD out of 282,600 cap, only 2,600 is subject to emerytalne/rentowe
    expect(result.zusEmployee.emerytalne).toBeLessThan(calculateEmploymentPayroll(5000, TAX_CONFIG_2026, 0).zusEmployee.emerytalne);
  });
});

// ---------------------------------------------------------------------------
// savePayrollRecord
// ---------------------------------------------------------------------------

describe('PayrollService.savePayrollRecord', () => {
  it('throws when contract not found', async () => {
    const prisma = makePrisma(null);
    const svc = new PayrollService(prisma);
    await expect(svc.savePayrollRecord('u1', 'c1', '2026-01')).rejects.toThrow('Contract c1 not found');
  });

  it('creates a payroll record with calculated values', async () => {
    const contract = makeContract({ type: 'work_contract', baseSalaryGross: 3000, costDeductionRate: 20 });
    const prisma = makePrisma(contract);
    const svc = new PayrollService(prisma);

    const record = await svc.savePayrollRecord('u1', 'contract-1', '2026-01', 200, 0);

    expect(prisma.payrollRecord.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma.payrollRecord.create as jest.Mock).mock.calls[0][0].data;

    expect(createArg.period).toBe('2026-01');
    expect(createArg.bonuses).toBe(200);
    expect(createArg.deductions).toBe(0);

    const calc = calculateWorkContractPayroll(3200, TAX_CONFIG_2026, 0.20);
    expect(createArg.grossAmount).toBe(calc.gross);
    expect(createArg.netAmount).toBe(calc.net);
    expect(createArg.incomeTax).toBe(calc.incomeTax);
    expect(record.id).toBe('new-pr');
  });
});

// ---------------------------------------------------------------------------
// getPayrollRecords
// ---------------------------------------------------------------------------

describe('PayrollService.getPayrollRecords', () => {
  it('returns paginated records', async () => {
    const prisma = makePrisma();
    const svc = new PayrollService(prisma);

    const result = await svc.getPayrollRecords('u1', { limit: 10, offset: 0 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('applies period range filter when both periodFrom and periodTo are set', async () => {
    const prisma = makePrisma();
    const svc = new PayrollService(prisma);

    await svc.getPayrollRecords('u1', { periodFrom: '2026-01', periodTo: '2026-06' });

    const whereArg = (prisma.payrollRecord.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereArg.period).toEqual({ gte: '2026-01', lte: '2026-06' });
  });

  it('applies exact period filter when only period is set', async () => {
    const prisma = makePrisma();
    const svc = new PayrollService(prisma);

    await svc.getPayrollRecords('u1', { period: '2026-03' });

    const whereArg = (prisma.payrollRecord.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereArg.period).toBe('2026-03');
  });

  it('filters by isPaid=true using paidAt not null', async () => {
    const prisma = makePrisma();
    const svc = new PayrollService(prisma);

    await svc.getPayrollRecords('u1', { isPaid: true });

    const whereArg = (prisma.payrollRecord.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereArg.paidAt).toEqual({ not: null });
  });
});

// ---------------------------------------------------------------------------
// deletePayrollRecord
// ---------------------------------------------------------------------------

describe('PayrollService.deletePayrollRecord', () => {
  it('returns null when record not found', async () => {
    const prisma = makePrisma(undefined, null);
    const svc = new PayrollService(prisma);

    const result = await svc.deletePayrollRecord('u1', 'pr-x');
    expect(result).toBeNull();
    expect(prisma.payrollRecord.delete).not.toHaveBeenCalled();
  });

  it('deletes the record and returns success', async () => {
    const prisma = makePrisma(undefined, makePayrollRecord());
    const svc = new PayrollService(prisma);

    const result = await svc.deletePayrollRecord('u1', 'pr-1');
    expect(prisma.payrollRecord.delete).toHaveBeenCalledWith({ where: { id: 'pr-1' } });
    expect(result).toEqual({ success: true, id: 'pr-1' });
  });
});
