import { WFirmaInvoice, WFirmaInvoiceItem, WFirmaRawInvoice } from '../../types/wfirma.types';

/**
 * Map a raw wFirma API invoice object to the typed WFirmaInvoice domain model.
 */
export function mapInvoiceData(inv: WFirmaRawInvoice): WFirmaInvoice {
  const items: WFirmaInvoiceItem[] = [];
  if (inv.invoicecontents) {
    const contentsObj = inv.invoicecontents as Record<string, unknown>;
    let contentsData = (contentsObj as Record<string, unknown>).invoicecontent as
      | WFirmaRawInvoice[]
      | WFirmaRawInvoice
      | undefined;
    if (!contentsData) {
      const arr: WFirmaRawInvoice[] = [];
      for (const key in contentsObj) {
        const entry = contentsObj[key] as Record<string, unknown> | undefined;
        if (!isNaN(Number(key)) && entry?.invoicecontent) {
          arr.push(entry.invoicecontent as WFirmaRawInvoice);
        }
      }
      contentsData = arr;
    }
    if (contentsData && !Array.isArray(contentsData)) {
      contentsData = [contentsData];
    }
    if (contentsData) {
      for (const item of contentsData as WFirmaRawInvoice[]) {
        items.push({
          name: (item.name as string) || '',
          quantity: parseFloat((item.count as string) || '1'),
          unit: (item.unit as string) || 'szt.',
          priceNet: parseFloat((item.price as string) || '0'),
          vatRate: parseFloat((item.vat as string) || '23'),
          totalNet: parseFloat((item.netto as string) || '0'),
          totalVat: parseFloat((item.vat_price as string) || '0'),
          totalGross: parseFloat((item.brutto as string) || '0'),
        });
      }
    }
  }

  let status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled' = 'issued';
  const alreadyPaid = parseFloat(inv.alreadypaid || '0');
  const total = parseFloat(inv.total || inv.brutto || '0');
  const paymentDate = inv.paymentdate ? new Date(inv.paymentdate) : null;
  const now = new Date();

  // wFirma's authoritative paid flag is `paymentstate` ('paid'); the list
  // endpoint does not always populate `alreadypaid`, so deriving "paid" from
  // `alreadypaid >= total` alone left fully-paid invoices stuck in the default
  // 'issued' bucket and inflated the dashboard's "unpaid" count.
  const isPaid =
    inv.paymentstate === 'paid' ||
    inv.paid === '1' ||
    (alreadyPaid >= total && total > 0);

  if (inv.disposaldate_empty === '1' || inv.type === 'proforma') {
    status = 'draft';
  } else if (isPaid) {
    status = 'paid';
  } else if (paymentDate && paymentDate < now) {
    status = 'overdue';
  } else if (inv.sended === '1') {
    status = 'sent';
  }

  const contractorName =
    inv.contractor_name ||
    inv.contractorDetail?.name ||
    inv.contractor_detail?.name ||
    inv.contractors?.contractor?.name ||
    inv.contractors?.['0']?.contractor?.name ||
    '';

  const contractorNip =
    inv.contractor_nip ||
    inv.contractorDetail?.nip ||
    inv.contractor_detail?.nip ||
    inv.contractors?.contractor?.nip ||
    inv.contractors?.['0']?.contractor?.nip;

  const currency = inv.currency || inv.currency_name || inv.currency_code || 'PLN';

  return {
    id: inv.id || '',
    invoiceNumber: inv.fullnumber || inv.number || '',
    issueDate: new Date(inv.date || Date.now()),
    dueDate: paymentDate || new Date(inv.date || Date.now()),
    sellDate: inv.disposaldate ? new Date(inv.disposaldate) : undefined,
    contractorId: inv.contractor || '',
    contractorName,
    contractorNip,
    items,
    total: parseFloat(inv.total || inv.brutto || '0'),
    totalNet: parseFloat(inv.netto || '0'),
    totalVat: parseFloat(inv.tax || '0'),
    currency,
    status,
    paymentMethod: inv.paymentmethod,
    notes: inv.notes,
    createdAt: new Date(inv.created || Date.now()),
    updatedAt: new Date(inv.modified || Date.now()),
    ksefReferenceNumber: inv.ksef_number || inv.ksef_reference_number || undefined,
    ksefStatus: inv.ksef_status || undefined,
  };
}

/**
 * Extract the raw invoice object from a wFirma API response envelope.
 * wFirma uses several different response shapes; this normalises all of them.
 */
export function extractInvoiceFromResponse(responseData: Record<string, unknown>): WFirmaRawInvoice | null {
  const invoices = responseData.invoices as Record<string, unknown> | undefined;

  let invoice: WFirmaRawInvoice | undefined =
    (invoices?.['0'] as Record<string, unknown> | undefined)?.invoice as WFirmaRawInvoice | undefined;

  if (!invoice) invoice = responseData.invoice as WFirmaRawInvoice | undefined;
  if (!invoice && invoices?.invoice) {
    invoice = invoices.invoice as WFirmaRawInvoice;
  }
  if (!invoice && invoices) {
    for (const key in invoices) {
      if (!isNaN(Number(key))) {
        const entry = invoices[key] as Record<string, unknown> | undefined;
        if (entry?.invoice) {
          invoice = entry.invoice as WFirmaRawInvoice;
          break;
        }
      }
    }
  }
  return invoice ?? null;
}
