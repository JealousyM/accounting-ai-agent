/**
 * Pure payroll calculation engine for Polish employment contracts.
 *
 * Supports five contract / income types:
 *   1. Umowa o prace          (employment contract)
 *   2. Umowa zlecenie         (mandate / civil-law contract)
 *   3. Umowa o dzielo         (work / task contract)
 *   4. Uchwala zarzadu        (board resolution remuneration)
 *   5. Dywidenda              (dividend payout)
 *
 * This module is intentionally free of side effects: no database access,
 * no logging, no I/O. It only depends on {@link TaxConfig} from the
 * sibling tax-config module.
 *
 * All monetary values are in PLN. Intermediate rounding follows the
 * official Polish payroll rules:
 *   - ZUS contributions: rounded to 2 decimal places (grosze)
 *   - Tax base (podstawa opodatkowania): rounded to nearest integer
 *   - Income tax (zaliczka PIT): rounded to nearest integer
 *   - Final net / employer cost: rounded to 2 decimal places
 */

import { TaxConfig } from './tax-config';

// ---------------------------------------------------------------------------
// Result interface
// ---------------------------------------------------------------------------

/** Breakdown of a single payroll calculation. */
export interface PayrollCalculation {
  /** Gross salary / wynagrodzenie brutto (PLN) */
  gross: number;

  /** ZUS contributions paid by the employee / skladki pracownika */
  zusEmployee: {
    /** Skladka emerytalna */
    emerytalne: number;
    /** Skladka rentowa */
    rentowe: number;
    /** Skladka chorobowa */
    chorobowe: number;
    /** Skladka zdrowotna */
    zdrowotne: number;
    /** Suma skladek pracownika */
    total: number;
  };

  /** ZUS contributions paid by the employer / skladki pracodawcy */
  zusEmployer: {
    /** Skladka emerytalna */
    emerytalne: number;
    /** Skladka rentowa */
    rentowe: number;
    /** Skladka wypadkowa */
    wypadkowe: number;
    /** Fundusz Pracy */
    fp: number;
    /** FGSP */
    fgsp: number;
    /** Suma skladek pracodawcy */
    total: number;
  };

  /** Tax base / podstawa opodatkowania (PLN, rounded to integer) */
  taxBase: number;

  /** Income tax advance / zaliczka na podatek dochodowy (PLN, rounded to integer) */
  incomeTax: number;

  /** Net salary / wynagrodzenie netto (PLN) */
  net: number;

  /** Total employer cost / calkowity koszt pracodawcy (PLN) */
  totalEmployerCost: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Round a number to 2 decimal places (grosze).
 *
 * @param n - Value to round
 * @returns Value rounded to 2 decimal places
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate PIT (income tax advance) for a given tax base using the
 * standard two-bracket progressive scale with a monthly reduction.
 *
 * @param taxBase         - Podstawa opodatkowania (already rounded to integer)
 * @param config          - Tax configuration
 * @param applyReduction  - Whether to apply the monthly 300 PLN reduction
 * @returns Income tax advance rounded to nearest integer, floored at 0
 */
function calculatePit(
  taxBase: number,
  config: TaxConfig,
  applyReduction: boolean,
): number {
  const { firstBracketRate, secondBracketRate, bracketThreshold, monthlyReduction } = config.pit;

  let tax: number;

  if (taxBase <= 0) {
    return 0;
  }

  // Monthly bracket threshold approximation: annual / 12
  // In practice the PIT advance is calculated monthly against the annual
  // threshold, but for a single-month calculation we compare the taxBase
  // against the monthly equivalent.
  const monthlyThreshold = bracketThreshold / 12;

  if (taxBase <= monthlyThreshold) {
    tax = taxBase * firstBracketRate;
  } else {
    tax =
      monthlyThreshold * firstBracketRate +
      (taxBase - monthlyThreshold) * secondBracketRate;
  }

  if (applyReduction) {
    tax -= monthlyReduction;
  }

  // Tax advance cannot be negative
  const rounded = Math.round(tax);
  return Math.max(rounded, 0);
}

/**
 * Compute ZUS social contributions (emerytalne + rentowe + chorobowe) for the
 * employee side, respecting the annual contribution cap.
 *
 * The cap (roczna podstawa wymiaru skladek) applies only to emerytalne and
 * rentowe. Once the year-to-date income crosses the limit, those two
 * contributions drop to zero for the excess portion. Chorobowe is not capped.
 *
 * @param gross      - Monthly gross salary
 * @param config     - Tax configuration
 * @param ytdIncome  - Year-to-date income BEFORE this month (default 0)
 * @returns Object with individual contribution amounts and the social total
 *          (emerytalne + rentowe + chorobowe, excluding zdrowotne)
 */
function calculateZusSocialEmployee(
  gross: number,
  config: TaxConfig,
  ytdIncome: number = 0,
): { emerytalne: number; rentowe: number; chorobowe: number; socialTotal: number } {
  const limit = config.zusAnnualLimit;
  const rates = config.zusEmployee;

  // Determine how much of this month's gross is subject to the cap
  let cappedBase: number;

  if (ytdIncome >= limit) {
    // Already exceeded the annual limit - no emerytalne/rentowe this month
    cappedBase = 0;
  } else if (ytdIncome + gross > limit) {
    // Partially within the limit
    cappedBase = limit - ytdIncome;
  } else {
    // Fully within the limit
    cappedBase = gross;
  }

  const emerytalne = round2(cappedBase * rates.emerytalne);
  const rentowe = round2(cappedBase * rates.rentowe);

  // Chorobowe is NOT subject to the annual cap
  const chorobowe = round2(gross * rates.chorobowe);

  const socialTotal = round2(emerytalne + rentowe + chorobowe);

  return { emerytalne, rentowe, chorobowe, socialTotal };
}

/**
 * Compute ZUS social contributions for the employer side, respecting
 * the annual contribution cap on emerytalne + rentowe.
 *
 * @param gross      - Monthly gross salary
 * @param config     - Tax configuration
 * @param ytdIncome  - Year-to-date income BEFORE this month (default 0)
 * @returns Object with individual contribution amounts and total
 */
function calculateZusSocialEmployer(
  gross: number,
  config: TaxConfig,
  ytdIncome: number = 0,
): { emerytalne: number; rentowe: number; wypadkowe: number; fp: number; fgsp: number; total: number } {
  const limit = config.zusAnnualLimit;
  const rates = config.zusEmployer;

  let cappedBase: number;

  if (ytdIncome >= limit) {
    cappedBase = 0;
  } else if (ytdIncome + gross > limit) {
    cappedBase = limit - ytdIncome;
  } else {
    cappedBase = gross;
  }

  const emerytalne = round2(cappedBase * rates.emerytalne);
  const rentowe = round2(cappedBase * rates.rentowe);

  // wypadkowe, FP, FGSP are not subject to the annual cap
  const wypadkowe = round2(gross * rates.wypadkowe);
  const fp = round2(gross * rates.fp);
  const fgsp = round2(gross * rates.fgsp);

  const total = round2(emerytalne + rentowe + wypadkowe + fp + fgsp);

  return { emerytalne, rentowe, wypadkowe, fp, fgsp, total };
}

/**
 * Build a zeroed-out ZUS employee breakdown.
 */
function zeroZusEmployee(): PayrollCalculation['zusEmployee'] {
  return { emerytalne: 0, rentowe: 0, chorobowe: 0, zdrowotne: 0, total: 0 };
}

/**
 * Build a zeroed-out ZUS employer breakdown.
 */
function zeroZusEmployer(): PayrollCalculation['zusEmployer'] {
  return { emerytalne: 0, rentowe: 0, wypadkowe: 0, fp: 0, fgsp: 0, total: 0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate payroll for an employment contract (umowa o prace).
 *
 * Full ZUS social + health contributions apply. PIT is calculated with
 * standard KUP (250 PLN) and the monthly tax-free reduction (300 PLN).
 *
 * Calculation flow:
 *   1. ZUS spoleczne pracownika (emerytalne + rentowe + chorobowe)
 *   2. Zdrowotne = 9% of (gross - ZUS spoleczne)
 *   3. Podstawa opodatkowania = gross - ZUS spoleczne - KUP  (rounded)
 *   4. Zaliczka PIT = podstawa * stawka - 300 PLN           (rounded)
 *   5. Netto = gross - ZUS spoleczne - zdrowotne - PIT
 *   6. Koszt pracodawcy = gross + ZUS pracodawcy
 *
 * @param gross      - Monthly gross salary in PLN
 * @param config     - Tax configuration for the fiscal year
 * @param ytdIncome  - Year-to-date gross income before this month (for ZUS cap)
 * @returns Full payroll breakdown
 */
export function calculateEmploymentPayroll(
  gross: number,
  config: TaxConfig,
  ytdIncome: number = 0,
): PayrollCalculation {
  // 1. ZUS spoleczne - employee
  const social = calculateZusSocialEmployee(gross, config, ytdIncome);

  // 2. Zdrowotne = 9% of (gross - ZUS spoleczne)
  const healthBase = gross - social.socialTotal;
  const zdrowotne = round2(healthBase * config.zusEmployee.zdrowotne);

  // Employee ZUS total (spoleczne + zdrowotne)
  const zusEmployeeTotal = round2(social.socialTotal + zdrowotne);

  // 3. Tax base: gross - ZUS spoleczne - KUP (standard 250 PLN)
  const taxBase = Math.round(gross - social.socialTotal - config.kup.standard);

  // 4. PIT with monthly reduction
  const incomeTax = calculatePit(taxBase, config, true);

  // 5. Net
  const net = round2(gross - social.socialTotal - zdrowotne - incomeTax);

  // 6. Employer ZUS
  const employer = calculateZusSocialEmployer(gross, config, ytdIncome);

  // 7. Total employer cost
  const totalEmployerCost = round2(gross + employer.total);

  return {
    gross,
    zusEmployee: {
      emerytalne: social.emerytalne,
      rentowe: social.rentowe,
      chorobowe: social.chorobowe,
      zdrowotne,
      total: zusEmployeeTotal,
    },
    zusEmployer: employer,
    taxBase,
    incomeTax,
    net,
    totalEmployerCost,
  };
}

/**
 * Calculate payroll for a mandate contract (umowa zlecenie).
 *
 * Same ZUS treatment as employment contract (full social + health).
 * KUP is calculated as a percentage of gross (default 20%, or 50% for
 * copyright / prawa autorskie).
 *
 * Calculation flow:
 *   1. ZUS spoleczne pracownika
 *   2. Zdrowotne = 9% of (gross - ZUS spoleczne)
 *   3. KUP = gross * costRate
 *   4. Podstawa = gross - ZUS spoleczne - KUP  (rounded)
 *   5. Zaliczka PIT = podstawa * stawka - 300  (rounded)
 *   6. Netto = gross - ZUS spoleczne - zdrowotne - PIT
 *   7. Koszt pracodawcy = gross + ZUS pracodawcy
 *
 * @param gross     - Monthly gross amount in PLN
 * @param config    - Tax configuration
 * @param costRate  - KUP rate as decimal (0.20 = 20%, 0.50 = 50% copyright)
 * @returns Full payroll breakdown
 */
export function calculateMandatePayroll(
  gross: number,
  config: TaxConfig,
  costRate: number = 0.20,
): PayrollCalculation {
  // 1. ZUS spoleczne - employee (no YTD tracking for mandate by default)
  const social = calculateZusSocialEmployee(gross, config, 0);

  // 2. Zdrowotne
  const healthBase = gross - social.socialTotal;
  const zdrowotne = round2(healthBase * config.zusEmployee.zdrowotne);

  const zusEmployeeTotal = round2(social.socialTotal + zdrowotne);

  // 3. KUP = gross * costRate (e.g. 20% or 50% for copyright)
  const kup = round2(gross * costRate);

  // 4. Tax base
  const taxBase = Math.round(gross - social.socialTotal - kup);

  // 5. PIT with monthly reduction
  const incomeTax = calculatePit(taxBase, config, true);

  // 6. Net
  const net = round2(gross - social.socialTotal - zdrowotne - incomeTax);

  // 7. Employer ZUS
  const employer = calculateZusSocialEmployer(gross, config, 0);

  const totalEmployerCost = round2(gross + employer.total);

  return {
    gross,
    zusEmployee: {
      emerytalne: social.emerytalne,
      rentowe: social.rentowe,
      chorobowe: social.chorobowe,
      zdrowotne,
      total: zusEmployeeTotal,
    },
    zusEmployer: employer,
    taxBase,
    incomeTax,
    net,
    totalEmployerCost,
  };
}

/**
 * Calculate payroll for a work/task contract (umowa o dzielo).
 *
 * NO ZUS contributions at all (neither social nor health).
 * KUP is calculated as a percentage of gross (default 20%, or 50% for
 * copyright / prawa autorskie).
 *
 * Calculation flow:
 *   1. ZUS = 0 (all components)
 *   2. KUP = gross * costRate
 *   3. Podstawa = gross - KUP  (rounded)
 *   4. Zaliczka PIT = podstawa * stawka - 300  (rounded)
 *   5. Netto = gross - PIT
 *   6. Koszt pracodawcy = gross (no employer ZUS)
 *
 * @param gross     - Contract amount in PLN
 * @param config    - Tax configuration
 * @param costRate  - KUP rate as decimal (0.20 = 20%, 0.50 = 50% copyright)
 * @returns Full payroll breakdown
 */
export function calculateWorkContractPayroll(
  gross: number,
  config: TaxConfig,
  costRate: number = 0.20,
): PayrollCalculation {
  // No ZUS at all
  const kup = round2(gross * costRate);
  const taxBase = Math.round(gross - kup);
  const incomeTax = calculatePit(taxBase, config, true);
  const net = round2(gross - incomeTax);

  return {
    gross,
    zusEmployee: zeroZusEmployee(),
    zusEmployer: zeroZusEmployer(),
    taxBase,
    incomeTax,
    net,
    totalEmployerCost: gross,
  };
}

/**
 * Calculate payroll for board resolution remuneration (uchwala zarzadu).
 *
 * No ZUS social contributions (emerytalne / rentowe / chorobowe = 0).
 * YES zdrowotne = 9% of gross.
 * Standard KUP of 250 PLN applies.
 * PIT with monthly reduction of 300 PLN.
 *
 * Calculation flow:
 *   1. ZUS spoleczne = 0
 *   2. Zdrowotne = 9% of gross
 *   3. Podstawa = gross - KUP (250 PLN)  (rounded)
 *   4. Zaliczka PIT = podstawa * stawka - 300  (rounded)
 *   5. Netto = gross - zdrowotne - PIT
 *   6. Koszt pracodawcy = gross (no employer ZUS)
 *
 * @param gross   - Monthly remuneration in PLN
 * @param config  - Tax configuration
 * @returns Full payroll breakdown
 */
export function calculateBoardResolutionPayroll(
  gross: number,
  config: TaxConfig,
): PayrollCalculation {
  // No ZUS social
  const zdrowotne = round2(gross * config.zusEmployee.zdrowotne);

  // KUP standard 250 PLN
  const taxBase = Math.round(gross - config.kup.standard);

  // PIT with monthly reduction
  const incomeTax = calculatePit(taxBase, config, true);

  // Net
  const net = round2(gross - zdrowotne - incomeTax);

  return {
    gross,
    zusEmployee: {
      emerytalne: 0,
      rentowe: 0,
      chorobowe: 0,
      zdrowotne,
      total: zdrowotne,
    },
    zusEmployer: zeroZusEmployer(),
    taxBase,
    incomeTax,
    net,
    totalEmployerCost: gross,
  };
}

/**
 * Calculate payroll for dividend distribution (dywidenda).
 *
 * No ZUS at all. Flat 19% tax (zryczaltowany podatek dochodowy).
 * No KUP, no deductions, no monthly reduction.
 *
 * Calculation flow:
 *   1. ZUS = 0
 *   2. Podatek = gross * 19%
 *   3. Netto = gross - podatek = gross * 81%
 *   4. Koszt = gross
 *
 * @param gross   - Dividend amount in PLN
 * @param config  - Tax configuration
 * @returns Full payroll breakdown
 */
export function calculateDividendPayroll(
  gross: number,
  config: TaxConfig,
): PayrollCalculation {
  const incomeTax = round2(gross * config.dividendTaxRate);
  const net = round2(gross - incomeTax);

  return {
    gross,
    zusEmployee: zeroZusEmployee(),
    zusEmployer: zeroZusEmployer(),
    taxBase: gross,
    incomeTax,
    net,
    totalEmployerCost: gross,
  };
}
