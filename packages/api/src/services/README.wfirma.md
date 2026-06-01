# wFirma Integration Service

## Overview

The wFirma Integration Service provides a robust interface for interacting with the wFirma API. It handles authentication, data fetching, error handling, and automatic retry logic for failed requests.

## Features

- **Company Data Management**: Fetch company information from wFirma
- **Contractor Management**: List and create contractors (with NIP autofill — see `CompanyEnrichmentService.enrichByNip` populating name / REGON / address from the public registry when only a NIP is given to `create_contractor`)
- **Financial Data**: Retrieve financial summaries by year
- **Data Synchronization**: Sync data from wFirma to local cache
- **Automatic Retry Logic**: Configurable retry mechanism with exponential backoff
- **Comprehensive Error Handling**: Specific error types for different failure scenarios
- **Connection Health Checks**: Verify wFirma API connectivity
- **Public Registry Enrichment**: name, REGON, KRS, VAT status, working/residence addresses from MF Biała Lista; legal form / share capital / board members from KRS API
- **Biała Lista bank-account verification**: `CompanyEnrichmentService.verifyBankAccount(nip, accountNumber, userId, date?)` calls the MF check endpoint and returns the MF Request ID as legal proof. Used by the `verify_bank_account_white_list` AI tool which the agent invokes automatically for payments ≥ 15 000 PLN.
- **Tax Register (KPiR)**: KPiR entries with monthly sums and cumulative totals

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
WFIRMA_API_KEY=your_wfirma_api_key_here
WFIRMA_API_URL=https://api.wfirma.pl
WFIRMA_COMPANY_ID=your_company_id
```

### Programmatic Configuration

```typescript
import { WFirmaIntegrationService } from './services/wfirma-integration.service';

const service = new WFirmaIntegrationService({
  apiKey: 'your-api-key',
  apiUrl: 'https://api.wfirma.pl',
  companyId: 'your-company-id',
  timeout: 30000,
  retryAttempts: 3,
});
```

## Usage

### Using the Singleton Instance

```typescript
import { wfirmaIntegrationService } from './services/wfirma-integration.instance';

// Get company data
const company = await wfirmaIntegrationService.getCompanyData();
console.log(company.name, company.nip);

// Get contractors
const contractors = await wfirmaIntegrationService.getContractors({
  search: 'Kowalski',
  limit: 10,
});

// Create a new contractor
const newContractor = await wfirmaIntegrationService.createContractor({
  name: 'Jan Kowalski',
  nip: '1234567890',
  email: 'jan@example.com',
  address: {
    street: 'ul. Testowa 1',
    city: 'Warszawa',
    zip: '00-001',
    country: 'Polska',
  },
});

// Get financial data
const financialData = await wfirmaIntegrationService.getFinancialData(2024);
console.log('Revenue:', financialData.revenue);
console.log('Profit:', financialData.profit);

// Sync all data
const syncResult = await wfirmaIntegrationService.syncDataFromWFirma();
if (syncResult.success) {
  console.log(`Synced ${syncResult.itemsSynced} items`);
} else {
  console.error('Sync errors:', syncResult.errors);
}

// Check connection
const isConnected = await wfirmaIntegrationService.checkConnection();
console.log('wFirma API connected:', isConnected);
```

## API Methods

### `getCompanyData(): Promise<WFirmaCompany>`

Fetches the current company data from wFirma.

**Returns:** Company information including name, NIP, address, and bank accounts.

**Throws:** 
- `WFirmaAuthenticationError` - Invalid API key
- `WFirmaConnectionError` - Connection failed after retries

### `getContractors(filters?: ContractorFilters): Promise<WFirmaContractor[]>`

Retrieves a list of contractors with optional filtering.

**Parameters:**
- `filters.search` - Search term for contractor name
- `filters.nip` - Filter by NIP number
- `filters.limit` - Maximum number of results (default: 100)
- `filters.offset` - Pagination offset (default: 0)

**Returns:** Array of contractors

### `createContractor(data: ContractorData): Promise<WFirmaContractor>`

Creates a new contractor in wFirma.

**Parameters:**
- `data.name` - Contractor name (required)
- `data.nip` - NIP number
- `data.email` - Email address
- `data.address` - Address object
- `data.bankAccount` - Bank account number

**Returns:** Created contractor with assigned ID

**Throws:**
- `WFirmaValidationError` - Invalid or missing required fields

### `getFinancialData(year: number): Promise<FinancialData>`

Retrieves financial summary for a specific year.

**Parameters:**
- `year` - Year for financial data (e.g., 2024)

**Returns:** Financial data including revenue, expenses, profit, and taxes paid

### `syncDataFromWFirma(): Promise<SyncResult>`

Synchronizes all data from wFirma (company, contractors, financial data).

**Returns:** Sync result with success status, items synced count, and any errors

### `getTaxRegisters(params: { year: number; month?: number }): Promise<TaxRegisterData>`

Gets KPiR (Tax Register) entries for a given year and optional month.

**Parameters:**
- `params.year` - Year for KPiR data (e.g., 2026)
- `params.month` - Optional month (1-12) to filter entries

**Returns:** KPiR entries with monthly sums and cumulative totals

### `checkConnection(): Promise<boolean>`

Checks if the wFirma API is accessible.

**Returns:** `true` if connected, `false` otherwise

## Error Handling

The service provides specific error types for different failure scenarios:

### `WFirmaAuthenticationError`

Thrown when API authentication fails (401/403 status codes).

```typescript
try {
  await service.getCompanyData();
} catch (error) {
  if (error instanceof WFirmaAuthenticationError) {
    console.error('Invalid API key or insufficient permissions');
  }
}
```

### `WFirmaValidationError`

Thrown when request data is invalid (400/422 status codes).

```typescript
try {
  await service.createContractor({ name: '' }); // Invalid: empty name
} catch (error) {
  if (error instanceof WFirmaValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

### `WFirmaConnectionError`

Thrown when connection to wFirma fails or times out.

```typescript
try {
  await service.getCompanyData();
} catch (error) {
  if (error instanceof WFirmaConnectionError) {
    console.error('Cannot connect to wFirma API');
  }
}
```

### `WFirmaError`

Base error class for all wFirma-related errors.

## Retry Logic

The service automatically retries failed requests with exponential backoff:

- **Default max attempts:** 3
- **Initial delay:** 1000ms
- **Backoff multiplier:** 2x

**Retry behavior:**
- ✅ Retries on: Network errors, server errors (5xx), timeouts
- ❌ Does not retry on: Authentication errors, validation errors

**Configuration:**

```typescript
const service = new WFirmaIntegrationService({
  retryAttempts: 5, // Custom retry count
});
```

## Logging

The service uses Winston logger for comprehensive logging:

- **Debug:** API requests and responses
- **Info:** Successful operations
- **Warn:** Retry attempts
- **Error:** Failed operations

## Company Enrichment Service

The `CompanyEnrichmentService` (`company-enrichment.service.ts`) supplements wFirma company data with information from Polish public registries. It does not depend on wFirma — it works with any Polish NIP.

### Public APIs Used

| API | Base URL | Auth | Returns |
|-----|----------|------|---------|
| MF Biała Lista | `wl-api.mf.gov.pl` | None | REGON, KRS, VAT status, verified bank accounts |
| KRS API | `api-krs.ms.gov.pl` | None | Board members, share capital, legal form |

### Usage

```typescript
import { companyEnrichmentService } from './company-enrichment.instance';

// Look up any company by NIP
const data = await companyEnrichmentService.enrichByNip('5833510147', userId);
// Returns: { nip, regon, krs, vatStatus, verifiedBankAccounts, krsData }

// Validate NIP (with modulo 11 checksum)
import { validateNip } from './company-enrichment.service';
validateNip('5833510147'); // true
```

### Caching Strategy

- Cache type: `public_registry` (24h TTL)
- Stored per-user via `WFirmaCacheService`
- Stale cache fallback: `getCachedDataAllowStale()` returns expired entries when APIs fail
- Both MF and KRS called via `Promise.allSettled()` — partial results returned on partial failure

## Cache Integration Pattern

Use `WFirmaCacheService` alongside `WFirmaIntegrationService` to avoid redundant API calls. The pattern: check cache → on miss fetch from wFirma → store result; on write mutations, invalidate the relevant cache key.

```typescript
import { wfirmaIntegrationService } from './wfirma-integration.instance';
import { WFirmaCacheService } from './wfirma-cache.service';
import { prisma } from '../lib/prisma';

const wfirmaService = wfirmaIntegrationService;
const cacheService = new WFirmaCacheService(prisma);

// Read-through: company data
async function getCompanyData(userId: string, forceRefresh = false) {
  const cached = await cacheService.getCachedData<WFirmaCompany>(
    userId, 'company', 'main-company', { forceRefresh }
  );
  if (cached) return cached;

  const data = await wfirmaService.getCompanyData();
  await cacheService.cacheData(userId, 'company', 'main-company', data);
  return data;
}

// Write-through: create contractor and invalidate list cache
async function createContractor(userId: string, data: ContractorData) {
  const contractor = await wfirmaService.createContractor(data);
  await cacheService.invalidateCache(userId, 'contractor');
  await cacheService.cacheData(userId, 'contractor', contractor.id, contractor);
  return contractor;
}

// Bulk sync: invalidate all, then repopulate
async function syncAllData(userId: string) {
  await cacheService.invalidateAllCache(userId);
  const [company, contractors] = await Promise.all([
    getCompanyData(userId, true),
    wfirmaService.getContractors(),
  ]);
  await cacheService.cacheData(userId, 'contractor', 'all-contractors', contractors);
  return { company, contractors };
}
```

Cache key conventions used in this project:
- Company: `'company'` / `'main-company'`
- Contractors list: `'contractor'` / `'all-contractors'`
- Individual contractor: `'contractor'` / `contractor.id`
- Financial year: `'financial'` / `'financial-{year}'`

## Testing

Run the test suite:

```bash
npm test -- wfirma-integration.service.test.ts
```

The test suite includes:
- Unit tests for all public methods
- Error handling scenarios
- Retry logic verification
- Mock wFirma API responses

## Integration with Corporate Resolutions Manager

The wFirma Integration Service is used throughout the Corporate Resolutions Manager to:

1. **Fetch company data** for populating resolution documents
2. **Retrieve contractors** for payment recipient information
3. **Get financial data** for dividend calculations
4. **Sync data** for local caching and offline access

## API Documentation

For complete wFirma API documentation, visit: https://doc.wfirma.pl

## Support

For issues or questions about the wFirma integration:
1. Check the wFirma API documentation
2. Review error logs for specific error codes
3. Verify API key permissions in wFirma dashboard
4. Contact wFirma support for API-specific issues
