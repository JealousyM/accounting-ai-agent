/**
 * HR Tools — barrel re-export
 * All HR tool factories are defined in domain-specific files:
 *   hr-employees.tools.ts  — employee CRUD (5 tools)
 *   hr-contracts.tools.ts  — contract management (3 tools)
 *   hr-payroll.tools.ts    — payroll calculation & records (4 tools)
 *   hr-absences.tools.ts   — absences & summary (3 tools)
 */

export {
  createGetEmployeesTool,
  createGetEmployeeDetailsTool,
  createAddEmployeeTool,
  createUpdateEmployeeTool,
  createDeleteEmployeeTool,
} from './hr-employees.tools';

export {
  createGetHRContractsTool,
  createAddHRContractTool,
  createTerminateHRContractTool,
} from './hr-contracts.tools';

export {
  createCalculatePayrollTool,
  createSavePayrollRecordTool,
  createDeletePayrollRecordTool,
  createGetPayrollRecordsTool,
} from './hr-payroll.tools';

export {
  createAddAbsenceTool,
  createGetAbsencesTool,
  createGetHRSummaryTool,
} from './hr-absences.tools';
