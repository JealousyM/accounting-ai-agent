/**
 * Invoice PDF Generator — KSeF 2.0 Standard Layout
 * Matches the official "Krajowy System e-Faktur" invoice visual format.
 * Generates a 2-page PDF: page 1 = invoice data, page 2 = QR verification.
 *
 * Font support: uses bundled Arial/system fonts for proper Polish character rendering.
 * Falls back to a chain of system fonts if the bundled font is unavailable.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '../../utils/logger';

// ============================================
// FONT RESOLUTION
// Fonts are in packages/api/fonts/ — accessible as ../../../fonts from dist/services/ksef/
// ============================================

const FONTS_DIR = path.resolve(__dirname, '..', '..', '..', 'fonts');

const FONT_CANDIDATES = {
  regular: [
    path.join(FONTS_DIR, 'Font-Regular.ttf'),
    path.join(FONTS_DIR, 'Roboto-Regular.ttf'),
    path.join(FONTS_DIR, 'DejaVuSans.ttf'),
    'C:\\Windows\\Fonts\\arial.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ],
  bold: [
    path.join(FONTS_DIR, 'Font-Bold.ttf'),
    path.join(FONTS_DIR, 'Roboto-Bold.ttf'),
    path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf'),
    'C:\\Windows\\Fonts\\arialbd.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ],
};

function resolveFont(candidates: string[]): string | null {
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const FONT_REGULAR_PATH = resolveFont(FONT_CANDIDATES.regular);
const FONT_BOLD_PATH = resolveFont(FONT_CANDIDATES.bold);

const FONT_REG = FONT_REGULAR_PATH ? 'FontRegular' : 'Helvetica';
const FONT_BOLD = FONT_BOLD_PATH ? 'FontBold' : 'Helvetica-Bold';

// ============================================
// TYPES
// ============================================

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceType?: string;      // e.g. "Faktura podstawowa"
  issueDate: string;
  sellDate?: string;
  dueDate?: string;
  currency: string;

  seller: {
    name: string;
    nip: string;
    address1?: string;
    address2?: string;
  };

  buyer: {
    name: string;
    nip: string;
    address1?: string;
    address2?: string;
  };

  items: Array<{
    no: number;
    name: string;
    unit?: string;
    quantity: number;
    priceNet: number;
    totalNet: number;
    totalGross: number;
    vatRate: string;
  }>;

  totalNet: number;
  totalVat: number;
  totalGross: number;

  paymentMethod?: string;
  paymentStatus?: string;    // e.g. "Brak zapłaty"
  bankAccount?: string;
  ksefReference?: string;
  ksefQrUrl?: string;        // Full QR verification URL (if available from KSeF)
  appName?: string;
}

// ============================================
// XML PARSER
// ============================================

const RODZAJ_FAKTURY: Record<string, string> = {
  VAT: 'Faktura podstawowa',
  KOREKTA: 'Faktura korygująca',
  ZALICZKOWA: 'Faktura zaliczkowa',
  ROZLICZENIOWA: 'Faktura rozliczeniowa',
  UPROSZCZONA: 'Faktura uproszczona',
};

const PAYMENT_METHODS: Record<string, string> = {
  '1': 'Gotówka', '2': 'Karta', '3': 'Bon', '4': 'Czek',
  '5': 'Kredyt', '6': 'Przelew', '7': 'Płatność mobilna',
};

/**
 * Parse FA(3) XML into structured InvoicePDFData.
 */
export async function parseFA3XML(xmlContent: string): Promise<InvoicePDFData> {
  const result = await parseStringPromise(xmlContent, {
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [],
  });

  const faktura = result.Faktura || result['ns:Faktura'] || result;
  const podmiot1 = faktura.Podmiot1 || {};
  const podmiot2 = faktura.Podmiot2 || {};
  const fa = faktura.Fa || {};

  const sellerDane = podmiot1.DaneIdentyfikacyjne || {};
  const sellerAddr = podmiot1.Adres || {};
  const buyerDane = podmiot2.DaneIdentyfikacyjne || {};
  const buyerAddr = podmiot2.Adres || {};

  const rawItems = fa.FaWiersz;
  const items: InvoicePDFData['items'] = [];
  if (rawItems) {
    const itemList = Array.isArray(rawItems) ? rawItems : [rawItems];
    for (const item of itemList) {
      items.push({
        no: parseInt(item.NrWierszaFa || '0', 10),
        name: item.P_7 || '',
        unit: item.P_8A || 'szt.',
        quantity: parseFloat(item.P_8B || '0'),
        priceNet: parseFloat(item.P_9A || '0'),
        totalNet: parseFloat(item.P_11 || '0'),
        totalGross: parseFloat(item.P_11A || '0'),
        vatRate: item.P_12 || '0',
      });
    }
  }

  let totalNet = 0;
  let totalVat = 0;
  for (const item of items) {
    totalNet += item.totalNet;
    totalVat += item.totalGross - item.totalNet;
  }
  const totalGross = parseFloat(fa.P_15 || '0') || totalNet + totalVat;

  const platnosc = fa.Platnosc || {};
  const termin = platnosc.TerminPlatnosci?.Termin || '';
  const bankNr = platnosc.RachunekBankowy?.NrRB || '';
  const paymentMethodCode = platnosc.FormaPlatnosci || '';
  const rodzaj = fa.RodzajFaktury || 'VAT';

  return {
    invoiceNumber: fa.P_2 || '',
    invoiceType: RODZAJ_FAKTURY[rodzaj] || 'Faktura',
    issueDate: fa.P_1 || '',
    sellDate: fa.P_6 || undefined,
    dueDate: termin || undefined,
    currency: fa.KodWaluty || 'PLN',
    seller: {
      name: sellerDane.Nazwa || '',
      nip: sellerDane.NIP || '',
      address1: sellerAddr.AdresL1 || '',
      address2: sellerAddr.AdresL2 || '',
    },
    buyer: {
      name: buyerDane.Nazwa || '',
      nip: buyerDane.NIP || '',
      address1: buyerAddr.AdresL1 || '',
      address2: buyerAddr.AdresL2 || '',
    },
    items,
    totalNet,
    totalVat,
    totalGross,
    paymentMethod: PAYMENT_METHODS[paymentMethodCode] || paymentMethodCode || undefined,
    bankAccount: bankNr || undefined,
    appName: 'Accounting AI Agent',
  };
}

// ============================================
// PDF LAYOUT CONSTANTS
// ============================================

const MARGIN = 40;

const C = {
  black: '#1a1a1a',
  gray: '#555555',
  lightGray: '#888888',
  border: '#cccccc',
  rowAlt: '#f5f5f5',
  white: '#ffffff',
};

const FS = {
  title: 24,
  invNum: 20,
  section: 11,
  body: 9,
  small: 8,
};

// ============================================
// HELPERS
// ============================================

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace('.', ',');
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    // Handle "YYYY-MM-DD" or ISO string
    const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function rule(doc: InstanceType<typeof PDFDocument>, y: number): void {
  const x2 = doc.page.width - MARGIN;
  doc.moveTo(MARGIN, y).lineTo(x2, y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
}

/**
 * Compute Skrot — SHA-256 of the raw invoice XML bytes, base64url-encoded without padding.
 * KSeF computes this hash from the FA(3) XML as submitted; the same bytes are returned
 * when downloading via GET /invoices/ksef/{ksefNumber}, so we can reconstruct the token.
 */
export function computeXmlSkrot(xmlBuffer: Buffer): string {
  return crypto.createHash('sha256').update(xmlBuffer).digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Build QR content: returns ksefQrUrl if set (proper verification URL),
 * otherwise returns just the KSeF reference for identification.
 */
function buildQrContent(data: InvoicePDFData): string {
  return data.ksefQrUrl || data.ksefReference || data.invoiceNumber;
}

/**
 * Construct the KSeF verification URL from NIP, date and a skrot token.
 * Used in direct-adapter.ts when we have the skrot from UPO.
 */
export function buildKSeFVerificationUrl(ksefReference: string, skrot: string, environment: 'production' | 'test' = 'test'): string | undefined {
  const parts = ksefReference.split('-');
  if (parts.length < 2 || parts[1].length !== 8) return undefined;
  const nip = parts[0];
  const ymd = parts[1];
  const dd = ymd.slice(6, 8);
  const mm = ymd.slice(4, 6);
  const yyyy = ymd.slice(0, 4);
  const host = environment === 'production' ? 'qr' : 'qr-test';
  return `https://${host}.ksef.mf.gov.pl/invoice/${nip}/${dd}-${mm}-${yyyy}/${skrot}`;
}

/**
 * Extract the Skrot (SHA-256 hash) from a KSeF UPO XML buffer.
 * The Skrot is used as the verification token in the QR URL.
 */
export async function extractSkrotFromUPO(upoBuffer: Buffer): Promise<string | undefined> {
  try {
    const xml = upoBuffer.toString('utf-8');
    const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    // Navigate the parsed tree — the Skrot field may be at different depths depending on UPO version
    const root = parsed[Object.keys(parsed)[0]] as any;
    const skrot =
      root?.Skrot ||
      root?.skrot ||
      root?.SkrotZlecenia ||
      root?.Potwierdzenie?.Skrot ||
      root?.PotwierdzenieZlecenia?.Skrot ||
      root?.Dokument?.Skrot;
    return typeof skrot === 'string' && skrot.length > 0 ? skrot : undefined;
  } catch {
    return undefined;
  }
}

// ============================================
// TABLE DRAWING
// ============================================

interface ColDef {
  text: string;
  x: number;
  w: number;
  align?: 'left' | 'right' | 'center';
  wrap?: boolean;  // allow text wrapping (auto-expands row height)
}

/**
 * Draw a table row. Returns the actual row height (may be larger than rowH for wrapped text).
 */
function drawTableRow(
  doc: InstanceType<typeof PDFDocument>,
  cols: ColDef[],
  y: number,
  rowH: number,
  isHeader: boolean,
  isAlt: boolean,
): number {
  const x0 = cols[0].x - 2;
  const totalW = cols[cols.length - 1].x + cols[cols.length - 1].w - x0 + 2;

  // Calculate actual height for any column that may wrap
  let actualH = rowH;
  const fontSize = isHeader ? FS.small : FS.body;
  const font = isHeader ? FONT_BOLD : FONT_REG;
  doc.font(font).fontSize(fontSize);
  for (const col of cols) {
    const shouldWrap = isHeader || col.wrap;
    if (shouldWrap) {
      const h = doc.heightOfString(col.text, { width: col.w - 4 });
      actualH = Math.max(actualH, h + 8);
    }
  }

  // Background
  if (isHeader || isAlt) {
    doc.rect(x0, y, totalW, actualH).fill(C.rowAlt);
  }

  // Outer border
  doc.rect(x0, y, totalW, actualH).strokeColor(C.border).lineWidth(0.5).stroke();

  // Column dividers
  for (let i = 1; i < cols.length; i++) {
    doc.moveTo(cols[i].x - 2, y).lineTo(cols[i].x - 2, y + actualH)
      .strokeColor(C.border).lineWidth(0.5).stroke();
  }

  // Text
  doc.font(font).fontSize(fontSize).fillColor(C.black);

  for (const col of cols) {
    const shouldWrap = isHeader || col.wrap;
    doc.text(col.text, col.x, y + 4, {
      width: col.w - 4,
      align: col.align || 'left',
      lineBreak: shouldWrap,
      height: shouldWrap ? undefined : actualH - 4,
      ellipsis: !shouldWrap,
    });
  }

  return actualH;
}

// ============================================
// MAIN PDF GENERATOR
// ============================================

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  // Pre-generate QR code so the Promise executor can stay synchronous
  let qrBuffer: Buffer | undefined;
  try {
    const qrContent = buildQrContent(data);
    qrBuffer = await QRCode.toBuffer(qrContent, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1,
      type: 'png',
    });
  } catch (qrError) {
    logger.warn('QR code generation failed', { error: qrError });
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        info: {
          Title: `Faktura ${data.invoiceNumber}`,
          Author: data.appName || 'KSeF',
        },
        autoFirstPage: true,
      });

      // Register Unicode fonts
      if (FONT_REGULAR_PATH) doc.registerFont('FontRegular', FONT_REGULAR_PATH);
      if (FONT_BOLD_PATH) doc.registerFont('FontBold', FONT_BOLD_PATH);

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const contentW = pageW - MARGIN * 2;
      const col1X = MARGIN;
      const halfW = (contentW - 20) / 2;
      const col2X = MARGIN + halfW + 20;
      const rowH = 18;

      // ========================================================
      // PAGE 1
      // ========================================================

      // --- HEADER ---
      let y = MARGIN;

      // Left: "Krajowy System e-Faktur"
      doc.font(FONT_REG).fontSize(FS.title).fillColor(C.black)
        .text('Krajowy System ', MARGIN, y, { continued: true })
        .font(FONT_BOLD).text('e-Faktur');

      // Right: invoice number block
      const rightX = col2X;
      const rightW = halfW;

      doc.font(FONT_REG).fontSize(FS.small).fillColor(C.gray)
        .text('Numer Faktury:', rightX, y, { width: rightW, align: 'right', lineBreak: false });

      doc.font(FONT_BOLD).fontSize(FS.invNum).fillColor(C.black)
        .text(data.invoiceNumber, rightX, y + 13, { width: rightW, align: 'right', lineBreak: false });

      doc.font(FONT_REG).fontSize(FS.small).fillColor(C.gray)
        .text(data.invoiceType || 'Faktura podstawowa', rightX, y + 38, { width: rightW, align: 'right', lineBreak: false });

      if (data.ksefReference) {
        doc.font(FONT_BOLD).fontSize(FS.small).fillColor(C.black)
          .text(`Numer KSEF:${data.ksefReference}`, rightX, y + 52, { width: rightW, align: 'right', lineBreak: false });
      }

      y += 76;
      rule(doc, y);
      y += 14;

      // --- SPRZEDAWCA / NABYWCA ---
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Sprzedawca', col1X, y);
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Nabywca', col2X, y);
      y += 16;

      const sellerStartY = y;
      const buyerStartY = y;

      // Seller info
      let sy = sellerStartY;
      doc.font(FONT_REG).fontSize(FS.body).fillColor(C.black);
      doc.text(`NIP: ${data.seller.nip}`, col1X, sy, { lineBreak: false }); sy += 12;
      doc.text(`Nazwa: ${data.seller.name}`, col1X, sy, { width: halfW }); sy += 12;
      sy += 6;
      doc.font(FONT_BOLD).fontSize(FS.body).text('Adres', col1X, sy); sy += 12;
      doc.font(FONT_REG).fontSize(FS.body);
      doc.text(data.seller.address1 || '-', col1X, sy, { lineBreak: false }); sy += 12;
      doc.text(data.seller.address2 || '-', col1X, sy, { lineBreak: false }); sy += 12;
      doc.text('Polska', col1X, sy);

      // Buyer info
      let by = buyerStartY;
      doc.font(FONT_REG).fontSize(FS.body).fillColor(C.black);
      doc.text(`NIP: ${data.buyer.nip}`, col2X, by, { lineBreak: false }); by += 12;
      doc.text(`Nazwa: ${data.buyer.name}`, col2X, by, { width: halfW }); by += 12;
      by += 6;
      doc.font(FONT_BOLD).fontSize(FS.body).text('Adres', col2X, by); by += 12;
      doc.font(FONT_REG).fontSize(FS.body);
      doc.text(data.buyer.address1 || '-', col2X, by, { lineBreak: false }); by += 12;
      doc.text(data.buyer.address2 || '-', col2X, by, { lineBreak: false }); by += 12;
      doc.text('Polska', col2X, by);

      y = Math.max(sy, by) + 20;
      rule(doc, y);
      y += 14;

      // --- SZCZEGÓŁY ---
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Szczegóły', col1X, y);
      y += 16;

      doc.font(FONT_REG).fontSize(FS.body).fillColor(C.black);
      doc.text(
        `Data wystawienia, z zastrzeżeniem art. 106na ust. 1 ustawy: ${formatDate(data.issueDate)}`,
        col1X, y, { width: halfW }
      );
      if (data.sellDate) {
        doc.text(
          `Data dokonania lub zakończenia dostawy towarów lub wykonania usługi: ${formatDate(data.sellDate)}`,
          col2X, y, { width: halfW }
        );
      }
      y += 30;
      rule(doc, y);
      y += 14;

      // --- POZYCJE ---
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Pozycje', col1X, y);
      y += 16;
      doc.font(FONT_REG).fontSize(FS.body).fillColor(C.gray)
        .text(`Faktura wystawiona w cenach netto w walucie ${data.currency}`, col1X, y);
      y += 14;

      // Column widths
      const cLp       = 22;
      const cPriceNet = 58;
      const cQty      = 36;
      const cUnit     = 32;
      const cVatRate  = 48;
      const cNet      = 62;
      const cGross    = 62;
      const cName     = contentW - cLp - cPriceNet - cQty - cUnit - cVatRate - cNet - cGross;

      let tx = MARGIN;
      const xLp       = tx; tx += cLp;
      const xName     = tx; tx += cName;
      const xPriceNet = tx; tx += cPriceNet;
      const xQty      = tx; tx += cQty;
      const xUnit     = tx; tx += cUnit;
      const xVatRate  = tx; tx += cVatRate;
      const xNet      = tx; tx += cNet;
      const xGross    = tx;

      const itemCols = (lp: string, name: string, priceNet: string, qty: string, unit: string, vatRate: string, net: string, gross: string): ColDef[] => [
        { text: lp,       x: xLp,       w: cLp,       align: 'center' },
        { text: name,     x: xName,     w: cName,     align: 'left',   wrap: true },
        { text: priceNet, x: xPriceNet, w: cPriceNet, align: 'right'  },
        { text: qty,      x: xQty,      w: cQty,      align: 'right'  },
        { text: unit,     x: xUnit,     w: cUnit,     align: 'center' },
        { text: vatRate,  x: xVatRate,  w: cVatRate,  align: 'center' },
        { text: net,      x: xNet,      w: cNet,      align: 'right'  },
        { text: gross,    x: xGross,    w: cGross,    align: 'right'  },
      ];

      y += drawTableRow(doc, itemCols('Lp.', 'Nazwa towaru lub usługi', 'Cena jedn. netto', 'Ilość', 'Miara', 'Stawka podatku', 'Wartość sprzedaży netto', 'Wartość sprzedaży brutto'), y, rowH, true, false);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const qtyStr = item.quantity % 1 === 0 ? fmt(item.quantity, 2) : fmt(item.quantity, 3);
        y += drawTableRow(doc, itemCols(
          String(item.no || i + 1),
          item.name,
          fmt(item.priceNet),
          qtyStr,
          item.unit || 'szt.',
          item.vatRate === '-' ? '-' : `${item.vatRate}%`,
          fmt(item.totalNet),
          fmt(item.totalGross),
        ), y, rowH, false, i % 2 === 1);
      }

      y += 8;
      doc.font(FONT_BOLD).fontSize(FS.body).fillColor(C.black)
        .text(`Kwota należności ogółem: ${fmt(data.totalGross)} ${data.currency}`, MARGIN, y, { width: contentW, align: 'right', lineBreak: false });
      y += 18;
      rule(doc, y);
      y += 14;

      // --- PODSUMOWANIE STAWEK PODATKU ---
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Podsumowanie stawek podatku', col1X, y);
      y += 16;

      const vatSummary = new Map<string, { net: number; vat: number; gross: number }>();
      for (const item of data.items) {
        const key = item.vatRate;
        if (!vatSummary.has(key)) vatSummary.set(key, { net: 0, vat: 0, gross: 0 });
        const e = vatSummary.get(key)!;
        e.net += item.totalNet;
        e.vat += item.totalGross - item.totalNet;
        e.gross += item.totalGross;
      }

      const cVLp   = 22;
      const cVNet  = 100;
      const cVVat  = 80;
      const cVGrss = 80;
      const cVRate = contentW - cVLp - cVNet - cVVat - cVGrss;

      let vx = MARGIN;
      const xVLp   = vx; vx += cVLp;
      const xVRate = vx; vx += cVRate;
      const xVNet  = vx; vx += cVNet;
      const xVVat  = vx; vx += cVVat;
      const xVGrss = vx;

      const vatCols = (lp: string, rate: string, net: string, vat: string, gross: string): ColDef[] => [
        { text: lp,    x: xVLp,   w: cVLp,   align: 'center' },
        { text: rate,  x: xVRate, w: cVRate,  align: 'left'   },
        { text: net,   x: xVNet,  w: cVNet,   align: 'right'  },
        { text: vat,   x: xVVat,  w: cVVat,   align: 'right'  },
        { text: gross, x: xVGrss, w: cVGrss,  align: 'right'  },
      ];

      y += drawTableRow(doc, vatCols('Lp.', 'Stawka podatku', 'Kwota netto', 'Kwota podatku', 'Kwota brutto'), y, rowH, true, false);

      let vi = 1;
      for (const [rate, s] of vatSummary) {
        let rateLabel: string;
        if (rate === 'zw') rateLabel = 'zw.';
        else if (rate === 'np') rateLabel = 'np.';
        else {
          const n = parseFloat(rate);
          rateLabel = isNaN(n) ? rate : `${rate}% lub ${Math.max(0, Math.round(n - 1))}%`;
        }
        y += drawTableRow(doc, vatCols(String(vi), rateLabel, fmt(s.net), fmt(s.vat), fmt(s.gross)), y, rowH, false, vi % 2 === 0);
        vi++;
      }

      y += 12;
      rule(doc, y);
      y += 14;

      // --- PŁATNOŚĆ ---
      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black).text('Płatność', col1X, y);
      y += 16;

      const payStartY = y;
      doc.font(FONT_REG).fontSize(FS.body).fillColor(C.black);
      if (data.paymentStatus) {
        doc.text(`Informacja o płatności: ${data.paymentStatus}`, col1X, y, { lineBreak: false });
        y += 12;
      }
      if (data.paymentMethod) {
        doc.text(`Forma płatności: ${data.paymentMethod}`, col1X, y, { lineBreak: false });
        y += 12;
      }
      if (data.bankAccount) {
        doc.text(`Nr rachunku: ${data.bankAccount}`, col1X, y, { lineBreak: false });
        y += 12;
      }

      // Due date table (right side, aligned with payment section)
      if (data.dueDate) {
        const dtW = halfW;
        const hdrH = drawTableRow(doc, [{ text: 'Termin płatności', x: col2X, w: dtW, align: 'left' }], payStartY, rowH, true, false);
        drawTableRow(doc, [{ text: formatDate(data.dueDate), x: col2X, w: dtW, align: 'left' }], payStartY + hdrH, rowH, false, false);
      }

      // ========================================================
      // PAGE 2 — QR Verification
      // ========================================================
      doc.addPage();

      let p2y = MARGIN;

      rule(doc, p2y);
      p2y += 14;

      doc.font(FONT_BOLD).fontSize(FS.section).fillColor(C.black)
        .text('Sprawdź, czy Twoja faktura znajduje się w KSeF!', MARGIN, p2y);
      p2y += 20;

      // Display pre-generated QR code
      if (qrBuffer) {
        const qrSize = 130;
        doc.image(qrBuffer, MARGIN, p2y, { width: qrSize, height: qrSize });

        // KSeF reference below QR
        if (data.ksefReference) {
          doc.font(FONT_REG).fontSize(FS.small).fillColor(C.black)
            .text(data.ksefReference, MARGIN, p2y + qrSize + 4, { width: qrSize, align: 'center' });
        }

        // Right side: description + optional clickable URL
        const qrTextX = MARGIN + qrSize + 20;
        const qrTextW = contentW - qrSize - 20;

        const verifyUrl = data.ksefQrUrl || buildQrContent(data);
        doc.font(FONT_REG).fontSize(FS.body).fillColor(C.black)
          .text(
            'Nie możesz zeskanować kodu z obrazka? Kliknij w link weryfikacyjny i przejdź do weryfikacji faktury!',
            qrTextX, p2y, { width: qrTextW }
          );
        doc.font(FONT_REG).fontSize(FS.body).fillColor('#0066cc')
          .text(verifyUrl, qrTextX, p2y + 32, {
            width: qrTextW,
            link: verifyUrl,
            underline: true,
          });

        p2y += qrSize + 30;
      }

      rule(doc, p2y);
      p2y += 10;

      doc.font(FONT_REG).fontSize(FS.small).fillColor(C.lightGray)
        .text(`Wytworzona w: ${data.appName || 'Accounting AI Agent'}`, MARGIN, p2y);

      doc.end();
    } catch (error) {
      logger.error('Failed to generate invoice PDF', { error });
      reject(error);
    }
  });
}

// ============================================
// METADATA FALLBACK
// ============================================

/**
 * Create InvoicePDFData from DB metadata (simplified, no line items).
 * Used as fallback when XML download from KSeF fails.
 *
 * @param record   - DB KSeFInvoiceStatus record
 * @param userNip  - Authenticated user's NIP from ksefConfig; used as seller on sent invoices
 *                   and as buyer on received invoices (the user's own NIP is not in the record).
 */
export function createPDFDataFromMetadata(
  record: {
    ksefInvoiceNumber?: string | null;
    ksefReferenceNumber?: string | null;
    contractorName?: string | null;
    contractorNip?: string | null;
    totalGross?: any;
    currency?: string | null;
    invoiceDate?: Date | null;
    direction?: string | null;
  },
  userNip?: string,
): InvoicePDFData {
  const isReceived = record.direction === 'received';
  const totalGross = record.totalGross ? Number(record.totalGross) : 0;

  return {
    invoiceNumber: record.ksefInvoiceNumber || record.ksefReferenceNumber || 'N/A',
    invoiceType: 'Faktura podstawowa',
    issueDate: record.invoiceDate ? record.invoiceDate.toISOString().split('T')[0] : '',
    currency: record.currency || 'PLN',
    seller: isReceived
      // Received: contractor IS the sender (seller)
      ? { name: record.contractorName || '', nip: record.contractorNip || '' }
      // Sent: the user IS the seller — use their NIP from ksefConfig
      : { name: '(Dane sprzedawcy z KSeF)', nip: userNip || '' },
    buyer: isReceived
      // Received: the user IS the buyer — use their NIP from ksefConfig
      ? { name: '(Dane nabywcy z KSeF)', nip: userNip || '' }
      // Sent: contractor IS the buyer
      : { name: record.contractorName || '', nip: record.contractorNip || '' },
    items: [{
      no: 1,
      name: '(Szczegóły pozycji niedostępne — pełne dane w KSeF)',
      unit: 'szt.',
      quantity: 1,
      priceNet: totalGross,
      totalNet: totalGross,
      totalGross,
      vatRate: '-',
    }],
    totalNet: totalGross,
    totalVat: 0,
    totalGross,
    ksefReference: record.ksefReferenceNumber || undefined,
    appName: 'Accounting AI Agent',
  };
}
