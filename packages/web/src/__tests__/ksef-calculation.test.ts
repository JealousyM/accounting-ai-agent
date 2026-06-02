import { roundTwo, computeItem, VAT_RATES, ItemRow } from '@/lib/ksef-calculation';

describe('roundTwo', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundTwo(1.234)).toBe(1.23);
    expect(roundTwo(1.235)).toBe(1.24);
    expect(roundTwo(10.999)).toBe(11.00);
    expect(roundTwo(0.001)).toBe(0.00);
  });

  it('handles zero and negative values', () => {
    expect(roundTwo(0)).toBe(0);
    expect(roundTwo(-1.234)).toBe(-1.23);
  });
});

describe('computeItem', () => {
  const makeRow = (overrides: Partial<ItemRow> = {}): ItemRow => ({
    name: 'Test item',
    quantity: '2',
    unit: 'szt.',
    priceNet: '100',
    vatRate: '23',
    ...overrides,
  });

  it('computes 23% VAT correctly', () => {
    const result = computeItem(makeRow({ quantity: '2', priceNet: '100', vatRate: '23' }));
    expect(result.totalNet).toBe(200);
    expect(result.totalVat).toBe(46);
    expect(result.totalGross).toBe(246);
  });

  it('computes 8% VAT correctly', () => {
    const result = computeItem(makeRow({ quantity: '1', priceNet: '100', vatRate: '8' }));
    expect(result.totalNet).toBe(100);
    expect(result.totalVat).toBe(8);
    expect(result.totalGross).toBe(108);
  });

  it('computes 0% VAT (zw) correctly', () => {
    const result = computeItem(makeRow({ quantity: '3', priceNet: '50', vatRate: 'zw' }));
    expect(result.totalNet).toBe(150);
    expect(result.totalVat).toBe(0);
    expect(result.totalGross).toBe(150);
  });

  it('falls back to 0% for unknown VAT rate', () => {
    const result = computeItem(makeRow({ quantity: '1', priceNet: '100', vatRate: 'unknown' }));
    expect(result.totalVat).toBe(0);
    expect(result.totalGross).toBe(result.totalNet);
  });

  it('handles fractional quantities and prices', () => {
    const result = computeItem(makeRow({ quantity: '1.5', priceNet: '33.33', vatRate: '23' }));
    expect(result.totalNet).toBe(roundTwo(1.5 * 33.33));
    expect(result.totalGross).toBe(roundTwo(result.totalNet + result.totalVat));
  });

  it('defaults unit to szt. when empty', () => {
    const result = computeItem(makeRow({ unit: '' }));
    expect(result.unit).toBe('szt.');
  });

  it('passes through non-empty unit', () => {
    const result = computeItem(makeRow({ unit: 'kg' }));
    expect(result.unit).toBe('kg');
  });

  it('treats invalid quantity as 0', () => {
    const result = computeItem(makeRow({ quantity: 'abc' }));
    expect(result.quantity).toBe(0);
    expect(result.totalNet).toBe(0);
  });

  it('treats invalid priceNet as 0', () => {
    const result = computeItem(makeRow({ priceNet: '' }));
    expect(result.priceNet).toBe(0);
    expect(result.totalNet).toBe(0);
  });
});

describe('VAT_RATES', () => {
  it('contains all standard Polish VAT rates', () => {
    const values = VAT_RATES.map(r => r.value);
    expect(values).toContain('23');
    expect(values).toContain('8');
    expect(values).toContain('5');
    expect(values).toContain('zw');
    expect(values).toContain('oo');
  });
});
