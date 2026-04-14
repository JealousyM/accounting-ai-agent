/**
 * CompanyEnrichmentService
 * Enriches company data from Polish public registries (MF Biala Lista + KRS API)
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { PublicRegistryData, KrsData } from '../types/wfirma.types';
import { WFirmaCacheService } from './wfirma-cache.service';

const MF_API_BASE = 'https://wl-api.mf.gov.pl';
const KRS_API_BASE = 'https://api-krs.ms.gov.pl';
const API_TIMEOUT = 5000;

/**
 * Validate Polish NIP with modulo 11 checksum
 */
export function validateNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(nip[i], 10), 0);
  const checkDigit = sum % 11;
  // If modulo is 10, NIP is invalid (check digit must be single digit)
  if (checkDigit === 10) return false;
  return checkDigit === parseInt(nip[9], 10);
}

export class CompanyEnrichmentService {
  constructor(private readonly cacheService: WFirmaCacheService) {}

  /**
   * Enrich company data by NIP from public registries
   * Uses userId for cache storage (wfirma_cache has FK to users table)
   * Returns cached data if available, otherwise fetches from MF + KRS APIs
   * On API failure, falls back to stale cache, then null
   */
  async enrichByNip(nip: string, userId: string): Promise<PublicRegistryData | null> {
    const cacheKey = `nip_${nip}`;

    // 1. Check fresh cache
    const cached = await this.cacheService.getCachedData<PublicRegistryData>(
      userId, 'public_registry', cacheKey
    );
    if (cached) {
      logger.debug('Public registry cache hit', { nip });
      return cached;
    }

    // 2. Fetch from APIs
    try {
      const [mfResult, krsResult] = await Promise.allSettled([
        this.fetchFromBialaLista(nip),
        this.fetchFromKRS(nip),
      ]);

      const mfData = mfResult.status === 'fulfilled' ? mfResult.value : null;
      const krsData = krsResult.status === 'fulfilled' ? krsResult.value : null;

      if (mfResult.status === 'rejected') {
        logger.warn('MF Biala Lista API failed', { nip, error: mfResult.reason?.message });
      }
      if (krsResult.status === 'rejected') {
        logger.warn('KRS API failed', { nip, error: krsResult.reason?.message });
      }

      // If both failed, try stale cache
      if (!mfData && !krsData) {
        logger.warn('All public APIs failed, trying stale cache', { nip });
        return this.cacheService.getCachedDataAllowStale<PublicRegistryData>(
          userId, 'public_registry', cacheKey
        );
      }

      // 3. Merge results
      const result: PublicRegistryData = {
        nip,
        regon: mfData?.regon || undefined,
        krs: mfData?.krs || undefined,
        vatStatus: mfData?.vatStatus || undefined,
        vatStatusDate: mfData?.vatStatusDate || undefined,
        verifiedBankAccounts: mfData?.verifiedBankAccounts || undefined,
        krsData: krsData || undefined,
      };

      // 4. Cache result
      await this.cacheService.cacheData(
        userId, 'public_registry', cacheKey, result
      ).catch(err => logger.warn('Failed to cache public registry data', { nip, error: err.message }));

      return result;
    } catch (error) {
      logger.error('Unexpected error in enrichByNip', { nip, error });
      return this.cacheService.getCachedDataAllowStale<PublicRegistryData>(
        userId, 'public_registry', cacheKey
      );
    }
  }

  /**
   * Fetch company data from MF Biala Lista (VAT taxpayer registry)
   * GET https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={YYYY-MM-DD}
   */
  private async fetchFromBialaLista(nip: string): Promise<{
    regon?: string;
    krs?: string;
    vatStatus?: PublicRegistryData['vatStatus'];
    vatStatusDate?: string;
    verifiedBankAccounts?: string[];
  } | null> {
    const today = new Date().toISOString().split('T')[0];
    const url = `${MF_API_BASE}/api/search/nip/${nip}?date=${today}`;

    logger.info('Fetching from MF Biala Lista', { nip, url });

    const response = await axios.get(url, { timeout: API_TIMEOUT });
    const subject = response.data?.result?.subject;

    if (!subject) {
      logger.info('NIP not found in MF Biala Lista', { nip });
      return null;
    }

    return {
      regon: subject.regon || undefined,
      krs: subject.krs || undefined,
      vatStatus: this.mapVatStatus(subject.statusVat),
      vatStatusDate: subject.registrationDenialDate || subject.registrationLegalDate || undefined,
      verifiedBankAccounts: Array.isArray(subject.accountNumbers)
        ? subject.accountNumbers.filter((a: string) => a)
        : undefined,
    };
  }

  /**
   * Fetch company data from KRS API (court register)
   * Only returns data for companies (sp. z o.o., S.A.), not sole proprietors
   */
  private async fetchFromKRS(nip: string): Promise<KrsData | null> {
    // Step 1: Search by NIP to get KRS number
    const searchUrl = `${KRS_API_BASE}/api/krs/OdpisSzukaj?nip=${nip}`;
    logger.info('Searching KRS by NIP', { nip });

    const searchResponse = await axios.get(searchUrl, { timeout: API_TIMEOUT });
    const items = searchResponse.data?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.info('NIP not found in KRS (likely sole proprietor)', { nip });
      return null;
    }

    const krsNumber = items[0]?.krsNumber;
    if (!krsNumber) {
      return null;
    }

    // Step 2: Get full KRS record
    const detailUrl = `${KRS_API_BASE}/api/krs/OdpisAktualny/${krsNumber}?rejestr=P&format=json`;
    logger.info('Fetching KRS details', { krsNumber });

    const detailResponse = await axios.get(detailUrl, { timeout: API_TIMEOUT });
    const data = detailResponse.data;

    if (!data) {
      return null;
    }

    // Extract board members from KRS response
    const boardMembers: { name: string; role: string }[] = [];
    const reprezentacja = data?.odpis?.dane?.wspolnicy || data?.odpis?.dane?.reprezentacja?.sklad;
    if (Array.isArray(reprezentacja)) {
      for (const member of reprezentacja) {
        const name = [member.imiona?.imie, member.nazwisko].filter(Boolean).join(' ');
        if (name) {
          boardMembers.push({
            name,
            role: member.funkcja || 'Członek Zarządu',
          });
        }
      }
    }

    return {
      legalForm: data?.odpis?.dane?.formaPrawna || undefined,
      shareCapital: data?.odpis?.dane?.kapitalZakladowy?.wartosc
        ? `${data.odpis.dane.kapitalZakladowy.wartosc} ${data.odpis.dane.kapitalZakladowy.waluta || 'PLN'}`
        : undefined,
      boardMembers: boardMembers.length > 0 ? boardMembers : undefined,
      registrationDate: data?.odpis?.dane?.dataWpisuDoRejestruPrzedsiebiorstw || undefined,
    };
  }

  private mapVatStatus(status: string | undefined): PublicRegistryData['vatStatus'] | undefined {
    if (!status) return undefined;
    const normalized = status.toLowerCase().trim();
    if (normalized === 'czynny') return 'czynny';
    if (normalized === 'zwolniony') return 'zwolniony';
    if (normalized.includes('niezarejestrowany') || normalized.includes('nie')) return 'niezarejestrowany';
    return undefined;
  }
}
