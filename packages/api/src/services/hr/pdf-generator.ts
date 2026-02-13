/**
 * HR PDF Generator Service
 *
 * Generates Polish HR/payroll PDF documents using PDFKit:
 *   1. Lista Plac (payslip) - monthly payroll slip
 *   2. PIT-11 - annual income certificate for an employee
 *   3. PIT-4R - annual employer tax advance declaration
 *   4. PIT-8AR - annual lump-sum (flat) tax declaration
 *
 * All documents follow Polish accounting conventions:
 *   - A4 page size (595.28 x 841.89 points)
 *   - Polish labels and terminology
 *   - PLN currency formatting with Polish locale ("1 234,56")
 *   - Helvetica font family (built into PDFKit, no external fonts required)
 */

import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// PDF Data Interfaces
// ============================================

/**
 * Data needed to render a monthly payslip (Lista Plac).
 * Decoupled from Prisma models to allow flexible input sources.
 */
export interface PayslipPdfData {
  employee: {
    firstName: string;
    lastName: string;
    pesel?: string | null;
    nip?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
  };
  contract: {
    type: string;
    position?: string | null;
    baseSalaryGross: number;
  };
  payroll: {
    period: string;
    grossAmount: number;
    bonuses: number;
    deductions: number;
    zusEmerytalne: number;
    zusRentowe: number;
    zusChorobowe: number;
    zusZdrowotne: number;
    zusEmerytalneEmployer: number;
    zusRentoweEmployer: number;
    zusWypadkowe: number;
    zusFP: number;
    zusFGSP: number;
    taxBase: number;
    incomeTax: number;
    netAmount: number;
    totalEmployerCost: number;
  };
  companyName: string;
  companyAddress: string;
  companyNip: string;
}

/**
 * Data needed to render a PIT-11 annual income certificate.
 * Fields correspond to official PIT-11(29) form positions (poz.).
 */
export interface PIT11PdfData {
  // Header (poz. 1, 4, 5)
  payerNip: string;
  year: number;
  informationNumber: number;

  // Section A (poz. 6-7)
  taxOfficeName: string;
  purpose: 1 | 2;  // 1=filing, 2=correction

  // Section B (poz. 8-10)
  payerType: 1 | 2;  // 1=entity, 2=individual
  payerFullName: string;

  // Section C (poz. 11-27)
  taxObligationType: 1 | 2;  // 1=resident, 2=non-resident
  taxpayerPesel?: string;
  lastName: string;
  firstName: string;
  dateOfBirth?: string;  // DD-MM-YYYY
  country: string;
  voivodeship?: string;
  powiat?: string;
  gmina?: string;
  street?: string;
  houseNumber?: string;
  apartmentNumber?: string;
  city?: string;
  postalCode?: string;

  // Section D (poz. 28)
  costType?: 1 | 2 | 3 | 4;

  // Section E - income by sources
  employmentIncome?: { income: number; costs: number; netIncome: number; taxExempt: number; taxAdvance: number };
  workContractIncome?: { income: number; costs: number; netIncome: number; taxAdvance: number };
  mandateContractIncome?: { income: number; costs: number; netIncome: number; taxAdvance: number };

  // ZUS (poz. 95-97)
  zusSocial: number;
  zusSocialExempt: number;
  zusSocialFromExemptIncome: number;

  // Section G (poz. 122, 121)
  healthInsurance: number;
  pitRAttached: boolean;
}

/**
 * Data needed to render a PIT-4R annual employer tax declaration.
 */
export interface PIT4RPdfData {
  year: number;
  monthlyBreakdown: Array<{
    month: string;
    employeeCount: number;
    totalTaxAdvance: number;
  }>;
  grandTotals: {
    totalGross: number;
    totalTax: number;
    employeeCount: number;
  };
  companyName: string;
  companyAddress: string;
  companyNip: string;
}

/**
 * Data needed to render a PIT-8AR lump-sum tax declaration.
 */
export interface PIT8ARPdfData {
  year: number;
  records: Array<{
    employeeName: string;
    incomeType: string;
    totalGross: number;
    totalTax: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    totalFlatTax: number;
    recordCount: number;
  }>;
  companyName: string;
  companyAddress: string;
  companyNip: string;
}

// ============================================
// Constants
// ============================================

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2; // A4 width minus margins

const COLORS = {
  text: '#333333',
  headerBg: '#f0f0f0',
  altRowBg: '#e0e0e0',
  border: '#999999',
  accent: '#2c3e50',
  netHighlight: '#1a5276',
} as const;

const FONT_SIZES = {
  title: 14,
  sectionHeader: 12,
  body: 10,
  small: 9,
  netAmount: 13,
} as const;

const ROW_HEIGHT = 22;
const HEADER_ROW_HEIGHT = 24;

// ============================================
// HRPdfGenerator
// ============================================

export class HRPdfGenerator {
  // ------------------------------------------
  // Public methods
  // ------------------------------------------

  /**
   * Generate a Lista Plac (monthly payslip) PDF.
   *
   * Layout: header, employee info, salary table, ZUS employee table,
   * tax table, net amount highlight, employer cost table, signature block.
   */
  async generatePayslip(data: PayslipPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = PAGE_MARGIN;

      // --- Header ---
      doc.font('Helvetica-Bold').fontSize(FONT_SIZES.title).fillColor(COLORS.accent);
      doc.text(`LISTA PLAC za okres ${data.payroll.period}`, PAGE_MARGIN, y, {
        align: 'center',
        width: CONTENT_WIDTH,
      });
      y += 22;

      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      doc.text(data.companyName, PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 14;
      doc.text(`NIP: ${data.companyNip}`, PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 14;
      doc.text(data.companyAddress, PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 22;

      // --- Separator ---
      doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).stroke();
      y += 12;

      // --- Employee info ---
      y = this.drawSectionTitle(doc, 'DANE PRACOWNIKA', y);

      const employeeName = `${data.employee.firstName} ${data.employee.lastName}`;
      const employeeInfoRows: string[][] = [
        ['Imie i nazwisko', employeeName],
      ];
      if (data.employee.pesel) {
        employeeInfoRows.push(['PESEL', data.employee.pesel]);
      }
      if (data.employee.nip) {
        employeeInfoRows.push(['NIP', data.employee.nip]);
      }
      if (data.contract.position) {
        employeeInfoRows.push(['Stanowisko', data.contract.position]);
      }
      employeeInfoRows.push(['Rodzaj umowy', this.getContractTypeName(data.contract.type)]);
      employeeInfoRows.push(['Wynagrodzenie podstawowe brutto', `${this.formatPLN(data.contract.baseSalaryGross)} PLN`]);

      if (data.employee.street || data.employee.city) {
        const addressParts: string[] = [];
        if (data.employee.street) addressParts.push(data.employee.street);
        if (data.employee.zip && data.employee.city) {
          addressParts.push(`${data.employee.zip} ${data.employee.city}`);
        } else if (data.employee.city) {
          addressParts.push(data.employee.city);
        }
        employeeInfoRows.push(['Adres', addressParts.join(', ')]);
      }

      y = this.drawTable(doc, y, ['Pole', 'Wartosc'], employeeInfoRows, [200, CONTENT_WIDTH - 200]);
      y += 10;

      // --- Salary table ---
      y = this.drawSectionTitle(doc, 'WYNAGRODZENIE', y);

      const salaryRows: string[][] = [
        ['Wynagrodzenie brutto', `${this.formatPLN(data.payroll.grossAmount)} PLN`],
        ['Premie i dodatki', `${this.formatPLN(data.payroll.bonuses)} PLN`],
        ['Potracenia', `${this.formatPLN(data.payroll.deductions)} PLN`],
      ];

      y = this.drawTable(doc, y, ['Skladnik', 'Kwota'], salaryRows, [300, CONTENT_WIDTH - 300], {
        rightAlignLast: true,
      });
      y += 10;

      // --- ZUS Employee table ---
      y = this.drawSectionTitle(doc, 'SKLADKI ZUS (pracownik)', y);

      const zusEmployeeTotal =
        data.payroll.zusEmerytalne +
        data.payroll.zusRentowe +
        data.payroll.zusChorobowe +
        data.payroll.zusZdrowotne;

      const zusEmployeeRows: string[][] = [
        ['Emerytalne (9,76%)', `${this.formatPLN(data.payroll.zusEmerytalne)} PLN`],
        ['Rentowe (1,50%)', `${this.formatPLN(data.payroll.zusRentowe)} PLN`],
        ['Chorobowe (2,45%)', `${this.formatPLN(data.payroll.zusChorobowe)} PLN`],
        ['Zdrowotne (9,00%)', `${this.formatPLN(data.payroll.zusZdrowotne)} PLN`],
        ['RAZEM skladki pracownika', `${this.formatPLN(zusEmployeeTotal)} PLN`],
      ];

      y = this.drawTable(doc, y, ['Skladka', 'Kwota'], zusEmployeeRows, [300, CONTENT_WIDTH - 300], {
        rightAlignLast: true,
      });
      y += 10;

      // --- Tax table ---
      y = this.drawSectionTitle(doc, 'PODATEK DOCHODOWY', y);

      const taxRows: string[][] = [
        ['Podstawa opodatkowania', `${this.formatPLN(data.payroll.taxBase)} PLN`],
        ['Zaliczka na podatek PIT', `${this.formatPLN(data.payroll.incomeTax)} PLN`],
      ];

      y = this.drawTable(doc, y, ['Pozycja', 'Kwota'], taxRows, [300, CONTENT_WIDTH - 300], {
        rightAlignLast: true,
      });
      y += 14;

      // --- Net amount highlight ---
      const netBoxHeight = 32;
      doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, netBoxHeight).fillAndStroke(COLORS.headerBg, COLORS.border);
      doc.font('Helvetica-Bold').fontSize(FONT_SIZES.netAmount).fillColor(COLORS.netHighlight);
      doc.text(
        `WYNAGRODZENIE NETTO: ${this.formatPLN(data.payroll.netAmount)} PLN`,
        PAGE_MARGIN + 10,
        y + 9,
        { width: CONTENT_WIDTH - 20, align: 'center' },
      );
      y += netBoxHeight + 14;

      // --- Employer cost table ---
      y = this.drawSectionTitle(doc, 'KOSZT PRACODAWCY', y);

      const zusEmployerTotal =
        data.payroll.zusEmerytalneEmployer +
        data.payroll.zusRentoweEmployer +
        data.payroll.zusWypadkowe +
        data.payroll.zusFP +
        data.payroll.zusFGSP;

      const employerRows: string[][] = [
        ['Emerytalne pracodawca (9,76%)', `${this.formatPLN(data.payroll.zusEmerytalneEmployer)} PLN`],
        ['Rentowe pracodawca (6,50%)', `${this.formatPLN(data.payroll.zusRentoweEmployer)} PLN`],
        ['Wypadkowe (1,67%)', `${this.formatPLN(data.payroll.zusWypadkowe)} PLN`],
        ['Fundusz Pracy (2,45%)', `${this.formatPLN(data.payroll.zusFP)} PLN`],
        ['FGSP (0,10%)', `${this.formatPLN(data.payroll.zusFGSP)} PLN`],
        ['ZUS pracodawca razem', `${this.formatPLN(zusEmployerTotal)} PLN`],
        ['Calkowity koszt pracodawcy', `${this.formatPLN(data.payroll.totalEmployerCost)} PLN`],
      ];

      y = this.drawTable(doc, y, ['Pozycja', 'Kwota'], employerRows, [300, CONTENT_WIDTH - 300], {
        rightAlignLast: true,
      });
      y += 20;

      // --- Signature block ---
      this.drawSignatureBlock(doc, y);

      doc.end();
    });
  }

  /**
   * Generate a PIT-11 annual income certificate PDF.
   *
   * Loads the official PIT-11 template from resources/PIT-11.pdf and fills
   * in form fields by drawing text at specific coordinates on each page.
   * Coordinates are based on the official PIT-11(29) form layout.
   */
  async generatePIT11(data: PIT11PdfData): Promise<Buffer> {
    // Load template
    const templatePath = path.join(__dirname, '..', '..', 'resources', 'PIT-11.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFLibDocument.load(templateBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1];
    const page3 = pages[2];

    const fontSize = 12;
    const checkMarkSize = 11;

    // Helper to format PLN amount for form fields (comma decimal, no thousands separator)
    const formatAmount = (amount: number): string => {
      return amount.toFixed(2).replace('.', ',');
    };

    const formatWholeAmount = (amount: number): string => {
      return Math.round(amount).toString();
    };

    // Helper to draw text on a page (left-aligned)
    const drawText = (page: typeof page1, text: string, x: number, y: number, size = fontSize) => {
      if (text) {
        page.drawText(text, { x, y, size, font });
      }
    };

    // Helper to draw text right-aligned to a given right edge
    const drawTextRight = (page: typeof page1, text: string, rightEdge: number, y: number, size = fontSize) => {
      if (text) {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: rightEdge - textWidth, y, size, font });
      }
    };

    // Helper to draw checkbox mark
    const drawCheckMark = (page: typeof page1, x: number, y: number) => {
      page.drawText('X', { x, y, size: checkMarkSize, font });
    };

    // Section E column right edges (page 2) — measured from reference PDF
    const COL_A = 274;   // Przychód (income)
    const COL_B = 344;   // Koszty (costs)
    const COL_C = 413;   // Dochód (net income)
    const COL_D = 482;   // Dochód zwolniony (tax exempt)
    const COL_E = 556;   // Zaliczka (tax advance)
    const COL_ZUS = 555; // ZUS contributions column
    const COL_P3 = 559;  // Page 3 amounts column

    // ===== PAGE 1 =====
    // Coordinates from reference: "Deklaracja PIT11 2025 Peraviortkin Mikhail.pdf"

    // poz.1: Payer NIP (top of form)
    drawText(page1, data.payerNip, 34, 777.6);

    // poz.4: Year
    drawText(page1, data.year.toString(), 261.8, 694.7);

    // poz.5: Nr informacji
    drawText(page1, data.informationNumber.toString(), 474.8, 694.7);

    // Section A
    // poz.6: Tax office name
    drawText(page1, data.taxOfficeName, 54.7, 499.3);

    // poz.7: Purpose (filing or correction)
    if (data.purpose === 1) drawCheckMark(page1, 210.9, 480.6);
    if (data.purpose === 2) drawCheckMark(page1, 323, 480.6);

    // Section B
    // poz.8: Payer type
    if (data.payerType === 1) drawCheckMark(page1, 132.8, 426.7);
    if (data.payerType === 2) drawCheckMark(page1, 386, 426.7);

    // poz.9: Full company name (entity) / poz.10: Individual name
    drawText(page1, data.payerFullName, 54.7, 400);

    // Section C — Taxpayer (employee) data
    // poz.11: Tax obligation type
    if (data.taxObligationType === 1) drawCheckMark(page1, 97.3, 322.6);
    if (data.taxObligationType === 2) drawCheckMark(page1, 350, 322.6);

    // poz.12: PESEL
    if (data.taxpayerPesel) drawText(page1, data.taxpayerPesel, 54.7, 297.7);

    // poz.16: Last name
    drawText(page1, data.lastName, 54.7, 238.5);

    // poz.17: First name
    drawText(page1, data.firstName, 355.9, 238.5);

    // poz.18: Date of birth
    if (data.dateOfBirth) drawText(page1, data.dateOfBirth, 54.7, 214.8);

    // poz.19: Country
    drawText(page1, data.country, 245.2, 214.8);

    // poz.20: Voivodeship
    if (data.voivodeship) drawText(page1, data.voivodeship, 430.4, 214.8);

    // poz.21: Powiat
    if (data.powiat) drawText(page1, data.powiat, 54.7, 191.2);

    // poz.22: Gmina
    if (data.gmina) drawText(page1, data.gmina, 355.9, 191.2);

    // poz.23: Street
    if (data.street) drawText(page1, data.street, 54.7, 166.9);

    // poz.24: House number
    if (data.houseNumber) drawText(page1, data.houseNumber, 430.4, 166.9);

    // poz.25: Apartment number
    if (data.apartmentNumber) drawText(page1, data.apartmentNumber, 501.4, 166.9);

    // poz.26: City
    if (data.city) drawText(page1, data.city, 54.7, 142.1);

    // poz.27: Postal code
    if (data.postalCode) drawText(page1, data.postalCode, 430.4, 142.1);

    // ===== PAGE 2 =====
    // Section E: Income table (values are right-aligned within columns)

    // Row 1 (poz.29-33): Employment income — split across two sub-rows
    if (data.employmentIncome) {
      const ei = data.employmentIncome;
      // Upper sub-row (y=674.6): income and costs
      drawTextRight(page2, formatAmount(ei.income), COL_A, 674.6);
      drawTextRight(page2, formatAmount(ei.costs), COL_B, 674.6);
      // Lower sub-row (y=644.4): net income, tax exempt, tax advance
      drawTextRight(page2, formatAmount(ei.netIncome), COL_C, 644.4);
      drawTextRight(page2, formatAmount(ei.taxExempt), COL_D, 644.4);
      drawTextRight(page2, formatWholeAmount(ei.taxAdvance), COL_E, 644.4);
    }

    // Row 5 (poz.54-57): Work contract (umowa o dzielo / art.13 pkt 2,4-9)
    if (data.workContractIncome) {
      const wc = data.workContractIncome;
      drawTextRight(page2, formatAmount(wc.income), COL_A, 451.5);
      drawTextRight(page2, formatAmount(wc.costs), COL_B, 451.5);
      drawTextRight(page2, formatAmount(wc.netIncome), COL_C, 451.5);
      drawTextRight(page2, formatWholeAmount(wc.taxAdvance), COL_E, 451.5);
    }

    // Row 6 (poz.58-61): Mandate contract (umowa zlecenie)
    if (data.mandateContractIncome) {
      const mc = data.mandateContractIncome;
      drawTextRight(page2, formatAmount(mc.income), COL_A, 415.4);
      drawTextRight(page2, formatAmount(mc.costs), COL_B, 415.4);
      drawTextRight(page2, formatAmount(mc.netIncome), COL_C, 415.4);
      drawTextRight(page2, formatWholeAmount(mc.taxAdvance), COL_E, 415.4);
    }

    // ZUS social contributions (right-aligned, right edge ~555)
    // poz.95
    drawTextRight(page2, formatAmount(data.zusSocial), COL_ZUS, 122.5);
    // poz.96
    drawTextRight(page2, formatAmount(data.zusSocialExempt), COL_ZUS, 95.9);
    // poz.97
    drawTextRight(page2, formatAmount(data.zusSocialFromExemptIncome), COL_ZUS, 72.2);

    // ===== PAGE 3 =====
    // poz.121: PIT-R attached checkbox
    if (data.pitRAttached) {
      drawCheckMark(page3, 252, 229.1);  // "tak"
    } else {
      drawCheckMark(page3, 336.9, 229.1);  // "nie"
    }

    // poz.122: Health insurance (right-aligned)
    drawTextRight(page3, formatAmount(data.healthInsurance), COL_P3, 206);

    // Save
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Generate a PIT-4R annual employer tax declaration PDF.
   *
   * Layout: header with year, Section A (employer), Section B (monthly
   * advances table with 12 rows), Section C (annual totals), signature block.
   */
  async generatePIT4R(data: PIT4RPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = PAGE_MARGIN;

      // --- Header ---
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.accent);
      doc.text('PIT-4R', PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 26;

      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      doc.text(
        'Deklaracja roczna o zaliczkach na podatek dochodowy',
        PAGE_MARGIN,
        y,
        { align: 'center', width: CONTENT_WIDTH },
      );
      y += 16;

      doc.font('Helvetica-Bold').fontSize(FONT_SIZES.sectionHeader).fillColor(COLORS.accent);
      doc.text(`za rok ${data.year}`, PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 24;

      doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).stroke();
      y += 14;

      // --- Section A: Dane platnika ---
      y = this.drawSectionTitle(doc, 'A. DANE PLATNIKA', y);

      const employerRows: string[][] = [
        ['NIP', data.companyNip],
        ['Nazwa', data.companyName],
        ['Adres', data.companyAddress],
      ];

      y = this.drawTable(doc, y, ['Pole', 'Wartosc'], employerRows, [150, CONTENT_WIDTH - 150]);
      y += 14;

      // --- Section B: Zaliczki miesieczne ---
      y = this.drawSectionTitle(doc, 'B. ZALICZKI MIESIECZNE NA PODATEK DOCHODOWY', y);

      const monthlyHeaders = ['Miesiac', 'Liczba podatnikow', 'Zaliczka na podatek'];
      const colWidths = [180, 160, CONTENT_WIDTH - 340];

      const monthlyRows: string[][] = data.monthlyBreakdown.map((m) => [
        m.month,
        m.employeeCount.toString(),
        `${this.formatPLN(m.totalTaxAdvance)} PLN`,
      ]);

      // Ensure we have 12 rows (pad if needed)
      const allMonths = [
        'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
      ];
      if (monthlyRows.length < 12) {
        const existingMonths = new Set(data.monthlyBreakdown.map((m) => m.month));
        for (const month of allMonths) {
          if (!existingMonths.has(month) && monthlyRows.length < 12) {
            monthlyRows.push([month, '0', '0,00 PLN']);
          }
        }
        // Sort by standard month order
        monthlyRows.sort((a, b) => allMonths.indexOf(a[0]) - allMonths.indexOf(b[0]));
      }

      y = this.drawTable(doc, y, monthlyHeaders, monthlyRows, colWidths, { rightAlignLast: true });

      // Check if we need a new page for the summary
      if (y + 120 > 841.89 - PAGE_MARGIN) {
        doc.addPage({ size: 'A4', margin: PAGE_MARGIN });
        y = PAGE_MARGIN;
      } else {
        y += 14;
      }

      // --- Section C: Podsumowanie roczne ---
      y = this.drawSectionTitle(doc, 'C. PODSUMOWANIE ROCZNE', y);

      const summaryRows: string[][] = [
        ['Laczna liczba podatnikow', data.grandTotals.employeeCount.toString()],
        ['Laczny przychod brutto', `${this.formatPLN(data.grandTotals.totalGross)} PLN`],
        ['Laczna zaliczka na podatek', `${this.formatPLN(data.grandTotals.totalTax)} PLN`],
      ];

      y = this.drawTable(doc, y, ['Pozycja', 'Wartosc'], summaryRows, [300, CONTENT_WIDTH - 300], {
        rightAlignLast: true,
      });
      y += 30;

      // --- Signature block ---
      this.drawSignatureBlock(doc, y);

      doc.end();
    });
  }

  /**
   * Generate a PIT-8AR lump-sum (flat) tax declaration PDF.
   *
   * Layout: header with year, Section A (employer), Section B (monthly
   * flat-tax breakdown), Section C (per-record breakdown), signature block.
   */
  async generatePIT8AR(data: PIT8ARPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = PAGE_MARGIN;

      // --- Header ---
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.accent);
      doc.text('PIT-8AR', PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 26;

      doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      doc.text(
        'Deklaracja roczna o zryczaltowanym podatku dochodowym',
        PAGE_MARGIN,
        y,
        { align: 'center', width: CONTENT_WIDTH },
      );
      y += 16;

      doc.font('Helvetica-Bold').fontSize(FONT_SIZES.sectionHeader).fillColor(COLORS.accent);
      doc.text(`za rok ${data.year}`, PAGE_MARGIN, y, { align: 'center', width: CONTENT_WIDTH });
      y += 24;

      doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).stroke();
      y += 14;

      // --- Section A: Dane platnika ---
      y = this.drawSectionTitle(doc, 'A. DANE PLATNIKA', y);

      const employerRows: string[][] = [
        ['NIP', data.companyNip],
        ['Nazwa', data.companyName],
        ['Adres', data.companyAddress],
      ];

      y = this.drawTable(doc, y, ['Pole', 'Wartosc'], employerRows, [150, CONTENT_WIDTH - 150]);
      y += 14;

      // --- Section B: Podatek zryczaltowany wg miesiecy ---
      y = this.drawSectionTitle(doc, 'B. PODATEK ZRYCZALTOWANY WG MIESIECY', y);

      const monthlyHeaders = ['Miesiac', 'Liczba rekordow', 'Podatek zryczaltowany'];
      const monthlyColWidths = [180, 150, CONTENT_WIDTH - 330];

      const monthlyRows: string[][] = data.monthlyBreakdown.map((m) => [
        m.month,
        m.recordCount.toString(),
        `${this.formatPLN(m.totalFlatTax)} PLN`,
      ]);

      // Ensure we have 12 rows
      const allMonths = [
        'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
      ];
      if (monthlyRows.length < 12) {
        const existingMonths = new Set(data.monthlyBreakdown.map((m) => m.month));
        for (const month of allMonths) {
          if (!existingMonths.has(month) && monthlyRows.length < 12) {
            monthlyRows.push([month, '0', '0,00 PLN']);
          }
        }
        monthlyRows.sort((a, b) => allMonths.indexOf(a[0]) - allMonths.indexOf(b[0]));
      }

      y = this.drawTable(doc, y, monthlyHeaders, monthlyRows, monthlyColWidths, { rightAlignLast: true });

      // Check if we need a new page for Section C
      const estimatedSectionCHeight = 40 + (data.records.length + 1) * ROW_HEIGHT + 80;
      if (y + estimatedSectionCHeight > 841.89 - PAGE_MARGIN) {
        doc.addPage({ size: 'A4', margin: PAGE_MARGIN });
        y = PAGE_MARGIN;
      } else {
        y += 14;
      }

      // --- Section C: Zestawienie wg zrodel ---
      y = this.drawSectionTitle(doc, 'C. ZESTAWIENIE WG ZRODEL PRZYCHODU', y);

      const recordHeaders = ['Podatnik', 'Rodzaj przychodu', 'Przychod brutto', 'Podatek'];
      const recordColWidths = [160, 140, 100, CONTENT_WIDTH - 400];

      const recordRows: string[][] = data.records.map((r) => [
        r.employeeName,
        this.getIncomeTypeName(r.incomeType),
        `${this.formatPLN(r.totalGross)} PLN`,
        `${this.formatPLN(r.totalTax)} PLN`,
      ]);

      if (recordRows.length > 0) {
        y = this.drawTable(doc, y, recordHeaders, recordRows, recordColWidths, { rightAlignLast: true });
      } else {
        doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
        doc.text('Brak rekordow w danym okresie.', PAGE_MARGIN, y);
        y += 18;
      }

      y += 30;

      // --- Signature block ---
      if (y + 60 > 841.89 - PAGE_MARGIN) {
        doc.addPage({ size: 'A4', margin: PAGE_MARGIN });
        y = PAGE_MARGIN;
      }
      this.drawSignatureBlock(doc, y);

      doc.end();
    });
  }

  // ------------------------------------------
  // Private helpers
  // ------------------------------------------

  /**
   * Format a number as Polish PLN currency string.
   * Uses Polish locale conventions: space as thousands separator, comma as decimal.
   * Example: 12345.67 -> "12 345,67"
   */
  private formatPLN(amount: number): string {
    return amount.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format a Date as a Polish-style date string (DD.MM.YYYY).
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Map a contract type enum value to its Polish display name.
   */
  private getContractTypeName(type: string): string {
    const names: Record<string, string> = {
      employment: 'Umowa o prace',
      mandate_contract: 'Umowa zlecenie',
      work_contract: 'Umowa o dzielo',
      board_resolution: 'Uchwala zarzadu',
      dividend: 'Dywidenda',
    };
    return names[type] || type;
  }

  /**
   * Map an income type string to its Polish display name.
   */
  private getIncomeTypeName(type: string): string {
    const names: Record<string, string> = {
      board_resolution: 'Uchwala zarzadu',
      dividend: 'Dywidenda',
      employment: 'Umowa o prace',
      mandate_contract: 'Umowa zlecenie',
      work_contract: 'Umowa o dzielo',
    };
    return names[type] || type;
  }

  /**
   * Draw a bold section title with a subtle underline.
   * Returns the Y position after the title for continued layout.
   */
  private drawSectionTitle(doc: InstanceType<typeof PDFDocument>, text: string, y?: number): number {
    const currentY = y ?? (doc as any).y ?? PAGE_MARGIN;

    doc.font('Helvetica-Bold').fontSize(FONT_SIZES.sectionHeader).fillColor(COLORS.accent);
    doc.text(text, PAGE_MARGIN, currentY);

    const afterTextY = currentY + FONT_SIZES.sectionHeader + 4;

    // Subtle underline
    doc
      .moveTo(PAGE_MARGIN, afterTextY)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, afterTextY)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    // Reset line width
    doc.lineWidth(1);

    return afterTextY + 8;
  }

  /**
   * Draw a bordered table with optional header background and right-aligned last column.
   *
   * @param doc          - The PDFDocument instance
   * @param startY       - Y coordinate for the top of the table
   * @param headers      - Array of header label strings
   * @param rows         - 2D array of row cell strings
   * @param columnWidths - Array of column widths in points (must match headers length)
   * @param options      - Optional: headerBg color, rightAlignLast flag
   * @returns Y coordinate after the last row of the table
   */
  private drawTable(
    doc: InstanceType<typeof PDFDocument>,
    startY: number,
    headers: string[],
    rows: string[][],
    columnWidths: number[],
    options?: { headerBg?: string; rightAlignLast?: boolean },
  ): number {
    const headerBg = options?.headerBg ?? COLORS.headerBg;
    const rightAlignLast = options?.rightAlignLast ?? false;
    const cellPadding = 6;

    let currentY = startY;

    // --- Draw header row ---
    let xOffset = PAGE_MARGIN;

    for (let col = 0; col < headers.length; col++) {
      const colWidth = columnWidths[col];

      // Header background
      doc.rect(xOffset, currentY, colWidth, HEADER_ROW_HEIGHT).fillAndStroke(headerBg, COLORS.border);

      // Header text
      const isLastCol = col === headers.length - 1;
      const textAlign = isLastCol && rightAlignLast ? 'right' : 'left';
      const textX = textAlign === 'right' ? xOffset : xOffset + cellPadding;
      const textWidth = textAlign === 'right' ? colWidth - cellPadding * 2 : colWidth - cellPadding * 2;

      doc.font('Helvetica-Bold').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
      doc.text(headers[col], textX, currentY + 6, {
        width: textWidth,
        align: textAlign,
      });

      xOffset += colWidth;
    }

    currentY += HEADER_ROW_HEIGHT;

    // --- Draw data rows ---
    for (let row = 0; row < rows.length; row++) {
      xOffset = PAGE_MARGIN;
      const isAltRow = row % 2 === 1;
      const rowData = rows[row];

      // Check for page overflow before drawing a row
      if (currentY + ROW_HEIGHT > 841.89 - PAGE_MARGIN) {
        doc.addPage({ size: 'A4', margin: PAGE_MARGIN });
        currentY = PAGE_MARGIN;
      }

      for (let col = 0; col < headers.length; col++) {
        const colWidth = columnWidths[col];
        const cellValue = col < rowData.length ? rowData[col] : '';

        // Cell background
        if (isAltRow) {
          doc.rect(xOffset, currentY, colWidth, ROW_HEIGHT).fillAndStroke(COLORS.altRowBg, COLORS.border);
        } else {
          doc.rect(xOffset, currentY, colWidth, ROW_HEIGHT).fillAndStroke('#ffffff', COLORS.border);
        }

        // Cell text
        const isLastCol = col === headers.length - 1;
        const textAlign = isLastCol && rightAlignLast ? 'right' : 'left';
        const textX = textAlign === 'right' ? xOffset : xOffset + cellPadding;
        const textWidth = textAlign === 'right' ? colWidth - cellPadding * 2 : colWidth - cellPadding * 2;

        // Bold for "RAZEM" or summary rows
        const isSummaryRow =
          cellValue.startsWith('RAZEM') ||
          cellValue.startsWith('Calkowity') ||
          cellValue.startsWith('Laczn');
        const font = isSummaryRow ? 'Helvetica-Bold' : 'Helvetica';

        doc.font(font).fontSize(FONT_SIZES.body).fillColor(COLORS.text);
        doc.text(cellValue, textX, currentY + 6, {
          width: textWidth,
          align: textAlign,
        });

        xOffset += colWidth;
      }

      currentY += ROW_HEIGHT;
    }

    return currentY;
  }

  /**
   * Draw a date line and signature placeholder at the given Y position.
   */
  private drawSignatureBlock(doc: InstanceType<typeof PDFDocument>, y: number): void {
    const today = new Date();
    const dateStr = this.formatDate(today);

    doc.font('Helvetica').fontSize(FONT_SIZES.body).fillColor(COLORS.text);
    doc.text(`Data: ${dateStr}`, PAGE_MARGIN, y);

    const signatureY = y + 30;
    const lineStartX = PAGE_MARGIN + 280;
    const lineEndX = PAGE_MARGIN + CONTENT_WIDTH;

    doc
      .moveTo(lineStartX, signatureY + 12)
      .lineTo(lineEndX, signatureY + 12)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc.lineWidth(1);

    doc.font('Helvetica').fontSize(FONT_SIZES.small).fillColor(COLORS.text);
    doc.text('Podpis pracodawcy', lineStartX, signatureY + 16, {
      width: lineEndX - lineStartX,
      align: 'center',
    });
  }
}
