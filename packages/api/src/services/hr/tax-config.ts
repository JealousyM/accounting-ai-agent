/**
 * Polish payroll tax configuration for ZUS, PIT, KUP, and dividend taxation.
 *
 * All rates are expressed as decimal fractions (e.g. 0.0976 = 9.76%).
 * Monetary thresholds and amounts are in PLN.
 *
 * Terminology:
 *   ZUS           - Zaklad Ubezpieczen Spolecznych (Social Insurance Institution)
 *   emerytalne    - Ubezpieczenie emerytalne (pension insurance)
 *   rentowe       - Ubezpieczenie rentowe (disability insurance)
 *   chorobowe     - Ubezpieczenie chorobowe (sickness insurance)
 *   wypadkowe     - Ubezpieczenie wypadkowe (accident insurance)
 *   zdrowotne     - Ubezpieczenie zdrowotne (health insurance)
 *   FP            - Fundusz Pracy (Labour Fund)
 *   FGSP          - Fundusz Gwarantowanych Swiadczen Pracowniczych
 *                   (Guaranteed Employee Benefits Fund)
 *   PIT           - Podatek dochodowy od osob fizycznych (personal income tax)
 *   KUP           - Koszty uzyskania przychodu (tax-deductible costs)
 *   kwota wolna   - Tax-free amount
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** ZUS contribution rates paid by the employee (ubezpieczony). */
export interface ZusEmployeeRates {
  /** Skladka emerytalna pracownika */
  emerytalne: number;
  /** Skladka rentowa pracownika */
  rentowe: number;
  /** Skladka chorobowa pracownika */
  chorobowe: number;
  /** Skladka zdrowotna */
  zdrowotne: number;
}

/** ZUS contribution rates paid by the employer (platnik). */
export interface ZusEmployerRates {
  /** Skladka emerytalna pracodawcy */
  emerytalne: number;
  /** Skladka rentowa pracodawcy */
  rentowe: number;
  /** Skladka wypadkowa */
  wypadkowe: number;
  /** Fundusz Pracy */
  fp: number;
  /** Fundusz Gwarantowanych Swiadczen Pracowniczych */
  fgsp: number;
}

/** Personal income tax (PIT) rate brackets. */
export interface PitRates {
  /** First bracket rate (12%) - applies up to the threshold */
  firstBracketRate: number;
  /** Second bracket rate (32%) - applies above the threshold */
  secondBracketRate: number;
  /** Annual income threshold between first and second bracket (PLN) */
  bracketThreshold: number;
  /** Annual tax-free amount / kwota wolna od podatku (PLN) */
  kwotaWolna: number;
  /** Monthly PIT reduction / miesieczna ulga podatkowa (PLN) */
  monthlyReduction: number;
}

/** Tax-deductible employment costs (Koszty Uzyskania Przychodu). */
export interface KupRates {
  /** Standard monthly KUP for local employees (PLN) */
  standard: number;
  /** Elevated monthly KUP for commuting employees / zamiejscowe (PLN) */
  commuter: number;
}

/**
 * Complete Polish payroll tax configuration for a given fiscal year.
 *
 * Covers ZUS social & health insurance, PIT income tax, KUP deductible
 * costs, dividend taxation, and the annual ZUS contribution cap.
 */
export interface TaxConfig {
  /** Fiscal year this configuration applies to */
  year: number;

  /** ZUS rates paid by the employee */
  zusEmployee: ZusEmployeeRates;

  /** ZUS rates paid by the employer */
  zusEmployer: ZusEmployerRates;

  /**
   * Annual ZUS contribution limit (roczna podstawa wymiaru skladek).
   * Applies only to emerytalne + rentowe contributions.
   * Once YTD income exceeds this amount, emerytalne and rentowe
   * contributions stop for the remainder of the year.
   */
  zusAnnualLimit: number;

  /** Personal income tax rates and thresholds */
  pit: PitRates;

  /** Tax-deductible employment costs */
  kup: KupRates;

  /** Flat tax rate on dividend income / podatek od dywidend */
  dividendTaxRate: number;
}

// ---------------------------------------------------------------------------
// 2026 Configuration
// ---------------------------------------------------------------------------

/**
 * Polish tax and ZUS configuration for fiscal year 2026.
 *
 * Sources:
 * - ZUS rates: standard statutory rates
 * - PIT: 12%/32% brackets with 120,000 PLN threshold
 * - Kwota wolna: 30,000 PLN (monthly reduction 300 PLN = 30,000 * 12% / 12)
 * - ZUS annual limit: 282,600 PLN (30x projected average monthly salary)
 */
export const TAX_CONFIG_2026: TaxConfig = {
  year: 2026,

  zusEmployee: {
    emerytalne: 0.0976,   // 9.76%
    rentowe: 0.015,       // 1.50%
    chorobowe: 0.0245,    // 2.45%
    zdrowotne: 0.09,      // 9.00%
  },

  zusEmployer: {
    emerytalne: 0.0976,   // 9.76%
    rentowe: 0.065,       // 6.50%
    wypadkowe: 0.0167,    // 1.67%
    fp: 0.0245,           // 2.45%
    fgsp: 0.001,          // 0.10%
  },

  zusAnnualLimit: 282_600, // PLN

  pit: {
    firstBracketRate: 0.12,       // 12%
    secondBracketRate: 0.32,      // 32%
    bracketThreshold: 120_000,    // PLN annual
    kwotaWolna: 30_000,           // PLN annual
    monthlyReduction: 300,        // PLN (kwota wolna * 12% / 12)
  },

  kup: {
    standard: 250,   // PLN/month
    commuter: 300,   // PLN/month (zamiejscowe)
  },

  dividendTaxRate: 0.19, // 19% flat
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the default (current) tax configuration.
 *
 * @returns The 2026 Polish payroll tax configuration
 */
export function getDefaultTaxConfig(): TaxConfig {
  return TAX_CONFIG_2026;
}
