export type TaxCategory = 'vat' | 'cit' | 'pit' | 'zus' | 'pcc' | 'dividend';
export type TaxUrgency = 'overdue' | 'urgent' | 'soon' | 'normal';

export interface UpcomingTaxDeadline {
  id: string;
  name: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  daysUntil: number;
  urgency: TaxUrgency;
  obligatory: boolean;
  category: TaxCategory;
}

export interface UpcomingTaxDeadlinesResponse {
  success: boolean;
  data: UpcomingTaxDeadline[];
}
