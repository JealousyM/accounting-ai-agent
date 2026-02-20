/**
 * KSeF FA(3) XML Generator
 * Generates FA(3) XML documents compliant with the KSeF 2.0 FA(3) schema version 1-0E.
 * Uses string-based XML building (no external dependency required).
 *
 * Schema reference: http://crd.gov.pl/wzor/2023/06/29/12648/
 *
 * Key FA(3) 1-0E requirements:
 * - Root element: <Faktura> with proper namespace and xsi:schemaLocation
 * - Required sections: Naglowek, Podmiot1, Podmiot2, Fa (with FaWiersz), Adnotacje
 * - Optional sections: Platnosc, Stopka
 * - Strict element ordering within each section (XML Schema sequence)
 * - Adnotacje is REQUIRED with P_16 through P_23 and Zwolnienie sub-elements
 * - VAT summary fields (P_13_*, P_14_*) must appear in schema-defined order
 * - RodzajFaktury is required in Fa section
 */

import { FA3InvoiceData } from '../../types/ksef.types';
import { KSeFXMLGenerationError } from './errors';
import { logger } from '../../utils/logger';

/** FA(3) schema namespace and XSD location */
const FA3_NAMESPACE = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
const FA3_SCHEMA_XSD = 'http://crd.gov.pl/wzor/2025/06/25/13775/schemat.xsd';
const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';

export class KSeFXMLGenerator {
  /**
   * Generate FA(3) XML from structured invoice data.
   * Validates required fields before building the XML document.
   */
  generateFA3XML(data: FA3InvoiceData): string {
    logger.info('Generating FA(3) XML', { invoiceNumber: data.invoiceNumber });

    try {
      this.validateInvoiceData(data);

      const xml = this.buildXML(data);

      logger.info('FA(3) XML generated successfully', {
        invoiceNumber: data.invoiceNumber,
        xmlLength: xml.length,
      });

      return xml;
    } catch (error) {
      if (error instanceof KSeFXMLGenerationError) throw error;
      logger.error('Failed to generate FA(3) XML', {
        error,
        invoiceNumber: data.invoiceNumber,
      });
      throw new KSeFXMLGenerationError(
        `Failed to generate FA(3) XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { invoiceNumber: data.invoiceNumber }
      );
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateInvoiceData(data: FA3InvoiceData): void {
    if (!data.invoiceNumber) {
      throw new KSeFXMLGenerationError('Invoice number is required');
    }
    if (!data.sellerNip) {
      throw new KSeFXMLGenerationError('Seller NIP is required');
    }
    if (!data.buyerNip) {
      throw new KSeFXMLGenerationError('Buyer NIP is required');
    }
    if (!data.items || data.items.length === 0) {
      throw new KSeFXMLGenerationError('At least one invoice item is required');
    }
    if (!data.issueDate) {
      throw new KSeFXMLGenerationError('Issue date is required');
    }
    if (!data.sellDate) {
      throw new KSeFXMLGenerationError('Sell date is required');
    }
    if (!data.dueDate) {
      throw new KSeFXMLGenerationError('Due date is required');
    }

    // Validate NIP format (10 digits, no dashes)
    const nipClean = data.sellerNip.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(nipClean)) {
      throw new KSeFXMLGenerationError(
        `Seller NIP must be exactly 10 digits, got: ${data.sellerNip}`
      );
    }
    const buyerNipClean = data.buyerNip.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(buyerNipClean)) {
      throw new KSeFXMLGenerationError(
        `Buyer NIP must be exactly 10 digits, got: ${data.buyerNip}`
      );
    }

    // Validate currency code (ISO 4217, 3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(data.currency)) {
      throw new KSeFXMLGenerationError(
        `Currency must be a 3-letter ISO 4217 code, got: ${data.currency}`
      );
    }

    // Validate each item has required fields
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.name) {
        throw new KSeFXMLGenerationError(`Item ${i + 1}: name is required`);
      }
      if (item.quantity <= 0) {
        throw new KSeFXMLGenerationError(`Item ${i + 1}: quantity must be positive`);
      }
    }
  }

  // ============================================
  // XML BUILDING
  // ============================================

  private buildXML(data: FA3InvoiceData): string {
    /**
     * Format date as xs:date (YYYY-MM-DD).
     */
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    /**
     * Format datetime as xs:dateTime (YYYY-MM-DDTHH:MM:SSZ).
     * FA(3) expects no fractional seconds.
     */
    const formatDateTime = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    };

    /**
     * Escape XML special characters.
     */
    const esc = (s: string): string =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    /**
     * Format a number with exactly 2 decimal places for monetary amounts.
     */
    const money = (n: number): string => n.toFixed(2);

    /**
     * Format quantity - up to 6 decimal places, no trailing zeros beyond 2nd.
     */
    const qty = (n: number): string => {
      const fixed = n.toFixed(6);
      // Remove trailing zeros but keep at least 2 decimal places
      const trimmed = fixed.replace(/0+$/, '');
      const parts = trimmed.split('.');
      if (!parts[1] || parts[1].length < 2) {
        return n.toFixed(2);
      }
      return trimmed;
    };

    /**
     * Clean NIP: remove dashes and spaces.
     */
    const cleanNip = (nip: string): string => nip.replace(/[-\s]/g, '');

    /**
     * Sanitize address line — FA(3) xs:token / TZnakowy512 must not be empty or whitespace-only.
     */
    const addrLine = (s: string, fallback = '-'): string => {
      const trimmed = s?.trim();
      return trimmed || fallback;
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

    // ------------------------------------------
    // Root element with required namespaces
    // ------------------------------------------
    xml += `<Faktura xmlns="${FA3_NAMESPACE}"`;
    xml += ` xmlns:xsi="${XSI_NAMESPACE}"`;
    xml += ` xsi:schemaLocation="${FA3_NAMESPACE} ${FA3_SCHEMA_XSD}">\n`;

    // ------------------------------------------
    // Naglowek (Header) - REQUIRED
    // Schema order: KodFormularza, WariantFormularza, DataWytworzeniaFa, SystemInfo
    // ------------------------------------------
    xml += '  <Naglowek>\n';
    xml += '    <KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>\n';
    xml += '    <WariantFormularza>3</WariantFormularza>\n';
    xml += `    <DataWytworzeniaFa>${formatDateTime(new Date())}</DataWytworzeniaFa>\n`;
    xml += '    <SystemInfo>Accounting AI Agent</SystemInfo>\n';
    xml += '  </Naglowek>\n';

    // ------------------------------------------
    // Podmiot1 (Seller) - REQUIRED
    // Schema: PrefiksPodat662 (optional for non-PL), then DaneIdentyfikacyjne, then Adres
    // DaneIdentyfikacyjne contains: NIP, then Nazwa (for legal entity)
    // Adres contains: KodKraju, AdresL1, AdresL2
    // ------------------------------------------
    xml += '  <Podmiot1>\n';
    xml += '    <DaneIdentyfikacyjne>\n';
    xml += `      <NIP>${esc(cleanNip(data.sellerNip))}</NIP>\n`;
    xml += `      <Nazwa>${esc(data.sellerName)}</Nazwa>\n`;
    xml += '    </DaneIdentyfikacyjne>\n';
    xml += '    <Adres>\n';
    xml += `      <KodKraju>${esc(data.sellerAddress.country || 'PL')}</KodKraju>\n`;
    xml += `      <AdresL1>${esc(addrLine(data.sellerAddress.street))}</AdresL1>\n`;
    xml += `      <AdresL2>${esc(addrLine(`${data.sellerAddress.zip} ${data.sellerAddress.city}`.trim()))}</AdresL2>\n`;
    xml += '    </Adres>\n';
    xml += '  </Podmiot1>\n';

    // ------------------------------------------
    // Podmiot2 (Buyer) - REQUIRED
    // FA(3) schema: DaneIdentyfikacyjne (TPodmiot2: NIP choice + optional Nazwa),
    //   Adres (optional), AdresKoresp (optional), DaneKontaktowe (optional),
    //   NrKlienta (optional), IDNabywcy (optional), JST (REQUIRED), GV (REQUIRED)
    // ------------------------------------------
    xml += '  <Podmiot2>\n';
    xml += '    <DaneIdentyfikacyjne>\n';
    xml += `      <NIP>${esc(cleanNip(data.buyerNip))}</NIP>\n`;
    xml += `      <Nazwa>${esc(data.buyerName)}</Nazwa>\n`;
    xml += '    </DaneIdentyfikacyjne>\n';
    xml += '    <Adres>\n';
    xml += `      <KodKraju>${esc(data.buyerAddress.country || 'PL')}</KodKraju>\n`;
    xml += `      <AdresL1>${esc(addrLine(data.buyerAddress.street))}</AdresL1>\n`;
    xml += `      <AdresL2>${esc(addrLine(`${data.buyerAddress.zip} ${data.buyerAddress.city}`.trim()))}</AdresL2>\n`;
    xml += '    </Adres>\n';
    xml += '    <JST>2</JST>\n';
    xml += '    <GV>2</GV>\n';
    xml += '  </Podmiot2>\n';

    // ------------------------------------------
    // Fa (Invoice Data) - REQUIRED
    // FA(3) XSD sequence (verified from schemat.xsd):
    //   KodWaluty, P_1, P_1M?, P_2, WZ*, P_6/OkresFa?,
    //   P_13_1/P_14_1/P_14_1W? (23%), P_13_2/P_14_2/P_14_2W? (8%),
    //   P_13_3/P_14_3/P_14_3W? (5%), P_13_4/P_14_4/P_14_4W? (taxi),
    //   P_13_5/P_14_5? (special procedure), P_13_6_1? (0% domestic),
    //   P_13_6_2? (0% WDT), P_13_6_3? (0% export), P_13_7? (exempt),
    //   P_13_8? (outside territory), P_13_9? (art.100), P_13_10? (reverse),
    //   P_13_11? (margin), P_15 (total gross REQUIRED), KursWalutyZ?,
    //   Adnotacje (REQUIRED), RodzajFaktury (REQUIRED),
    //   [correction data]?, ..., FaWiersz (0..10000),
    //   Rozliczenie?, Platnosc?, WarunkiTransakcji?, ...
    // ------------------------------------------
    xml += '  <Fa>\n';
    xml += `    <KodWaluty>${esc(data.currency)}</KodWaluty>\n`;
    xml += `    <P_1>${formatDate(data.issueDate)}</P_1>\n`;
    xml += `    <P_2>${esc(data.invoiceNumber)}</P_2>\n`;
    xml += `    <P_6>${formatDate(data.sellDate)}</P_6>\n`;

    // VAT rate totals - MUST be in FA(3) XSD sequence order
    const byRate = this.groupByVatRate(data.items);

    // 23% rate (P_13_1 net, P_14_1 vat)
    if (byRate['23']) {
      xml += `    <P_13_1>${money(byRate['23'].net)}</P_13_1>\n`;
      xml += `    <P_14_1>${money(byRate['23'].vat)}</P_14_1>\n`;
    }

    // 8% rate (P_13_2 net, P_14_2 vat)
    if (byRate['8']) {
      xml += `    <P_13_2>${money(byRate['8'].net)}</P_13_2>\n`;
      xml += `    <P_14_2>${money(byRate['8'].vat)}</P_14_2>\n`;
    }

    // 5% rate (P_13_3 net, P_14_3 vat)
    if (byRate['5']) {
      xml += `    <P_13_3>${money(byRate['5'].net)}</P_13_3>\n`;
      xml += `    <P_14_3>${money(byRate['5'].vat)}</P_14_3>\n`;
    }

    // 0% domestic — covers "0 KR", "0 WDT", "0 EX", and legacy "0" (P_13_6_1)
    const zeroNet = (byRate['0 KR']?.net ?? 0) + (byRate['0 WDT']?.net ?? 0) + (byRate['0 EX']?.net ?? 0) + (byRate['0']?.net ?? 0);
    if (zeroNet > 0) {
      xml += `    <P_13_6_1>${money(zeroNet)}</P_13_6_1>\n`;
    }
    // Exempt from VAT (zw) — P_13_6_2
    if (byRate['zw']) {
      xml += `    <P_13_6_2>${money(byRate['zw'].net)}</P_13_6_2>\n`;
    }
    // Not subject to VAT (np I, np II) — P_13_7
    const npNet = (byRate['np I']?.net ?? 0) + (byRate['np II']?.net ?? 0);
    if (npNet > 0) {
      xml += `    <P_13_7>${money(npNet)}</P_13_7>\n`;
    }

    // P_15 - total GROSS amount (kwota należności ogółem) - REQUIRED
    xml += `    <P_15>${money(data.totalGross)}</P_15>\n`;

    // ------------------------------------------
    // Adnotacje (Annotations) - REQUIRED, inside Fa
    // FA(3) structure: P_16, P_17, P_18, P_18A, Zwolnienie,
    //   NoweSrodkiTransportu (choice: P_22+details or P_22N),
    //   P_23, PMarzy (choice: P_PMarzy+details or P_PMarzyN)
    // ------------------------------------------
    const ann = data.annotations || {};
    const flag = (v?: boolean): string => (v ? '1' : '2');

    xml += '    <Adnotacje>\n';
    xml += `      <P_16>${flag(ann.cashMethod)}</P_16>\n`;
    xml += `      <P_17>${flag(ann.selfBilling)}</P_17>\n`;
    xml += `      <P_18>${flag(ann.reverseCharge)}</P_18>\n`;
    xml += `      <P_18A>${flag(ann.splitPayment)}</P_18A>\n`;
    xml += '      <Zwolnienie>\n';
    xml += '        <P_19N>1</P_19N>\n';
    xml += '      </Zwolnienie>\n';
    xml += '      <NoweSrodkiTransportu>\n';
    xml += '        <P_22N>1</P_22N>\n';
    xml += '      </NoweSrodkiTransportu>\n';
    xml += `      <P_23>${flag(ann.marginSchemeTourism)}</P_23>\n`;
    xml += '      <PMarzy>\n';
    xml += '        <P_PMarzyN>1</P_PMarzyN>\n';
    xml += '      </PMarzy>\n';
    xml += '    </Adnotacje>\n';

    // RodzajFaktury - REQUIRED, after Adnotacje
    xml += `    <RodzajFaktury>${data.invoiceType || 'VAT'}</RodzajFaktury>\n`;

    // ------------------------------------------
    // FaWiersz (Invoice Line Items) - 0..10000, after RodzajFaktury
    // ------------------------------------------
    data.items.forEach((item, idx) => {
      xml += '    <FaWiersz>\n';
      xml += `      <NrWierszaFa>${idx + 1}</NrWierszaFa>\n`;
      xml += `      <P_7>${esc(item.name)}</P_7>\n`;
      if (item.unit) {
        xml += `      <P_8A>${esc(item.unit)}</P_8A>\n`;
      }
      xml += `      <P_8B>${qty(item.quantity)}</P_8B>\n`;
      xml += `      <P_9A>${money(item.priceNet)}</P_9A>\n`;
      xml += `      <P_11>${money(item.totalNet)}</P_11>\n`;
      xml += `      <P_11A>${money(item.totalGross)}</P_11A>\n`;
      xml += `      <P_12>${this.formatVatRate(item.vatRate)}</P_12>\n`;
      xml += '    </FaWiersz>\n';
    });

    // ------------------------------------------
    // Platnosc (Payment) - optional, inside Fa after FaWiersz
    // FA(3): choice(Zaplacono+DataZaplaty | ZnacznikZaplatyCzesciowej+...)?
    //   TerminPlatnosci?, FormaPlatnosci?, RachunekBankowy*
    // ------------------------------------------
    xml += '    <Platnosc>\n';
    if (data.isPaid) {
      xml += '      <Zaplacono>1</Zaplacono>\n';
      xml += `      <DataZaplaty>${formatDate(data.dueDate)}</DataZaplaty>\n`;
    }
    xml += '      <TerminPlatnosci>\n';
    xml += `        <Termin>${formatDate(data.dueDate)}</Termin>\n`;
    xml += '      </TerminPlatnosci>\n';
    xml += `      <FormaPlatnosci>${this.mapPaymentMethod(data.paymentMethod)}</FormaPlatnosci>\n`;
    if (data.paymentAccount) {
      xml += '      <RachunekBankowy>\n';
      xml += `        <NrRB>${esc(this.cleanBankAccount(data.paymentAccount))}</NrRB>\n`;
      xml += '      </RachunekBankowy>\n';
    }
    xml += '    </Platnosc>\n';

    xml += '  </Fa>\n';

    xml += '</Faktura>';

    return xml;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Group invoice items by VAT rate and sum net/vat totals.
   */
  private groupByVatRate(
    items: FA3InvoiceData['items']
  ): Record<string, { net: number; vat: number }> {
    const groups: Record<string, { net: number; vat: number }> = {};

    for (const item of items) {
      const key = String(item.vatRate);
      if (!groups[key]) {
        groups[key] = { net: 0, vat: 0 };
      }
      groups[key].net += item.totalNet;
      groups[key].vat += item.totalVat;
    }

    return groups;
  }

  /**
   * Format VAT rate for P_12 element (TStawkaPodatku enumeration from XSD).
   * Allowed values: "23","22","8","7","5","4","3","0 KR","0 WDT","0 EX","zw","oo","np I","np II"
   * The frontend sends the exact XSD code string (e.g. "23", "0 KR", "zw").
   */
  private formatVatRate(rate: string | number): string {
    const VALID = new Set(['23','22','8','7','5','4','3','0 KR','0 WDT','0 EX','zw','oo','np I','np II']);
    const s = String(rate).trim();
    if (VALID.has(s)) return s;
    // Legacy numeric 0 → most common domestic 0% rate
    if (s === '0') return '0 KR';
    return s;
  }

  /**
   * Map payment method name to KSeF FormaPlatnosci code.
   * FA(3) schema FormaPlatnosciType enumeration:
   *   1 = gotowka (cash)
   *   2 = karta (card)
   *   3 = bon (voucher)
   *   4 = czek (cheque)
   *   5 = kredyt (credit)
   *   6 = przelew (bank transfer)
   *   7 = mobilna (mobile payment)
   * Default: 6 (przelew / bank transfer).
   */
  private mapPaymentMethod(method: string): string {
    const map: Record<string, string> = {
      transfer: '6',
      cash: '1',
      card: '2',
      voucher: '3',
      cheque: '4',
      check: '4',
      credit: '5',
      mobile: '7',
      compensation: '6', // kompensata mapped to transfer as closest match
    };
    return map[method] || '6';
  }

  /**
   * Clean bank account number - remove spaces and dashes.
   * KSeF NrRB expects a clean 26-digit IBAN number (for Polish accounts)
   * or full IBAN with country prefix.
   */
  private cleanBankAccount(account: string): string {
    return account.replace(/[\s-]/g, '');
  }
}
