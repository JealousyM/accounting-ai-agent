import { mapInvoiceData } from './invoice.mapper';
import { WFirmaRawInvoice } from '../../types/wfirma.types';

/**
 * Status-derivation regression tests for mapInvoiceData.
 *
 * Focus: a fully-paid invoice must be classified as 'paid' even when the list
 * endpoint omits `alreadypaid` (it returns the authoritative `paymentstate`
 * instead). Previously such invoices fell through to the default 'issued'
 * bucket and inflated the dashboard's "unpaid" count.
 */
describe('mapInvoiceData — status derivation', () => {
  const base: WFirmaRawInvoice = {
    id: '1',
    fullnumber: 'FV/1/2026',
    date: '2026-01-10',
    total: '1230',
    netto: '1000',
    tax: '230',
  };

  it("marks invoice paid when paymentstate is 'paid' even if alreadypaid is missing", () => {
    const result = mapInvoiceData({ ...base, paymentstate: 'paid' });
    expect(result.status).toBe('paid');
  });

  it("marks invoice paid when paid flag is '1'", () => {
    const result = mapInvoiceData({ ...base, paid: '1' });
    expect(result.status).toBe('paid');
  });

  it('marks invoice paid when alreadypaid covers the total (legacy signal)', () => {
    const result = mapInvoiceData({ ...base, alreadypaid: '1230' });
    expect(result.status).toBe('paid');
  });

  it("does not mark paid when paymentstate is 'unpaid' and nothing paid", () => {
    const result = mapInvoiceData({ ...base, paymentstate: 'unpaid', sended: '1' });
    expect(result.status).toBe('sent');
  });

  it('classifies unpaid invoice past its payment date as overdue', () => {
    const result = mapInvoiceData({
      ...base,
      paymentstate: 'unpaid',
      paymentdate: '2026-01-15',
    });
    expect(result.status).toBe('overdue');
  });

  it('defaults to issued for an unpaid, unsent invoice with no past due date', () => {
    const result = mapInvoiceData({ ...base, paymentstate: 'unpaid' });
    expect(result.status).toBe('issued');
  });

  it('classifies proforma as draft regardless of payment', () => {
    const result = mapInvoiceData({ ...base, type: 'proforma', paymentstate: 'paid' });
    expect(result.status).toBe('draft');
  });
});
