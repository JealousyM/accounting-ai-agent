# wFirma Integration Service

## Overview

The wFirma Integration Service provides a robust interface for interacting with the wFirma API. It handles authentication, data fetching, error handling, and automatic retry logic for failed requests.

## Features

- **Company Data Management**: Fetch company information from wFirma
- **Contractor Management**: List and create contractors
- **Financial Data**: Retrieve financial summaries by year
- **Data Synchronization**: Sync data from wFirma to local cache
- **Automatic Retry Logic**: Configurable retry mechanism with exponential backoff
- **Comprehensive Error Handling**: Specific error types for different failure scenarios
- **Connection Health Checks**: Verify wFirma API connectivity
- **Public Registry Enrichment**: REGON, KRS, VAT status from MF Biała Lista and KRS API

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
