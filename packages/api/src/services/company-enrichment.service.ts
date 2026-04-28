/**
 * CompanyEnrichmentService
 * Enriches company data from Polish public registries:
 *   - GUS BIR1.1 (REGON) — primary source for name/REGON/address (covers all NIP-registered entities)
 *   - MF Biała Lista — VAT status + verified bank accounts (active VAT taxpayers only)
 *   - KRS API — board members + share capital (companies only)
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { PublicRegistryData, KrsData, BankAccountVerification } from '../types/wfirma.types';
import { WFirmaCacheService } from './wfirma-cache.service';
import { GusService } from './gus/gus.service';
import type { GusBasicEntity } from './gus/types';

const MF_API_BASE = 'https://wl-api.mf.gov.pl';
const KRS_API_BASE = 'https://api-krs.ms.gov.pl';
const API_TIMEOUT = 5000;

/**
 * Parse a Polish single-string address (as returned by MF Biała Lista) into
 * street/city/zip components.
 *
 * Handles common forms:
 *   "UL. PIĘKNA 47B/8, 00-672 WARSZAWA"
 *   "PIĘKNA 47B/8 00-672 WARSZAWA"
 *   "00-672 WARSZAWA, UL. PIĘKNA 47B/8"
 *
 * Best-effort. Anything we cannot identify as a postcode-anchored token goes
 * into `street`. Returns an empty object if input is empty.
 */
export function parsePolishAddress(input: string): { street?: string; city?: string; zip?: string } {
  if (!input) return {};
  const zipPattern = /(\d{2}-\d{3})\s+([^,]+)/;
  const match = input.match(zipPattern);
  if (!match) {
    return { street: input.trim() };
  }
  const zip = match[1];
  const city = match[2].trim();
  const street = input
    .replace(match[0], '')
    .replace(/[,\s]+$/, '')
    .replace(/^[,\s]+/, '')
    .trim();
  return {
    street: street || undefined,
    city: city || undefined,
    zip: zip || undefined,
  };
}

/**
 * Normalize a Polish bank account to NRB (26 digits, no spaces, no country prefix).
 * Accepts: "PL12 3456 7890 1234 5678 9012 3456", "12345678901234567890123456",
 * "12 3456 7890 1234 5678 9012 3456", etc. Returns null if it can't be reduced
 * to exactly 26 digits.
 */
export function normalizeBankAccount(input: string): string | null {
  if (!input) return null;
  const stripped = input.replace(/\s+/g, '').toUpperCase();
  const digits = stripped.startsWith('PL') ? stripped.slice(2) : stripped;
  if (!/^\d{26}$/.test(digits)) return null;
  return digits;
}

/**
 * Combine GUS structured street fields ("Ulica" + "NrNieruchomosci" [+ "/NrLokalu"])
 * into a single street string suitable for wFirma's contractor address.
 */
export function composeGusStreet(gus: GusBasicEntity | null | undefined): string | undefined {
  if (!gus?.street) return undefined;
  const parts: string[] = [gus.street];
  if (gus.buildingNumber) parts.push(gus.buildingNumber);
  let result = parts.join(' ');
  if (gus.flatNumber) result += `/${gus.flatNumber}`;
  return result.trim() || undefined;
}

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
  constructor(
    private readonly cacheService: WFirmaCacheService,
    private readonly gusService?: GusService,
  ) {}

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

    // 2. Fetch from APIs in parallel.
    // Three sources, three different jobs:
    //   - GUS BIR1.1 → company directory: name, REGON, structured address.
    //     Covers EVERY NIP-registered entity (companies + sole props + cywilne),
    //     so this is the primary autofill source.
    //   - Biała Lista MF → VAT-specific: status + verified accounts. Smaller
    //     subset (only active VAT taxpayers) and we keep its data only for
    //     compliance fields. Name/address from here are now a fallback.
    //   - KRS → board members + share capital + legal-form name. Companies
    //     only.
    try {
      const [gusResult, mfResult, krsResult] = await Promise.allSettled([
        this.gusService ? this.gusService.lookupByNip(nip) : Promise.resolve(null),
        this.fetchFromBialaLista(nip),
        this.fetchFromKRS(nip),
      ]);

      const gusData: GusBasicEntity | null =
        gusResult.status === 'fulfilled' ? gusResult.value : null;
      const mfData = mfResult.status === 'fulfilled' ? mfResult.value : null;
      const krsData = krsResult.status === 'fulfilled' ? krsResult.value : null;

      if (gusResult.status === 'rejected') {
        logger.warn('GUS BIR1.1 API failed', { nip, error: (gusResult.reason as Error)?.message });
      }
      if (mfResult.status === 'rejected') {
        logger.warn('MF Biala Lista API failed', { nip, error: mfResult.reason?.message });
      }
      if (krsResult.status === 'rejected') {
        logger.warn('KRS API failed', { nip, error: krsResult.reason?.message });
      }

      // If all failed, try stale cache
      if (!gusData && !mfData && !krsData) {
        logger.warn('All public APIs failed, trying stale cache', { nip });
        return this.cacheService.getCachedDataAllowStale<PublicRegistryData>(
          userId, 'public_registry', cacheKey
        );
      }

      // 3. Merge results — prefer GUS for identity/address, MF for VAT, KRS extras.
      const street = composeGusStreet(gusData);
      const result: PublicRegistryData = {
        nip,
        name: gusData?.name || mfData?.name || undefined,
        regon: gusData?.regon || mfData?.regon || undefined,
        krs: mfData?.krs || gusData?.krs || undefined,
        vatStatus: mfData?.vatStatus || undefined,
        vatStatusDate: mfData?.vatStatusDate || undefined,
        verifiedBankAccounts: mfData?.verifiedBankAccounts || undefined,
        workingAddress: mfData?.workingAddress || undefined,
        residenceAddress: mfData?.residenceAddress || undefined,
        street: street || undefined,
        city: gusData?.city || undefined,
        zip: gusData?.zip || undefined,
        entityType: gusData?.type || undefined,
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
    name?: string;
    regon?: string;
    krs?: string;
    vatStatus?: PublicRegistryData['vatStatus'];
    vatStatusDate?: string;
    verifiedBankAccounts?: string[];
    workingAddress?: string;
    residenceAddress?: string;
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
      name: typeof subject.name === 'string' && subject.name.trim() ? subject.name.trim() : undefined,
      regon: subject.regon || undefined,
      krs: subject.krs || undefined,
      vatStatus: this.mapVatStatus(subject.statusVat),
      vatStatusDate: subject.registrationDenialDate || subject.registrationLegalDate || undefined,
      verifiedBankAccounts: Array.isArray(subject.accountNumbers)
        ? subject.accountNumbers.filter((a: string) => a)
        : undefined,
      workingAddress: typeof subject.workingAddress === 'string' && subject.workingAddress.trim()
        ? subject.workingAddress.trim()
        : undefined,
      residenceAddress: typeof subject.residenceAddress === 'string' && subject.residenceAddress.trim()
        ? subject.residenceAddress.trim()
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

  /**
   * Verify a single bank account against the MF Biała Lista for a given NIP.
   *
   * Uses the dedicated check endpoint:
   *   GET /api/check/nip/{nip}/bank-account/{account}?date={YYYY-MM-DD}
   *
   * Polish law (Art. 117ba Tax Ordinance + Art. 19 Entrepreneurs Law) requires
   * this check before any single payment ≥ 15,000 PLN — paying to an
   * unverified account disqualifies the cost as KUP and triggers joint VAT
   * liability for the buyer.
   *
   * Cached for 24h by (nip, accountNumber, date) so retries on the same day
   * are free. The MF Request ID returned by the API is preserved as legal
   * proof of the check.
   */
  async verifyBankAccount(
    nip: string,
    accountNumber: string,
    userId: string,
    date?: string
  ): Promise<BankAccountVerification | null> {
    const checkDate = date || new Date().toISOString().split('T')[0];
    const cacheKey = `nip_${nip}_acct_${accountNumber}_${checkDate}`;

    const cached = await this.cacheService.getCachedData<BankAccountVerification>(
      userId, 'public_registry', cacheKey
    );
    if (cached) {
      logger.debug('Biała Lista bank-account check cache hit', { nip, accountNumber, checkDate });
      return cached;
    }

    const url = `${MF_API_BASE}/api/check/nip/${nip}/bank-account/${accountNumber}?date=${checkDate}`;
    logger.info('Verifying bank account on Biała Lista', { nip, accountNumber, checkDate });

    try {
      const response = await axios.get(url, { timeout: API_TIMEOUT });
      const result = response.data?.result;

      if (!result || typeof result.accountAssigned !== 'string') {
        logger.warn('Unexpected MF response shape on bank-account check', { nip, accountNumber });
        return null;
      }

      const verification: BankAccountVerification = {
        nip,
        accountNumber,
        date: checkDate,
        accountAssigned: result.accountAssigned === 'TAK',
        requestId: result.requestId || undefined,
      };

      await this.cacheService.cacheData(userId, 'public_registry', cacheKey, verification)
        .catch(err => logger.warn('Failed to cache bank-account verification', {
          nip, accountNumber, error: err.message,
        }));

      return verification;
    } catch (error) {
      logger.warn('MF Biała Lista bank-account check failed', {
        nip,
        accountNumber,
        checkDate,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.cacheService.getCachedDataAllowStale<BankAccountVerification>(
        userId, 'public_registry', cacheKey
      );
    }
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
