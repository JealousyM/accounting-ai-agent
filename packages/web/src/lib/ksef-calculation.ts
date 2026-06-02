import type { FA3Item } from './api/ksef';

// FA(3) XSD constraints
export const MAX_ZNAKOWY     = 256;  // TZnakowy
export const MAX_ZNAKOWY_512 = 512;  // TZnakowy512

// TStawkaPodatku enumeration from FA(3) XSD schema
export const VAT_RATES: { value: string; label: string; rate: number }[] = [
  { value: '23',    label: '23%',                    rate: 23 },
  { value: '8',     label: '8%',                     rate: 8  },
  { value: '5',     label: '5%',                     rate: 5  },
  { value: '0 KR',  label: '0% KR (kraj)',            rate: 0  },
  { value: '0 WDT', label: '0% WDT',                 rate: 0  },
  { value: '0 EX',  label: '0% EX (eksport)',         rate: 0  },
  { value: 'zw',    label: 'zw (zwolnione)',           rate: 0  },
  { value: 'oo',    label: 'oo (odw. obciążenie)',     rate: 0  },
  { value: 'np I',  label: 'np I (niepodlegające)',    rate: 0  },
  { value: 'np II', label: 'np II',                   rate: 0  },
];

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'DKK', 'NOK', 'SEK'];

export interface ItemRow {
  name: string;
  quantity: string;
  unit: string;
  priceNet: string;
  vatRate: string;
}

export interface AddressFields {
  street: string;
  city: string;
  zip: string;
  country: string;
}

export const emptyAddress: AddressFields = { street: '', city: '', zip: '', country: 'PL' };
export const emptyItem: ItemRow = { name: '', quantity: '1', unit: 'szt.', priceNet: '0', vatRate: '23' };

export interface KSeFDirectSendFormInitialData {
  buyerName?: string;
  buyerNip?: string;
  buyerAddress?: AddressFields;
  sellerName?: string;
  sellerNip?: string;
  sellerAddress?: AddressFields;
  currency?: string;
  paymentMethod?: string;
  paymentAccount?: string;
  items?: ItemRow[];
}

export function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeItem(row: ItemRow): FA3Item {
  const quantity = parseFloat(row.quantity) || 0;
  const priceNet = parseFloat(row.priceNet) || 0;
  const vatDef   = VAT_RATES.find(r => r.value === row.vatRate);
  const vatPct   = vatDef ? vatDef.rate : 0;
  const totalNet   = roundTwo(quantity * priceNet);
  const totalVat   = roundTwo(totalNet * vatPct / 100);
  const totalGross = roundTwo(totalNet + totalVat);
  return {
    name: row.name,
    quantity,
    unit: row.unit || 'szt.',
    priceNet,
    vatRate: row.vatRate,
    totalNet,
    totalVat,
    totalGross,
  };
}
