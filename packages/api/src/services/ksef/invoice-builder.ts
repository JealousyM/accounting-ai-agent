/**
 * KSeF Invoice Builder
 * Assembles FA3InvoiceData from wFirma invoice + company data.
 *
 * Extracted from DirectKSeFAdapter.sendInvoice (Path B) for reuse and clarity.
 * Maintains an instance-level address cache so repeated buildFromWFirma calls
 * (e.g. during bulk sends) avoid redundant wFirma contractor lookups.
 */

import { logger } from '../../utils/logger';
import { WFirmaIntegrationService } from '../wfirma';
import type { FA3Address, FA3InvoiceData } from '../../types/ksef.types';
import type { WFirmaInvoice, WFirmaCompany } from '../../types/wfirma.types';

export class KSeFInvoiceBuilder {
  // instance-level address cache: contractorId → FA3Address
  private readonly addressCache = new Map<string, FA3Address>();

  constructor(private readonly wfirmaService: WFirmaIntegrationService) {}

  async buildFromWFirma(
    invoice: WFirmaInvoice,
    company: WFirmaCompany | null
  ): Promise<FA3InvoiceData> {
    return {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      sellDate: invoice.sellDate || invoice.issueDate,
      dueDate: invoice.dueDate,
      sellerName: company?.name || '',
      sellerNip: company?.nip || '',
      sellerAddress: {
        street: company?.address?.street || '',
        city: company?.address?.city || '',
        zip: company?.address?.zip || '',
        country: company?.address?.country || 'PL',
      },
      buyerName: invoice.contractorName,
      buyerNip: invoice.contractorNip || '',
      buyerAddress: await this.fetchBuyerAddress(invoice.contractorId),
      items: invoice.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        priceNet: item.priceNet,
        vatRate: item.vatRate === 0 ? '0 KR' : String(item.vatRate),
        totalNet: item.totalNet,
        totalVat: item.totalVat,
        totalGross: item.totalGross,
      })),
      totalNet: invoice.totalNet,
      totalVat: invoice.totalVat,
      totalGross: invoice.total,
      currency: invoice.currency,
      paymentMethod: invoice.paymentMethod || 'transfer',
    };
  }

  /**
   * Fetch buyer address from wFirma contractor data.
   * Falls back to placeholder values if contractor or address is not available,
   * since FA(3) AdresL1/AdresL2 must not be empty.
   */
  private async fetchBuyerAddress(contractorId?: string): Promise<FA3Address> {
    const fallback: FA3Address = { street: '-', city: '-', zip: '00-000', country: 'PL' };

    if (!contractorId) return fallback;

    const cached = this.addressCache.get(contractorId);
    if (cached) return cached;

    try {
      const contractor = await this.wfirmaService.getContractorById(contractorId);
      if (!contractor?.address) {
        this.addressCache.set(contractorId, fallback);
        return fallback;
      }

      const address: FA3Address = {
        street: contractor.address.street?.trim() || fallback.street,
        city: contractor.address.city?.trim() || fallback.city,
        zip: contractor.address.zip?.trim() || fallback.zip,
        country: contractor.address.country?.trim() || 'PL',
      };
      this.addressCache.set(contractorId, address);
      return address;
    } catch (err) {
      logger.warn('Failed to fetch buyer address from wFirma, using fallback', {
        contractorId,
        error: err instanceof Error ? err.message : 'Unknown',
      });
      return fallback;
    }
  }
}
