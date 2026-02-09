/**
 * HR & Payroll Types
 * Types and validation schemas for employee management, contracts, payroll, and absences
 */

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export enum PaymentType {
  BOARD_RESOLUTION = 'board_resolution',
  EMPLOYMENT = 'employment',
  MANDATE_CONTRACT = 'mandate_contract',
  WORK_CONTRACT = 'work_contract',
  DIVIDEND = 'dividend',
}

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  EXPIRED = 'expired',
}

export enum AbsenceType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  MATERNITY = 'maternity',
  UNPAID = 'unpaid',
  OTHER = 'other',
}

// ============================================
// EMPLOYEE SCHEMAS & TYPES
// ============================================

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  pesel: z.string().optional(),
  nip: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default('PL'),
  bankAccount: z.string().optional(),
  taxOffice: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  hiredAt: z.coerce.date().optional(),
  firedAt: z.coerce.date().optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export const EmployeeFilterSchema = z.object({
  userId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(), // Search by name, email, PESEL, NIP
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['firstName', 'lastName', 'hiredAt', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateEmployeeData = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeData = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeFilters = z.infer<typeof EmployeeFilterSchema>;

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  pesel?: string;
  nip?: string;
  dateOfBirth?: Date;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  zip?: string;
  country: string;
  bankAccount?: string;
  taxOffice?: string;
  notes?: string;
  isActive: boolean;
  hiredAt?: Date;
  firedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================
// EMPLOYMENT CONTRACT SCHEMAS & TYPES
// ============================================

export const CreateContractSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.nativeEnum(PaymentType),
  status: z.nativeEnum(ContractStatus).default(ContractStatus.DRAFT),
  position: z.string().optional(),
  department: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  baseSalaryGross: z.number().positive('Base salary must be positive'),
  workHoursPerWeek: z.number().positive().max(168).optional(), // Max 168 hours per week
  costDeductionRate: z.number().min(0).max(100).optional(), // Percentage (0-100)
  notes: z.string().optional(),
});

export const UpdateContractSchema = CreateContractSchema.partial().extend({
  employeeId: z.string().uuid().optional(),
});

export const ContractFilterSchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  type: z.nativeEnum(PaymentType).optional(),
  activeOnly: z.boolean().default(false), // Filter only active contracts
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['startDate', 'endDate', 'createdAt']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateContractData = z.infer<typeof CreateContractSchema>;
export type UpdateContractData = z.infer<typeof UpdateContractSchema>;
export type ContractFilters = z.infer<typeof ContractFilterSchema>;

export interface EmploymentContract {
  id: string;
  employeeId: string;
  type: PaymentType;
  status: ContractStatus;
  position?: string;
  department?: string;
  startDate: Date;
  endDate?: Date;
  baseSalaryGross: number;
  workHoursPerWeek?: number;
  costDeductionRate?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYROLL RECORD SCHEMAS & TYPES
// ============================================

export const CreatePayrollSchema = z.object({
  employeeId: z.string().uuid(),
  contractId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in format YYYY-MM'), // e.g., "2026-02"
  grossAmount: z.number().positive('Gross amount must be positive'),
  bonuses: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),

  // ZUS employee side
  zusEmerytalne: z.number().min(0).default(0),
  zusRentowe: z.number().min(0).default(0),
  zusChorobowe: z.number().min(0).default(0),
  zusZdrowotne: z.number().min(0).default(0),

  // ZUS employer side
  zusEmerytalneEmployer: z.number().min(0).default(0),
  zusRentoweEmployer: z.number().min(0).default(0),
  zusWypadkowe: z.number().min(0).default(0),
  zusFP: z.number().min(0).default(0),
  zusFGSP: z.number().min(0).default(0),

  // Tax
  taxBase: z.number().min(0).default(0),
  incomeTax: z.number().min(0).default(0),

  // Net
  netAmount: z.number().positive('Net amount must be positive'),

  // Total employer cost
  totalEmployerCost: z.number().positive('Total employer cost must be positive'),

  paidAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const UpdatePayrollSchema = CreatePayrollSchema.partial().extend({
  employeeId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const PayrollFilterSchema = z.object({
  employeeId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(), // Specific period
  periodFrom: z.string().regex(/^\d{4}-\d{2}$/).optional(), // Period range
  periodTo: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  isPaid: z.boolean().optional(), // Filter by paid/unpaid status
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['period', 'grossAmount', 'netAmount', 'paidAt', 'createdAt']).default('period'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreatePayrollData = z.infer<typeof CreatePayrollSchema>;
export type UpdatePayrollData = z.infer<typeof UpdatePayrollSchema>;
export type PayrollFilters = z.infer<typeof PayrollFilterSchema>;

export interface PayrollRecord {
  id: string;
  employeeId: string;
  contractId: string;
  period: string;
  grossAmount: number;
  bonuses: number;
  deductions: number;
  zusEmerytalne: number;
  zusRentowe: number;
  zusChorobowe: number;
  zusZdrowotne: number;
  zusEmerytalneEmployer: number;
  zusRentoweEmployer: number;
  zusWypadkowe: number;
  zusFP: number;
  zusFGSP: number;
  taxBase: number;
  incomeTax: number;
  netAmount: number;
  totalEmployerCost: number;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ABSENCE SCHEMAS & TYPES
// ============================================

const CreateAbsenceBaseSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.nativeEnum(AbsenceType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  businessDays: z.number().int().positive('Business days must be positive'),
  notes: z.string().optional(),
  approved: z.boolean().default(false),
});

export const CreateAbsenceSchema = CreateAbsenceBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be after or equal to start date', path: ['endDate'] }
);

export const UpdateAbsenceSchema = CreateAbsenceBaseSchema.partial().extend({
  employeeId: z.string().uuid().optional(),
});

export const AbsenceFilterSchema = z.object({
  employeeId: z.string().uuid().optional(),
  type: z.nativeEnum(AbsenceType).optional(),
  approved: z.boolean().optional(),
  startDateFrom: z.coerce.date().optional(), // Filter absences starting after this date
  startDateTo: z.coerce.date().optional(),
  year: z.number().int().min(2000).optional(), // Filter by year
  month: z.number().int().min(1).max(12).optional(), // Filter by month
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['startDate', 'endDate', 'businessDays', 'createdAt']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAbsenceData = z.infer<typeof CreateAbsenceSchema>;
export type UpdateAbsenceData = z.infer<typeof UpdateAbsenceSchema>;
export type AbsenceFilters = z.infer<typeof AbsenceFilterSchema>;

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  businessDays: number;
  notes?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYROLL CALCULATION TYPES
// ============================================

/**
 * Tax configuration for payroll calculations
 */
export interface TaxConfig {
  // ZUS rates (employee side) - percentage
  zusEmerytalneRate: number; // Pension insurance (9.76%)
  zusRentoweRate: number; // Disability insurance (1.5%)
  zusChoroboweRate: number; // Sickness insurance (2.45%)
  zusZdrowotneRate: number; // Health insurance (9%)

  // ZUS rates (employer side) - percentage
  zusEmerytalneEmployerRate: number; // Pension insurance (9.76%)
  zusRentoweEmployerRate: number; // Disability insurance (6.5%)
  zusWypadkoweRate: number; // Accident insurance (1.67% default)
  zusFPRate: number; // Labour Fund (2.45%)
  zusFGSPRate: number; // Solidarity Fund (0.1%)

  // Tax deduction rates
  taxRate: number; // Income tax rate (12% or 32%)
  taxFreeAmount: number; // Tax-free amount (monthly)
  costDeductionRate: number; // Work cost deduction (20% or 50%)

  // Limits
  zusLimit?: number; // Annual ZUS base limit
  taxThreshold?: number; // Second tax threshold (85,528 PLN)
}

/**
 * Result of payroll calculation
 */
export interface PayrollCalculation {
  grossAmount: number;
  bonuses: number;
  deductions: number;

  // ZUS employee side
  zusEmerytalne: number;
  zusRentowe: number;
  zusChorobowe: number;
  zusZdrowotne: number;
  zusEmployeeTotal: number;

  // ZUS employer side
  zusEmerytalneEmployer: number;
  zusRentoweEmployer: number;
  zusWypadkowe: number;
  zusFP: number;
  zusFGSP: number;
  zusEmployerTotal: number;

  // Tax calculation
  taxBase: number;
  incomeTax: number;

  // Net salary
  netAmount: number;

  // Total employer cost
  totalEmployerCost: number;

  // Breakdown for transparency
  breakdown?: {
    grossAfterBonusesAndDeductions: number;
    zusBase: number;
    taxableIncome: number;
    taxBeforeFreeAmount: number;
  };
}

/**
 * Input for payroll calculation
 */
export interface PayrollCalculationInput {
  grossAmount: number;
  bonuses?: number;
  deductions?: number;
  contractType: PaymentType;
  taxConfig?: Partial<TaxConfig>; // Allow overriding default tax config
}

/**
 * Default Polish tax configuration (2024/2025)
 */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  // ZUS employee side
  zusEmerytalneRate: 9.76,
  zusRentoweRate: 1.5,
  zusChoroboweRate: 2.45,
  zusZdrowotneRate: 9.0,

  // ZUS employer side
  zusEmerytalneEmployerRate: 9.76,
  zusRentoweEmployerRate: 6.5,
  zusWypadkoweRate: 1.67,
  zusFPRate: 2.45,
  zusFGSPRate: 0.1,

  // Tax
  taxRate: 12.0,
  taxFreeAmount: 300, // 300 PLN monthly (3600 PLN annually)
  costDeductionRate: 20.0, // 20% for regular employment

  // Limits (2024)
  zusLimit: 208050, // Annual limit
  taxThreshold: 85528, // Second tax bracket threshold
};

// ============================================
// STATISTICS & REPORTS
// ============================================

export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  contractsByType: Record<PaymentType, number>;
  contractsByStatus: Record<ContractStatus, number>;
}

export interface PayrollStatistics {
  period: string;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalEmployerCost: number;
  totalZUSEmployee: number;
  totalZUSEmployer: number;
  totalIncomeTax: number;
  paidCount: number;
  unpaidCount: number;
}

export interface AbsenceStatistics {
  employeeId?: string;
  year: number;
  month?: number;
  absencesByType: Record<AbsenceType, number>;
  totalBusinessDays: number;
  approvedDays: number;
  pendingDays: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface DeleteResult {
  success: boolean;
  id: string;
  message?: string;
}

export interface BulkDeleteResult {
  success: boolean;
  deletedCount: number;
  ids: string[];
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// ============================================
// EMPLOYEE WITH RELATIONS
// ============================================

export interface EmployeeWithContracts extends Employee {
  contracts: EmploymentContract[];
}

export interface EmployeeWithPayrolls extends Employee {
  payrolls: PayrollRecord[];
}

export interface EmployeeWithAbsences extends Employee {
  absences: Absence[];
}

export interface EmployeeWithAll extends Employee {
  contracts: EmploymentContract[];
  payrolls: PayrollRecord[];
  absences: Absence[];
}

// ============================================
// CONTRACT WITH RELATIONS
// ============================================

export interface ContractWithEmployee extends EmploymentContract {
  employee: Employee;
}

export interface ContractWithPayrolls extends EmploymentContract {
  payrolls: PayrollRecord[];
}

// ============================================
// PAYROLL WITH RELATIONS
// ============================================

export interface PayrollWithEmployee extends PayrollRecord {
  employee: Employee;
}

export interface PayrollWithContract extends PayrollRecord {
  contract: EmploymentContract;
}

export interface PayrollWithAll extends PayrollRecord {
  employee: Employee;
  contract: EmploymentContract;
}

// ============================================
// ABSENCE WITH RELATIONS
// ============================================

export interface AbsenceWithEmployee extends Absence {
  employee: Employee;
}
