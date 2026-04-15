/**
 * Tax Calendar Types
 * Polish statutory tax payment deadlines
 */

export type TaxCategory = 'vat' | 'cit' | 'pit' | 'zus' | 'pcc' | 'dividend';
export type TaxFrequency = 'monthly' | 'annual';

export interface TaxDeadlineRule {
  name: string;
  day: number;
  category: TaxCategory;
  frequency: TaxFrequency;
  obligatory: boolean;
  /** For annual deadlines: which month (1-12) */
  month?: number;
  descriptionKey: string;
}

export interface TaxDeadline {
  id: string;
  name: string;
  description: string;
  date: Date;
  originalDay: number;
  category: TaxCategory;
  frequency: TaxFrequency;
  obligatory: boolean;
}

export interface TaxDeadlineFilters {
  year: number;
  month?: number;
  category?: TaxCategory;
}
