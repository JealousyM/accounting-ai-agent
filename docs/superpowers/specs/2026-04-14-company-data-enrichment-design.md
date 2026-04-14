# Company Data Enrichment — Design Spec

**Issue:** [AIA-80](https://github.com/micode-ai/accounting-ai-agent/issues/90)
**Date:** 2026-04-14

## Problem

`get_company_info` AI tool only calls wFirma `/companies/find` which returns limited data (name, NIP, vat_payer, tax type). Address, bank accounts, and subscription require separate tool calls. REGON, KRS, PKD codes, and VAT status are unavailable — wFirma doesn't return them.

## Solution

Two-part improvement:

1. **Aggregate wFirma data** — `get_company_info` calls `getCompanyDetails()` to return company + addresses + accounts + pack in one response
2. **Enrich with Polish public APIs** — new `CompanyEnrichmentService` fetches REGON, KRS, VAT status from MF Biala Lista and KRS API (both free, no auth)

## Architecture

```
get_company_info (tool)
  ├── WFirmaCompanyService.getCompanyDetails()      [existing]
  │     ├── /companies/find         → base data + new fields
  │     ├── /company_addresses/find → addresses + new fields
  │     ├── /company_accounts/find  → bank accounts
  │     └── /company_packs/find     → subscription
  └── CompanyEnrichmentService.enrichByNip(nip)      [new]
        ├── MF Biala Lista API  → regon, krs, vat_status, verified_accounts
        └── KRS API             → board_members, share_capital, legal_form
        └── Cache: WFirmaCacheService (type: 'public_registry', TTL 24h)

lookup_company_by_nip (tool)                          [new]
  └── CompanyEnrichmentService.enrichByNip(nip)
```

## Data Model

### Extended WFirmaCompany (new fields from /companies/find)

```typescript
interface WFirmaCompany {
  // existing: id, name, nip, address, bankAccounts, email, phone, website
  altname?: string;           // short name
  vatPayer?: boolean;         // VAT payer flag
  taxType?: string;           // 'ledger_register' | 'lump_register' etc.
  bookStartDate?: string;     // accounting start date
  packRights?: string[];      // ['trade', 'book', 'fk', 'staff']
}
```

### Extended WFirmaCompanyAddress (new fields from /company_addresses/find)

```typescript
interface WFirmaCompanyAddress {
  // existing: id, type, street, city, zip, country, isMain
  buildingNumber?: string;
  flatNumber?: string;
  commune?: string;          // gmina
  district?: string;         // powiat
  voivodeship?: string;      // wojewodztwo
}
```

### New: PublicRegistryData

```typescript
interface PublicRegistryData {
  nip: string;
  regon?: string;
  krs?: string;
  vatStatus?: 'czynny' | 'zwolniony' | 'niezarejestrowany';
  vatStatusDate?: string;
  verifiedBankAccounts?: string[];
  krsData?: {
    legalForm?: string;
    shareCapital?: string;
    boardMembers?: { name: string; role: string }[];
    registrationDate?: string;
  };
}
```

### Aggregated response

```typescript
interface CompanyFullInfo {
  wfirma: WFirmaCompanyDetails;
  publicRegistry?: PublicRegistryData;
}
```

`regon` and `krs` are removed from `WFirmaCompany` — wFirma doesn't return them; they live in `PublicRegistryData`.

## Public APIs

### MF Biala Lista (wl-api.mf.gov.pl)

- **Auth:** None
- **Endpoint:** `GET /api/search/nip/{nip}?date={YYYY-MM-DD}`
- **Returns:** regon, krs, vatStatus, registered bank accounts, company name, address
- **Rate limit:** 10 req/s per IP

### KRS API (api-krs.ms.gov.pl)

- **Auth:** None
- **Endpoint:** `GET /api/krs/OdpisSzukaj?nip={nip}` then `GET /api/krs/OdpisAktualny/{krsNumber}?rejestr=P&format=json`
- **Returns:** board members, share capital, legal form, registration date
- **Note:** Only covers companies (sp. z o.o., S.A.), not sole proprietors (JDG)

## AI Tools

### get_company_info (modified)

- Calls `getCompanyDetails()` + `enrichByNip(company.nip)`
- Formats via `formatCompanyDetails()` + `formatPublicRegistryData()`
- Cache keys: `company:details` (wFirma TTL) + `public_registry:{nip}` (24h TTL)
- Does NOT consume `wfirmaRequestsUsed` for public API calls

### lookup_company_by_nip (new)

- Parameter: `nip: string` (Zod: 10 digits)
- Calls `CompanyEnrichmentService.enrichByNip(nip)` only
- Works with any Polish NIP, not just own company
- Cache: `public_registry:{nip}`, 24h TTL
- Does NOT consume `wfirmaRequestsUsed`

## Formatting

`formatCompanyInfo` updated with:
- Altname (if different from name)
- VAT payer: Yes/No
- Tax type: KPiR / Ryczalt
- Book start date
- Address with building/flat number (e.g., "ul. Heweliusza 11/811")

New `formatPublicRegistryData` function:
- REGON, KRS, VAT status with icon
- Verified bank accounts
- KRS data (legal form, share capital, board members) — only if available

`formatCompanyDetails` combines all sections. If public data unavailable, that section is simply omitted.

Localization: new keys in `i18n/index.ts` for pl/en/ru.

## Error Handling

- Each public API call has 5s timeout
- On error: `logger.warn()`, return `null` for that source
- Fallback order: fresh data → stale cache → `null`
- `get_company_info` always returns at least wFirma data
- MF and KRS called via `Promise.allSettled()` — one can fail without affecting the other
- KRS not found is normal for sole proprietors (JDG) — `krsData` = `undefined`
- MF empty `subjects` array — company not in VAT registry, `vatStatus` = `undefined`

## Files to Create/Modify

### New files
- `packages/api/src/services/company-enrichment.service.ts` — MF + KRS API client + caching
- `packages/api/src/services/company-enrichment.instance.ts` — singleton

### Modified files
- `packages/api/src/types/wfirma.types.ts` — new types, extended interfaces
- `packages/api/src/services/wfirma/company.service.ts` — extract new fields
- `packages/api/src/services/ai-chat/tools/company.tool.ts` — modify get_company_info, add lookup_company_by_nip
- `packages/api/src/services/ai-chat/formatters/company.formatter.ts` — new fields + public registry formatter
- `packages/api/src/i18n/index.ts` — new translation keys (pl/en/ru)
