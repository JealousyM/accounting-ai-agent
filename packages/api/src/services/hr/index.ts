export { HRService } from './hr.service';
export { hrService } from './hr.instance';
export { TaxConfig, TAX_CONFIG_2026, getDefaultTaxConfig } from './tax-config';
export {
  PayrollCalculation,
  calculateEmploymentPayroll,
  calculateMandatePayroll,
  calculateWorkContractPayroll,
  calculateBoardResolutionPayroll,
  calculateDividendPayroll,
} from './payroll-calculator';
export { HRPdfGenerator } from './pdf-generator';
export type { PayslipPdfData, PIT11PdfData, PIT4RPdfData, PIT8ARPdfData } from './pdf-generator';
