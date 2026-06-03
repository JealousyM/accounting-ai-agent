export { HRService } from './hr.service';
export { hrService } from './hr.instance';
export { EmployeeService } from './employee.service';
export { ContractService } from './contract.service';
export { PayrollService } from './payroll.service';
export { AbsenceService } from './absence.service';
export { TaxConfig, TAX_CONFIG_2026, getDefaultTaxConfig } from './tax-config';
export {
  PayrollCalculation,
  calculateEmploymentPayroll,
  calculateMandatePayroll,
  calculateWorkContractPayroll,
  calculateBoardResolutionPayroll,
  calculateDividendPayroll,
} from './payroll-calculator';
