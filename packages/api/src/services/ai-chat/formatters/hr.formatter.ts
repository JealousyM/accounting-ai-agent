/**
 * HR Data Formatter
 * Formats HR data (employees, contracts, payroll, absences) for AI responses (localized)
 */

import { getHRTranslations, Locale } from '../../../i18n';
import {
  Employee,
  EmploymentContract,
  PayrollCalculation,
  PayrollRecord,
  Absence,
  PaymentType,
  ContractStatus,
  AbsenceType,
} from '../../../types/hr.types';

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatContractType(type: PaymentType, locale: Locale): string {
  const t = getHRTranslations(locale);
  const map: Record<PaymentType, string> = {
    [PaymentType.BOARD_RESOLUTION]: t.boardResolution,
    [PaymentType.EMPLOYMENT]: t.employment,
    [PaymentType.MANDATE_CONTRACT]: t.mandateContract,
    [PaymentType.WORK_CONTRACT]: t.workContract,
    [PaymentType.DIVIDEND]: t.dividend,
  };
  return map[type] || type;
}

function formatContractStatus(status: ContractStatus, locale: Locale): string {
  const t = getHRTranslations(locale);
  const map: Record<ContractStatus, string> = {
    [ContractStatus.DRAFT]: t.draft,
    [ContractStatus.ACTIVE]: t.active,
    [ContractStatus.TERMINATED]: t.terminated,
    [ContractStatus.EXPIRED]: t.expired,
  };
  return map[status] || status;
}

function formatAbsenceType(type: AbsenceType, locale: Locale): string {
  const t = getHRTranslations(locale);
  const map: Record<string, string> = {
    [AbsenceType.VACATION]: t.vacation,
    [AbsenceType.SICK_LEAVE]: t.sickLeave,
    [AbsenceType.MATERNITY]: t.maternity,
    [AbsenceType.UNPAID]: t.unpaid,
  };
  return map[type] || type;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

function formatMoney(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' PLN';
}

// ============================================
// EMPLOYEE FORMATTERS
// ============================================

export function formatEmployeesList(employees: Employee[], locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  if (employees.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.employeesTitle} (${employees.length})\n\n`;
  result += t.tableHeaders + '\n';
  result += '|---|----------|----------|----------|----------|----------|--------|\n';

  employees.forEach((emp, i) => {
    const status = emp.isActive ? t.active : t.terminated;
    result += `| ${i + 1} | **${emp.firstName}** | **${emp.lastName}** | ${(emp as any).position || '-'} | ${(emp as any).department || '-'} | - | ${status} |\n`;
  });

  result += `\n> ${t.updateDeleteHint}`;

  return result;
}

export function formatEmployeeDetails(employee: Employee, locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  const addressStr = [employee.street, employee.zip, employee.city]
    .filter(Boolean)
    .join(', ') || '-';

  return `## ${t.employeeTitle}: ${employee.firstName} ${employee.lastName}

| ${t.field} | ${t.value} |
|------|----------|
| **${t.id}** | \`${employee.id}\` |
| **${t.firstName}** | ${employee.firstName} |
| **${t.lastName}** | ${employee.lastName} |
| **${t.pesel}** | ${employee.pesel || '-'} |
| **${t.nip}** | ${employee.nip || '-'} |
| **${t.email}** | ${employee.email || '-'} |
| **${t.phone}** | ${employee.phone || '-'} |
| **${t.address}** | ${addressStr} |
| **${t.bankAccount}** | ${employee.bankAccount || '-'} |
| **${t.taxOffice}** | ${employee.taxOffice || '-'} |
| **${t.hireDate}** | ${formatDate(employee.hiredAt)} |`;
}

export function formatEmployeeCreated(employee: Employee, locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);
  return `## ${t.created}

${formatEmployeeDetails(employee, locale)}

> ${t.createdHint}`;
}

export function formatEmployeeUpdated(employee: Employee, locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);
  return `## ${t.updated}

${formatEmployeeDetails(employee, locale)}

> ${t.updatedHint}`;
}

export function formatEmployeeDeleted(id: string, locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);
  return `## ${t.deleted}

- **${t.id}:** \`${id}\`

> ${t.deletedWarning}`;
}

// ============================================
// CONTRACT FORMATTERS
// ============================================

interface ContractWithEmployeeName extends EmploymentContract {
  employee?: { firstName: string; lastName: string };
}

export function formatContractsList(contracts: ContractWithEmployeeName[], locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  if (contracts.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.contractType} (${contracts.length})\n\n`;
  result += `| # | ${t.firstName} ${t.lastName} | ${t.contractType} | ${t.contractStatus} | ${t.position} | ${t.grossAmount} | ${t.hireDate} |\n`;
  result += '|---|----------|----------|----------|----------|----------|----------|\n';

  contracts.forEach((c, i) => {
    const empName = c.employee
      ? `${c.employee.firstName} ${c.employee.lastName}`
      : '-';
    const type = formatContractType(c.type, locale);
    const status = formatContractStatus(c.status, locale);
    result += `| ${i + 1} | ${empName} | ${type} | ${status} | ${c.position || '-'} | ${formatMoney(c.baseSalaryGross)} | ${formatDate(c.startDate)} - ${formatDate(c.endDate)} |\n`;
  });

  return result;
}

// ============================================
// PAYROLL FORMATTERS
// ============================================

export function formatPayrollCalculation(
  calculation: PayrollCalculation,
  employeeName: string,
  period: string,
  contractType: string,
  locale: Locale = 'pl',
): string {
  const t = getHRTranslations(locale);

  return `## ${t.payrollTitle}: ${employeeName}
**${t.period}:** ${period} | **${t.contractType}:** ${contractType}

| ${t.field} | ${t.value} |
|------|----------|
| **${t.grossAmount}** | **${formatMoney(calculation.grossAmount)}** |
| | |
| **--- ${t.zusTitle} (${t.employeeTitle}) ---** | |
| Emerytalne | ${formatMoney(calculation.zusEmerytalne)} |
| Rentowe | ${formatMoney(calculation.zusRentowe)} |
| Chorobowe | ${formatMoney(calculation.zusChorobowe)} |
| Zdrowotne | ${formatMoney(calculation.zusZdrowotne)} |
| **${t.zusTitle} ${t.employeeTitle}** | **${formatMoney(calculation.zusEmployeeTotal)}** |
| | |
| **--- ${t.zusEmployer} ---** | |
| Emerytalne | ${formatMoney(calculation.zusEmerytalneEmployer)} |
| Rentowe | ${formatMoney(calculation.zusRentoweEmployer)} |
| Wypadkowe | ${formatMoney(calculation.zusWypadkowe)} |
| FP | ${formatMoney(calculation.zusFP)} |
| FGSP | ${formatMoney(calculation.zusFGSP)} |
| **${t.zusEmployer}** | **${formatMoney(calculation.zusEmployerTotal)}** |
| | |
| **--- ${t.taxTitle} ---** | |
| ${t.taxBase} | ${formatMoney(calculation.taxBase)} |
| ${t.incomeTax} | ${formatMoney(calculation.incomeTax)} |
| | |
| **${t.netAmount}** | **${formatMoney(calculation.netAmount)}** |
| **${t.totalEmployerCost}** | **${formatMoney(calculation.totalEmployerCost)}** |`;
}

interface PayrollRecordWithEmployee extends PayrollRecord {
  employee?: { firstName: string; lastName: string };
}

export function formatPayrollRecords(records: PayrollRecordWithEmployee[], locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  if (records.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.payrollTitle} (${records.length})\n\n`;
  result += `| # | ${t.firstName} ${t.lastName} | ${t.period} | ${t.grossAmount} | ${t.netAmount} | Status |\n`;
  result += '|---|----------|----------|----------|----------|--------|\n';

  records.forEach((r, i) => {
    const empName = r.employee
      ? `${r.employee.firstName} ${r.employee.lastName}`
      : '-';
    const paidStatus = r.paidAt ? formatDate(r.paidAt) : t.unpaid;
    result += `| ${i + 1} | ${empName} | ${r.period} | ${formatMoney(r.grossAmount)} | ${formatMoney(r.netAmount)} | ${paidStatus} |\n`;
  });

  return result;
}

// ============================================
// ABSENCE FORMATTERS
// ============================================

interface AbsenceWithEmployee extends Absence {
  employee?: { firstName: string; lastName: string };
}

export function formatAbsencesList(absences: AbsenceWithEmployee[], locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  if (absences.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.absencesTitle} (${absences.length})\n\n`;
  result += `| # | ${t.firstName} ${t.lastName} | ${t.contractType} | ${t.hireDate} | ${t.period} | Status |\n`;
  result += '|---|----------|----------|----------|----------|--------|\n';

  absences.forEach((a, i) => {
    const empName = a.employee
      ? `${a.employee.firstName} ${a.employee.lastName}`
      : '-';
    const type = formatAbsenceType(a.type, locale);
    const dates = `${formatDate(a.startDate)} - ${formatDate(a.endDate)}`;
    const approvedStr = a.approved ? t.active : t.draft;
    result += `| ${i + 1} | ${empName} | ${type} | ${dates} | ${a.businessDays} | ${approvedStr} |\n`;
  });

  return result;
}

// ============================================
// HR SUMMARY FORMATTER
// ============================================

interface HRSummaryData {
  totalEmployees: number;
  activeContractsByType: Record<string, number>;
  totalPayrollFund: number;
}

export function formatHRSummary(summary: HRSummaryData, locale: Locale = 'pl'): string {
  const t = getHRTranslations(locale);

  let result = `## ${t.hrSummary}\n\n`;
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.totalEmployees}** | ${summary.totalEmployees} |\n`;

  // Active contracts by type
  if (summary.activeContractsByType) {
    result += `| | |\n`;
    result += `| **${t.activeContracts}** | |\n`;
    for (const [type, count] of Object.entries(summary.activeContractsByType)) {
      const typeName = formatContractType(type as PaymentType, locale);
      result += `| ${typeName} | ${count} |\n`;
    }
  }

  result += `| | |\n`;
  result += `| **${t.totalPayrollFund}** | ${formatMoney(summary.totalPayrollFund)} |\n`;

  return result;
}
