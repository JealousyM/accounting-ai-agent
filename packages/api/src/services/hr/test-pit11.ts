/**
 * Quick test script to generate a PIT-11 PDF and save it for coordinate inspection.
 * Run: npx ts-node src/services/hr/test-pit11.ts
 */
import { HRPdfGenerator } from './pdf-generator';
import type { PIT11PdfData } from './pdf-generator';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const generator = new HRPdfGenerator();

  const testData: PIT11PdfData = {
    payerNip: '5833510147',
    year: 2025,
    informationNumber: 1,
    taxOfficeName: 'TRZECI URZAD SKARBOWY W GDANSKU',
    purpose: 1,
    payerType: 1,
    payerFullName: 'Micode Sp. z o. o.',
    taxObligationType: 1,
    taxpayerPesel: '85081119898',
    lastName: 'Peraviortkin',
    firstName: 'Mikhail',
    dateOfBirth: '11-08-1985',
    country: 'Polska',
    voivodeship: 'pomorskie',
    powiat: 'Gdansk',
    gmina: 'Gdansk',
    street: 'Letnicka',
    houseNumber: '12',
    apartmentNumber: '4',
    city: 'Gdansk',
    postalCode: '80-536',
    workContractIncome: {
      income: 89607.71,
      costs: 3000.00,
      netIncome: 86607.71,
      taxAdvance: 10393,
    },
    zusSocial: 0,
    zusSocialExempt: 0,
    zusSocialFromExemptIncome: 0,
    healthInsurance: 8064.71,
    pitRAttached: false,
  };

  const pdfBuffer = await generator.generatePIT11(testData);

  const outputPath = path.join(__dirname, '..', '..', 'resources', 'PIT-11-TEST-OUTPUT.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`Test PIT-11 saved to: ${outputPath}`);
  console.log(`File size: ${pdfBuffer.length} bytes`);
}

main().catch(console.error);
