/**
 * wFirma Tax Register Service (KPiR)
 * Handles KPiR (Ksiega Przychodow i Rozchodow) tax register operations
 */

import { logger } from '../../utils/logger';
import {
  TaxRegisterParams,
  TaxRegisterResult,
  TaxRegisterEntry,
  TaxRegisterSum,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

/**
 * Extract text content of an XML tag. Returns empty string if not found.
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() ?? '';
}

/**
 * Extract text content of an XML tag as a number. Returns 0 if empty or not found.
 */
function extractNum(xml: string, tag: string): number {
  const val = extractTag(xml, tag);
  if (!val) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a single <taxregister> block into a TaxRegisterEntry.
 */
function parseEntry(block: string): TaxRegisterEntry {
  return {
    lp: extractNum(block, 'lp'),
    date: extractTag(block, 'date'),
    name: extractTag(block, 'name'),
    description: extractTag(block, 'description'),
    incomeSale: extractNum(block, 'income_sale'),
    incomeOdd: extractNum(block, 'income_odd'),
    income: extractNum(block, 'income'),
    expensePurchase: extractNum(block, 'expense_purchase'),
    expensePurchaseCost: extractNum(block, 'expense_purchase_cost'),
    expenseSalaries: extractNum(block, 'expense_salaries'),
    expenseOdd: extractNum(block, 'expense_odd'),
    expense: extractNum(block, 'expense'),
    inventory: extractNum(block, 'inventory'),
    expenseResearchDescription: extractTag(block, 'expense_research_description'),
    expenseResearch: extractNum(block, 'expense_research'),
    annotation: extractTag(block, 'annotation'),
    expenseCorrection: extractTag(block, 'expense_correction') === '1',
    contractorName: extractTag(block, 'contractor_name'),
    contractorAddress: extractTag(block, 'contractor_address'),
  };
}

/**
 * Parse a single <sum> block into a TaxRegisterSum.
 */
function parseSum(block: string): TaxRegisterSum {
  return {
    month: extractNum(block, 'month'),
    incomeSale: extractNum(block, 'income_sale'),
    incomeOdd: extractNum(block, 'income_odd'),
    income: extractNum(block, 'income'),
    expensePurchase: extractNum(block, 'expense_purchase'),
    expensePurchaseCost: extractNum(block, 'expense_purchase_cost'),
    expenseSalaries: extractNum(block, 'expense_salaries'),
    expenseOdd: extractNum(block, 'expense_odd'),
    expense: extractNum(block, 'expense'),
    expenseResearch: extractNum(block, 'expense_research'),
  };
}

/**
 * Extract all matches of a given block tag from an XML string.
 */
function extractBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

export class WFirmaTaxRegisterService {
  constructor(private readonly client: WFirmaClient) {}

  async getTaxRegisters(params: TaxRegisterParams): Promise<TaxRegisterResult> {
    logger.info('Fetching tax register (KPiR)', { params });

    return this.client.withRetry(async () => {
      try {
        if (!params.year) {
          throw new WFirmaValidationError('Year is required for tax register');
        }
        if (params.year < 1970 || params.year > 2030) {
          throw new WFirmaValidationError('Year must be between 1970 and 2030');
        }
        if (params.month !== undefined) {
          if (params.month < 1 || params.month > 12) {
            throw new WFirmaValidationError('Month must be between 1 and 12');
          }
        }

        const url = params.month
          ? `/taxregisters/get/${params.year}/${params.month}`
          : `/taxregisters/get/${params.year}`;

        const response = await this.client.apiClient.request({
          method: 'GET',
          url,
          params: {
            outputFormat: 'xml',
            inputFormat: 'xml',
            company_id: this.client.config.companyId,
          },
          responseType: 'text',
        });

        const xml = response.data as string;

        // Check for API error
        if (xml.includes('<code>ERROR</code>')) {
          const msgMatch = xml.match(/<message>(.*?)<\/message>/);
          throw new WFirmaError('WFIRMA_API_ERROR', msgMatch?.[1] || 'Unknown wFirma error');
        }

        // Parse <taxregisters> section — extract individual <taxregister> blocks
        const taxregistersSection = extractTag(xml, 'taxregisters');
        const entryBlocks = extractBlocks(taxregistersSection, 'taxregister');
        const entries = entryBlocks.map(parseEntry);

        // Parse <sums> section — extract <sum> blocks
        const sumsSection = extractTag(xml, 'sums');
        const sumBlocks = extractBlocks(sumsSection, 'sum');
        const sums = sumBlocks.map(parseSum);

        // Parse <total_sums> section — extract <sum> blocks
        const totalSumsSection = extractTag(xml, 'total_sums');
        const totalSumBlocks = extractBlocks(totalSumsSection, 'sum');
        const totalSums = totalSumBlocks.map(parseSum);

        logger.info('Successfully fetched tax register', {
          year: params.year,
          month: params.month,
          entries: entries.length,
          sums: sums.length,
          totalSums: totalSums.length,
        });

        return { entries, sums, totalSums };
      } catch (error) {
        logger.error('Failed to fetch tax register', { error, params });
        throw error;
      }
    });
  }
}
