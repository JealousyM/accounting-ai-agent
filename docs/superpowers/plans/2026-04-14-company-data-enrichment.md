# Company Data Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich company data by aggregating all wFirma endpoints and supplementing with Polish public APIs (MF Biala Lista + KRS) for REGON, KRS, VAT status, and verified bank accounts.

**Architecture:** New `CompanyEnrichmentService` calls MF Biala Lista and KRS API (both free, no auth), caches results via `WFirmaCacheService`. For `get_company_info`, cache uses the caller's `userId`. For `lookup_company_by_nip`, cache uses the caller's `userId` too (the `wfirma_cache` table has a FK to `users`). `get_company_info` tool upgraded to aggregate all wFirma data + public registry enrichment. New `lookup_company_by_nip` tool for any-NIP lookups.

**Tech Stack:** TypeScript, Axios, Zod, WFirmaCacheService, LangChain tools

**Spec:** `docs/superpowers/specs/2026-04-14-company-data-enrichment-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `packages/api/src/services/company-enrichment.service.ts` | MF Biala Lista + KRS API client, caching, enrichByNip() |
| `packages/api/src/services/company-enrichment.instance.ts` | Singleton export |
| `packages/api/src/services/__tests__/company-enrichment.service.test.ts` | Unit tests for enrichment service |

### Modified files
| File | Changes |
|------|---------|
| `packages/api/src/types/cache.types.ts` | Add `'public_registry'` to CacheDataType + DEFAULT_TTL_CONFIG |
| `packages/api/src/types/wfirma.types.ts` | Add PublicRegistryData, CompanyFullInfo; extend WFirmaCompany + WFirmaCompanyAddress |
| `packages/api/src/services/wfirma-cache.service.ts` | Add `getCachedDataAllowStale()` method |
| `packages/api/src/services/wfirma/company.service.ts` | Extract new fields (altname, vatPayer, tax, buildingNumber, etc.) |
| `packages/api/src/services/ai-chat/tools/company.tool.ts` | Upgrade get_company_info, add lookup_company_by_nip |
| `packages/api/src/services/ai-chat/tools/index.ts` | Add CompanyEnrichmentService param to createAllTools |
| `packages/api/src/services/ai-chat/formatters/company.formatter.ts` | New fields + formatPublicRegistryData() |
| `packages/api/src/i18n/index.ts` | Extend CompanyTranslations interface with new keys |
| `packages/api/src/i18n/locales/pl.json` | Polish translations for new keys |
| `packages/api/src/i18n/locales/en.json` | English translations for new keys |
| `packages/api/src/i18n/locales/ru.json` | Russian translations for new keys |
| `packages/api/src/services/ai-chat/formatters/index.ts` | Add formatPublicRegistryData export |
| `packages/api/src/services/ai-chat/ai-chat.service.ts` | Pass enrichmentService to createAllTools |

---

### Task 1: Extend types (cache + wfirma)

**Files:**
- Modify: `packages/api/src/types/cache.types.ts:9,29-44`
- Modify: `packages/api/src/types/wfirma.types.ts:27-93`

- [ ] **Step 1: Add `public_registry` to CacheDataType**

In `packages/api/src/types/cache.types.ts`, add `'public_registry'` to the `CacheDataType` union (line 9):

```typescript
export type CacheDataType = 'company' | 'contractor' | 'invoice' | 'financial' | 'user' | 'user_company' | 'payment' | 'expense' | 'vehicle' | 'term' | 'term_group' | 'document' | 'ledger_accountant_year' | 'ledger_operation_schema' | 'public_registry';
```

Add to `DEFAULT_TTL_CONFIG` (after line 43):

```typescript
  public_registry: 24 * 60 * 60 * 1000, // 24 hours (public registry data changes rarely)
```

- [ ] **Step 2: Extend WFirmaCompany with new fields**

In `packages/api/src/types/wfirma.types.ts`, add after `website?: string;` (line 37):

```typescript
  altname?: string;
  vatPayer?: boolean;
  taxType?: string;
  bookStartDate?: string;
  packRights?: string[];
```

- [ ] **Step 3: Extend WFirmaCompanyAddress with new fields**

In `packages/api/src/types/wfirma.types.ts`, add after `isMain: boolean;` (line 66):

```typescript
  buildingNumber?: string;
  flatNumber?: string;
  commune?: string;
  district?: string;
  voivodeship?: string;
```

- [ ] **Step 4: Add PublicRegistryData and CompanyFullInfo types**

In `packages/api/src/types/wfirma.types.ts`, add after the `WFirmaCompanyDetails` interface (after line 93):

```typescript
// ============================================
// PUBLIC REGISTRY TYPES
// ============================================

export interface KrsData {
  legalForm?: string;
  shareCapital?: string;
  boardMembers?: { name: string; role: string }[];
  registrationDate?: string;
}

export interface PublicRegistryData {
  nip: string;
  regon?: string;
  krs?: string;
  vatStatus?: 'czynny' | 'zwolniony' | 'niezarejestrowany';
  vatStatusDate?: string;
  verifiedBankAccounts?: string[];
  krsData?: KrsData;
}

export interface CompanyFullInfo {
  wfirma: WFirmaCompanyDetails;
  publicRegistry?: PublicRegistryData;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing errors ok)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/types/cache.types.ts packages/api/src/types/wfirma.types.ts
git commit -m "feat(types): add PublicRegistryData, extend WFirmaCompany and cache types (AIA-80)"
```

---

### Task 2: Add getCachedDataAllowStale to WFirmaCacheService

**Files:**
- Modify: `packages/api/src/services/wfirma-cache.service.ts`

- [ ] **Step 1: Add getCachedDataAllowStale method**

Add this method to `WFirmaCacheService` class, right after the existing `getCachedData` method:

```typescript
  /**
   * Get cached data even if expired (for fallback scenarios)
   * Unlike getCachedData, this does NOT invalidate expired entries.
   */
  async getCachedDataAllowStale<T = any>(
    userId: string,
    dataType: CacheDataType,
    wfirmaId: string,
  ): Promise<T | null> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        data: any;
        cachedAt: Date;
        expiresAt: Date;
        isValid: boolean;
      }>>`
        SELECT data, "cachedAt", "expiresAt", "isValid"
        FROM wfirma_cache
        WHERE "userId" = ${userId}::uuid
          AND "dataType" = ${dataType}
          AND "wfirmaId" = ${wfirmaId}
          AND "isValid" = true
        LIMIT 1
      `;

      if (!result || result.length === 0) {
        return null;
      }

      const entry = result[0];
      const isStale = entry.expiresAt <= new Date();

      logger.debug(isStale ? 'Returning stale cached data as fallback' : 'Returning fresh cached data', {
        userId, dataType, wfirmaId, isStale,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
      });

      return entry.data as T;
    } catch (error) {
      logger.error('Failed to retrieve stale cached data', { userId, dataType, wfirmaId, error });
      return null;
    }
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/wfirma-cache.service.ts
git commit -m "feat(cache): add getCachedDataAllowStale for stale fallback (AIA-80)"
```

---

### Task 3: Extract new fields from wFirma company/address endpoints

**Files:**
- Modify: `packages/api/src/services/wfirma/company.service.ts:84-103,256-269`

- [ ] **Step 1: Update getCompanyData to extract new fields**

In `company.service.ts`, update the company mapping (lines 84-103). After `website: companyData.www,` add:

```typescript
          altname: companyData.altname || undefined,
          vatPayer: companyData.vat_payer === '1',
          taxType: companyData.tax || undefined,
          bookStartDate: companyData.book_start_date || undefined,
          packRights: (() => {
            const rights: string[] = [];
            // pack_rights come as numbered sub-objects in the company response
            if (companyData && typeof companyData === 'object') {
              for (const key of Object.keys(companyData)) {
                const val = companyData[key];
                if (typeof val === 'object' && val !== null && 'pack_rights' in val) {
                  rights.push(val.pack_rights);
                }
              }
            }
            return rights.length > 0 ? rights : undefined;
          })(),
```

- [ ] **Step 2: Update getCompanyAddresses to extract new fields**

In `company.service.ts`, in the `getCompanyAddresses` method, update the address mapping inside the `for` loop (around line 259). After `isMain: ...` add:

```typescript
                buildingNumber: addr.building_number || undefined,
                flatNumber: addr.flat_number || undefined,
                commune: addr.commune || undefined,
                district: addr.district || undefined,
                voivodeship: addr.voivodeship || undefined,
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/wfirma/company.service.ts
git commit -m "feat(wfirma): extract altname, vatPayer, tax, address details from API (AIA-80)"
```

---

### Task 4: Create CompanyEnrichmentService

**Files:**
- Create: `packages/api/src/services/company-enrichment.service.ts`
- Create: `packages/api/src/services/company-enrichment.instance.ts`

- [ ] **Step 1: Create the enrichment service**

Create `packages/api/src/services/company-enrichment.service.ts`:

```typescript
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
```

- [ ] **Step 2: Create singleton instance**

Create `packages/api/src/services/company-enrichment.instance.ts`:

```typescript
import { CompanyEnrichmentService } from './company-enrichment.service';
import { wfirmaCacheService } from './wfirma-cache.instance';

export const companyEnrichmentService = new CompanyEnrichmentService(wfirmaCacheService);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/company-enrichment.service.ts packages/api/src/services/company-enrichment.instance.ts
git commit -m "feat: add CompanyEnrichmentService for MF Biala Lista + KRS API (AIA-80)"
```

---

### Task 5: Add i18n translations for public registry data

**Files:**
- Modify: `packages/api/src/i18n/index.ts:136-192` (interface only)
- Modify: `packages/api/src/i18n/locales/pl.json`
- Modify: `packages/api/src/i18n/locales/en.json`
- Modify: `packages/api/src/i18n/locales/ru.json`

**Note:** Translations live in JSON files under `packages/api/src/i18n/locales/`. The `index.ts` only defines the TypeScript interface.

- [ ] **Step 1: Extend CompanyTranslations interface**

In `packages/api/src/i18n/index.ts`, add to the `CompanyTranslations` interface (after `errorFetchPack: string;` at line 191):

```typescript
  // Public registry
  publicRegistryTitle: string;
  vatStatus: string;
  vatStatusCzynny: string;
  vatStatusZwolniony: string;
  vatStatusNiezarejestrowany: string;
  verifiedAccounts: string;
  legalForm: string;
  shareCapital: string;
  boardMembers: string;
  registrationDate: string;
  altname: string;
  vatPayer: string;
  taxType: string;
  bookStartDate: string;
  buildingNumber: string;
  flatNumber: string;
  commune: string;
  district: string;
  voivodeship: string;
  errorFetchPublicRegistry: string;
  invalidNip: string;
  nipNotFound: string;
```

- [ ] **Step 2: Add Polish translations to pl.json**

In `packages/api/src/i18n/locales/pl.json`, add the following keys inside the `"company"` object (after the last existing key like `"errorFetchPack"`):

```json
    "publicRegistryTitle": "Dane z rejestrów publicznych",
    "vatStatus": "Status VAT",
    "vatStatusCzynny": "Czynny",
    "vatStatusZwolniony": "Zwolniony",
    "vatStatusNiezarejestrowany": "Niezarejestrowany",
    "verifiedAccounts": "Zweryfikowane konta bankowe",
    "legalForm": "Forma prawna",
    "shareCapital": "Kapitał zakładowy",
    "boardMembers": "Zarząd",
    "registrationDate": "Data rejestracji",
    "altname": "Nazwa skrócona",
    "vatPayer": "Płatnik VAT",
    "taxType": "Forma opodatkowania",
    "bookStartDate": "Data początku księgowości",
    "buildingNumber": "Nr budynku",
    "flatNumber": "Nr lokalu",
    "commune": "Gmina",
    "district": "Powiat",
    "voivodeship": "Województwo",
    "errorFetchPublicRegistry": "Nie udało się pobrać danych z rejestrów publicznych",
    "invalidNip": "Nieprawidłowy numer NIP",
    "nipNotFound": "Nie znaleziono podmiotu o podanym NIP"
```

- [ ] **Step 3: Add English translations to en.json**

In `packages/api/src/i18n/locales/en.json`, add to the `"company"` object:

```json
    "publicRegistryTitle": "Public Registry Data",
    "vatStatus": "VAT Status",
    "vatStatusCzynny": "Active",
    "vatStatusZwolniony": "Exempt",
    "vatStatusNiezarejestrowany": "Unregistered",
    "verifiedAccounts": "Verified Bank Accounts",
    "legalForm": "Legal Form",
    "shareCapital": "Share Capital",
    "boardMembers": "Board Members",
    "registrationDate": "Registration Date",
    "altname": "Short Name",
    "vatPayer": "VAT Payer",
    "taxType": "Tax Type",
    "bookStartDate": "Accounting Start Date",
    "buildingNumber": "Building No.",
    "flatNumber": "Flat No.",
    "commune": "Commune",
    "district": "District",
    "voivodeship": "Voivodeship",
    "errorFetchPublicRegistry": "Failed to fetch data from public registries",
    "invalidNip": "Invalid NIP number",
    "nipNotFound": "No entity found with the given NIP"
```

- [ ] **Step 4: Add Russian translations to ru.json**

In `packages/api/src/i18n/locales/ru.json`, add to the `"company"` object:

```json
    "publicRegistryTitle": "Данные из публичных реестров",
    "vatStatus": "Статус НДС",
    "vatStatusCzynny": "Активный",
    "vatStatusZwolniony": "Освобождён",
    "vatStatusNiezarejestrowany": "Незарегистрирован",
    "verifiedAccounts": "Верифицированные банковские счета",
    "legalForm": "Правовая форма",
    "shareCapital": "Уставной капитал",
    "boardMembers": "Правление",
    "registrationDate": "Дата регистрации",
    "altname": "Сокращённое наименование",
    "vatPayer": "Плательщик НДС",
    "taxType": "Форма налогообложения",
    "bookStartDate": "Дата начала учёта",
    "buildingNumber": "Номер дома",
    "flatNumber": "Номер квартиры",
    "commune": "Гмина",
    "district": "Повят",
    "voivodeship": "Воеводство",
    "errorFetchPublicRegistry": "Не удалось получить данные из публичных реестров",
    "invalidNip": "Некорректный номер NIP",
    "nipNotFound": "Субъект с указанным NIP не найден"
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/i18n/index.ts
git commit -m "feat(i18n): add public registry and new company field translations (AIA-80)"
```

---

### Task 6: Update company formatter

**Files:**
- Modify: `packages/api/src/services/ai-chat/formatters/company.formatter.ts`

- [ ] **Step 1: Update formatCompanyInfo with new fields**

In `company.formatter.ts`, update the `formatCompanyInfo` function. After the NIP line (`result += ...company.nip...`) add altname, vatPayer, taxType, bookStartDate. Also update the address formatting to include building/flat numbers.

Replace the entire `formatCompanyInfo` function. Note: building/flat numbers are shown in the `formatCompanyAddresses` section (separate addresses), not in the basic company address line (which uses the `Address` type without those fields):

```typescript
export function formatCompanyInfo(company: WFirmaCompany, locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);
  const addr = company.address;
  const addressStr = addr ? `${addr.street}, ${addr.zip} ${addr.city}, ${addr.country}` : '-';

  let result = `## ${t.companyInfo}\n\n`;
  result += `| ${t.companyTitle} | |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.name}** | ${company.name} |\n`;
  if (company.altname && company.altname !== company.name) {
    result += `| **${t.altname}** | ${company.altname} |\n`;
  }
  result += `| **${t.nip}** | ${company.nip} |\n`;
  if (company.regon) {
    result += `| **${t.regon}** | ${company.regon} |\n`;
  }
  if (company.krs) {
    result += `| **${t.krs}** | ${company.krs} |\n`;
  }
  if (company.vatPayer !== undefined) {
    result += `| **${t.vatPayer}** | ${company.vatPayer ? t.yes : t.no} |\n`;
  }
  if (company.taxType) {
    result += `| **${t.taxType}** | ${formatTaxType(company.taxType)} |\n`;
  }
  if (company.bookStartDate) {
    result += `| **${t.bookStartDate}** | ${company.bookStartDate} |\n`;
  }
  result += `| **${t.address}** | ${addressStr} |\n`;
  if (company.email) {
    result += `| **${t.email}** | ${company.email} |\n`;
  }
  if (company.phone) {
    result += `| **${t.phone}** | ${company.phone} |\n`;
  }
  if (company.website) {
    result += `| **${t.website}** | ${company.website} |\n`;
  }

  return result;
}

function formatTaxType(taxType: string): string {
  const typeMap: Record<string, string> = {
    'ledger_register': 'KPiR (Księga Przychodów i Rozchodów)',
    'lump_register': 'Ryczałt',
    'taxregister': 'KPiR',
    'lumpregister': 'Ryczałt',
  };
  return typeMap[taxType] || taxType;
}
```

- [ ] **Step 2: Update formatCompanyAddresses with new fields**

In the `formatCompanyAddresses` function, update the address display to include building/flat number, commune, district, voivodeship. In the `addresses.forEach` loop, after the street row add:

```typescript
    if (addr.buildingNumber) {
      const flatStr = addr.flatNumber ? `/${addr.flatNumber}` : '';
      result += `| **${t.buildingNumber}** | ${addr.buildingNumber}${flatStr} |\n`;
    }
    if (addr.commune) {
      result += `| **${t.commune}** | ${addr.commune} |\n`;
    }
    if (addr.district) {
      result += `| **${t.district}** | ${addr.district} |\n`;
    }
    if (addr.voivodeship) {
      result += `| **${t.voivodeship}** | ${addr.voivodeship} |\n`;
    }
```

- [ ] **Step 3: Add formatPublicRegistryData function**

Add at the end of the file, before the closing:

```typescript
/**
 * Format public registry data (MF Biala Lista + KRS)
 */
export function formatPublicRegistryData(data: PublicRegistryData, locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);

  let result = `## ${t.publicRegistryTitle}\n\n`;
  result += `| ${t.companyTitle} | |\n`;
  result += '|-------|-------|\n';

  if (data.regon) {
    result += `| **${t.regon}** | ${data.regon} |\n`;
  }
  if (data.krs) {
    result += `| **${t.krs}** | ${data.krs} |\n`;
  }
  if (data.vatStatus) {
    const statusLabel = data.vatStatus === 'czynny' ? t.vatStatusCzynny
      : data.vatStatus === 'zwolniony' ? t.vatStatusZwolniony
      : t.vatStatusNiezarejestrowany;
    const icon = data.vatStatus === 'czynny' ? ' ✅' : data.vatStatus === 'zwolniony' ? ' ⚠️' : ' ❌';
    result += `| **${t.vatStatus}** | ${statusLabel}${icon} |\n`;
  }

  if (data.verifiedBankAccounts && data.verifiedBankAccounts.length > 0) {
    result += `\n### ${t.verifiedAccounts}\n\n`;
    data.verifiedBankAccounts.forEach((acc, i) => {
      result += `${i + 1}. \`${acc}\`\n`;
    });
  }

  if (data.krsData) {
    result += '\n### KRS\n\n';
    result += `| ${t.companyTitle} | |\n`;
    result += '|-------|-------|\n';
    if (data.krsData.legalForm) {
      result += `| **${t.legalForm}** | ${data.krsData.legalForm} |\n`;
    }
    if (data.krsData.shareCapital) {
      result += `| **${t.shareCapital}** | ${data.krsData.shareCapital} |\n`;
    }
    if (data.krsData.registrationDate) {
      result += `| **${t.registrationDate}** | ${data.krsData.registrationDate} |\n`;
    }
    if (data.krsData.boardMembers && data.krsData.boardMembers.length > 0) {
      result += `\n#### ${t.boardMembers}\n\n`;
      data.krsData.boardMembers.forEach((m) => {
        result += `- **${m.name}** — ${m.role}\n`;
      });
    }
  }

  return result;
}
```

- [ ] **Step 4: Update formatCompanyDetails to include public registry**

Update the `formatCompanyDetails` function signature and body. Add an import for `PublicRegistryData`:

```typescript
import {
  WFirmaCompany,
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
  WFirmaCompanyPack,
  WFirmaCompanyDetails,
  CompanyPackType,
  PublicRegistryData,
} from '../../../types/wfirma.types';
```

Update the function:

```typescript
export function formatCompanyDetails(
  details: WFirmaCompanyDetails,
  locale: Locale = 'pl',
  publicRegistry?: PublicRegistryData,
): string {
  let result = formatCompanyInfo(details, locale);
  result += '\n\n';
  result += formatCompanyAccounts(details.accounts, locale);
  result += '\n\n';
  result += formatCompanyAddresses(details.addresses, locale);
  result += '\n\n';
  result += formatCompanyPack(details.pack || null, locale);

  if (publicRegistry) {
    result += '\n\n';
    result += formatPublicRegistryData(publicRegistry, locale);
  }

  return result;
}
```

- [ ] **Step 5: Add formatPublicRegistryData to the formatters index export**

In `packages/api/src/services/ai-chat/formatters/index.ts`, update the company formatter export block (line 6-12):

```typescript
export {
  formatCompanyInfo,
  formatCompanyAccounts,
  formatCompanyAddresses,
  formatCompanyPack,
  formatCompanyDetails,
  formatPublicRegistryData,
} from './company.formatter';
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/services/ai-chat/formatters/company.formatter.ts packages/api/src/services/ai-chat/formatters/index.ts
git commit -m "feat(formatter): add public registry data and new company fields to formatter (AIA-80)"
```

---

### Task 7: Update AI tools (get_company_info + lookup_company_by_nip)

**Files:**
- Modify: `packages/api/src/services/ai-chat/tools/company.tool.ts`
- Modify: `packages/api/src/services/ai-chat/tools/index.ts`
- Modify: `packages/api/src/services/ai-chat/ai-chat.service.ts:512`

- [ ] **Step 1: Update get_company_info tool**

In `company.tool.ts`, update the `createGetCompanyInfoTool` function to accept `CompanyEnrichmentService` and call `getCompanyDetails()` + `enrichByNip()`:

Update the function signature:

```typescript
import { CompanyEnrichmentService } from '../../company-enrichment.service';
import {
  formatCompanyInfo,
  formatCompanyAccounts,
  formatCompanyAddresses,
  formatCompanyDetails,
  formatPublicRegistryData,
} from '../formatters';
```

```typescript
export function createGetCompanyInfoTool(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  enrichmentService: CompanyEnrichmentService,
  userId: string,
  locale: Locale = 'pl',
  subscriptionService?: SubscriptionService
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  return (tool as any)(
    async () => {
      try {
        const limitError = await checkWFirmaLimit(subscriptionService, userId, locale);
        if (limitError) return limitError;

        // Check cache for full details
        const cached = await cacheService.getCachedData<WFirmaCompanyDetails>(
          userId, 'company', 'details'
        );

        let companyDetails: WFirmaCompanyDetails;
        if (cached) {
          companyDetails = cached;
        } else {
          companyDetails = await wfirmaService.getCompanyDetails();
          await cacheService.cacheData(userId, 'company', 'details', companyDetails);
          await incrementWFirmaUsage(subscriptionService, userId);
        }

        // Enrich with public registry (does not consume wfirma usage)
        const publicRegistry = await enrichmentService.enrichByNip(companyDetails.nip, userId);

        return formatCompanyDetails(companyDetails, locale, publicRegistry || undefined);
      } catch (error) {
        logger.error('Failed to get company info', { error });
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_company_info',
      description: 'Get complete company information from wFirma and public registries (name, NIP, REGON, KRS, VAT status, addresses, bank accounts, subscription). Use when user asks about their company data.',
      schema: z.object({}),
    }
  );
}
```

- [ ] **Step 2: Add lookup_company_by_nip tool**

Add new function to `company.tool.ts`:

```typescript
import { validateNip } from '../../company-enrichment.service';

/**
 * Tool for looking up any Polish company by NIP in public registries
 */
export function createLookupCompanyByNipTool(
  enrichmentService: CompanyEnrichmentService,
  userId: string,
  locale: Locale = 'pl',
): StructuredToolInterface {
  const t = getCompanyTranslations(locale);

  return (tool as any)(
    async (input: { nip: string }) => {
      try {
        if (!validateNip(input.nip)) {
          return t.invalidNip;
        }

        const data = await enrichmentService.enrichByNip(input.nip, userId);

        if (!data) {
          return t.nipNotFound;
        }

        return formatPublicRegistryData(data, locale);
      } catch (error) {
        logger.error('Failed to lookup company by NIP', { nip: input.nip, error });
        return `Error: ${t.errorFetchPublicRegistry}`;
      }
    },
    {
      name: 'lookup_company_by_nip',
      description: 'Look up any Polish company by NIP in public registries (REGON, KRS, VAT status, verified bank accounts, board members). Use when user asks to check or verify a company by NIP.',
      schema: z.object({
        nip: z.string().regex(/^\d{10}$/).describe('Polish NIP number (10 digits)'),
      }),
    }
  );
}
```

- [ ] **Step 3: Update createAllTools in index.ts**

In `packages/api/src/services/ai-chat/tools/index.ts`:

Add import:
```typescript
import { CompanyEnrichmentService } from '../../company-enrichment.service';
import { createLookupCompanyByNipTool } from './company.tool';
```

Update `createAllTools` signature to add `enrichmentService` parameter after `cacheService`:

```typescript
export function createAllTools(
  wfirmaService: WFirmaIntegrationService,
  cacheService: WFirmaCacheService,
  enrichmentService: CompanyEnrichmentService,
  fileStorageService: FileStorageService,
  userId: string,
  locale: Locale,
  subscriptionService?: SubscriptionService,
  hrService?: HRService,
  ksefService?: KSeFService,
  ksefContractorService?: KSeFContractorService,
): StructuredToolInterface[] {
```

Update the `createGetCompanyInfoTool` call (line 242) to pass `enrichmentService`:

```typescript
    createGetCompanyInfoTool(wfirmaService, cacheService, enrichmentService, userId, locale, subscriptionService),
```

Add `createLookupCompanyByNipTool` after the company tools section:

```typescript
    createLookupCompanyByNipTool(enrichmentService, userId, locale),
```

- [ ] **Step 4: Update ai-chat.service.ts**

In `packages/api/src/services/ai-chat/ai-chat.service.ts`, update the `createAllTools` call (line 512):

Add import:
```typescript
import { companyEnrichmentService } from '../company-enrichment.instance';
```

Update the call:
```typescript
    const tools = createAllTools(wfirmaService, this.cacheService, companyEnrichmentService, this.fileStorageService, userId, locale, subscriptionService, hrService, ksefService, ksefContractorService);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/ai-chat/tools/company.tool.ts packages/api/src/services/ai-chat/tools/index.ts packages/api/src/services/ai-chat/ai-chat.service.ts
git commit -m "feat(tools): upgrade get_company_info, add lookup_company_by_nip tool (AIA-80)"
```

---

### Task 8: Write unit tests for CompanyEnrichmentService

**Files:**
- Create: `packages/api/src/services/__tests__/company-enrichment.service.test.ts`

- [ ] **Step 1: Create test file**

Create `packages/api/src/services/__tests__/company-enrichment.service.test.ts`:

```typescript
import { CompanyEnrichmentService, validateNip } from '../company-enrichment.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache service
const mockCacheService = {
  getCachedData: jest.fn(),
  getCachedDataAllowStale: jest.fn(),
  cacheData: jest.fn(),
};

describe('validateNip', () => {
  it('should validate correct NIP', () => {
    // 5833510147 is a real NIP (Micode Sp. z o. o.)
    expect(validateNip('5833510147')).toBe(true);
  });

  it('should reject NIP with wrong checksum', () => {
    expect(validateNip('5833510148')).toBe(false);
  });

  it('should reject non-10-digit strings', () => {
    expect(validateNip('123')).toBe(false);
    expect(validateNip('abcdefghij')).toBe(false);
    expect(validateNip('')).toBe(false);
  });
});

describe('CompanyEnrichmentService', () => {
  let service: CompanyEnrichmentService;

  beforeEach(() => {
    service = new CompanyEnrichmentService(mockCacheService as any);
    jest.clearAllMocks();
  });

  describe('enrichByNip', () => {
    it('should return cached data if available', async () => {
      const cachedData = { nip: '5833510147', regon: '523456789' };
      mockCacheService.getCachedData.mockResolvedValue(cachedData);

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from MF and KRS when cache is empty', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('wl-api.mf.gov.pl')) {
          return Promise.resolve({
            data: {
              result: {
                subject: {
                  regon: '523456789',
                  krs: '0001234567',
                  statusVat: 'Czynny',
                  accountNumbers: ['PL12345678901234567890123456'],
                },
              },
            },
          });
        }
        if (url.includes('OdpisSzukaj')) {
          return Promise.resolve({
            data: { items: [{ krsNumber: '0001234567' }] },
          });
        }
        if (url.includes('OdpisAktualny')) {
          return Promise.resolve({
            data: {
              odpis: {
                dane: {
                  formaPrawna: 'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
                  kapitalZakladowy: { wartosc: '5000.00', waluta: 'PLN' },
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeDefined();
      expect(result!.regon).toBe('523456789');
      expect(result!.krs).toBe('0001234567');
      expect(result!.vatStatus).toBe('czynny');
      expect(result!.verifiedBankAccounts).toEqual(['PL12345678901234567890123456']);
      expect(result!.krsData?.legalForm).toBe('SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
      expect(result!.krsData?.shareCapital).toBe('5000.00 PLN');
      expect(mockCacheService.cacheData).toHaveBeenCalled();
    });

    it('should return partial data when KRS fails', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('wl-api.mf.gov.pl')) {
          return Promise.resolve({
            data: { result: { subject: { regon: '523456789', statusVat: 'Czynny' } } },
          });
        }
        return Promise.reject(new Error('KRS unavailable'));
      });

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeDefined();
      expect(result!.regon).toBe('523456789');
      expect(result!.krsData).toBeUndefined();
    });

    it('should fall back to stale cache when all APIs fail', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      const staleData = { nip: '5833510147', regon: '523456789' };
      mockCacheService.getCachedDataAllowStale.mockResolvedValue(staleData);

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toEqual(staleData);
      expect(mockCacheService.getCachedDataAllowStale).toHaveBeenCalled();
    });

    it('should return null when all APIs fail and no stale cache', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.getCachedDataAllowStale.mockResolvedValue(null);

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/api && npx jest --testPathPattern=company-enrichment --verbose 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/__tests__/company-enrichment.service.test.ts
git commit -m "test: add unit tests for CompanyEnrichmentService (AIA-80)"
```

---

### Task 9: Verify build and test suite

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compilation**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `cd packages/api && npm test 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Run linter**

Run: `cd packages/api && npm run lint 2>&1 | tail -20`
Expected: No new errors

- [ ] **Step 4: Test MF Biala Lista API manually**

Run a quick verification that the API returns data for the known NIP:

```bash
curl -s "https://wl-api.mf.gov.pl/api/search/nip/5833510147?date=$(date +%Y-%m-%d)" | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d).result.subject,null,2).substring(0,500)))"
```

Expected: JSON with regon, statusVat, accountNumbers

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/test issues from company enrichment (AIA-80)"
```
