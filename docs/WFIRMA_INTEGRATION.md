# wFirma Integration

This document describes the integration with the wFirma Polish accounting system.

## Overview

wFirma is a Polish online accounting system. The Accounting AI Agent integrates with wFirma to provide:

- Company data management
- Contractor/customer management (with NIP autofill from public registry)
- Invoice creation and management
- Payment tracking (with Biała Lista MF guard for ≥ 15 000 PLN payments)
- Expense management
- Vehicle fleet management
- Tax declarations (JPK VAT, PIT)
- Document management

## Polish Public Registry Integration (CompanyEnrichmentService)

Beyond pure wFirma calls, the platform pulls free data from official Polish public registries to reduce manual entry and guard against compliance failures:

### MF Biała Lista (Wykaz podatników VAT)

Two distinct uses:

1. **Subject lookup** — `enrichByNip(nip, userId)` returns name, REGON, KRS, VAT status (`czynny` / `zwolniony` / `niezarejestrowany`), verified bank accounts, and the seller's working / residence addresses. Used by:
   - `lookup_company_by_nip` AI tool — direct lookup
   - `create_contractor` AI tool — autofill of name / REGON / street / city / zip when only a NIP is provided. The confirmation card lists which fields were auto-filled.

2. **Bank-account verification** — `verifyBankAccount(nip, accountNumber, userId, date?)` calls the dedicated MF endpoint `/api/check/nip/{nip}/bank-account/{account}?date={YYYY-MM-DD}` and returns a structured result including the **MF Request ID** (legal proof of the check).
   - Exposed as the `verify_bank_account_white_list` AI tool.
   - The system prompt instructs the agent to invoke this tool automatically before confirming any payment ≥ 15 000 PLN. Paying to an unverified account disqualifies the cost as KUP and triggers joint VAT liability under Art. 117ba Ordynacji podatkowej + Art. 19 Prawa przedsiębiorców.
   - Cached for 24h by `(nip, accountNumber, date)` triple in the `public_registry` cache type.
   - On MF outage, falls back to the most recent stale cached result rather than blocking the user.

### KRS (court register)

Returns legal form, share capital, board members for limited companies (sp. z o.o., S.A.). Sole proprietors are not in KRS — for those, Biała Lista is the only source.

### Receipt OCR (Telegram photo handler)

Photographs of paragony / faktury sent to the Telegram bot are processed by `ReceiptOCRService` (OpenAI GPT-4o vision) and replied with a structured markdown card. This is *not* a wFirma call — it's a separate service that lives in `packages/api/src/services/ocr/`. Direct creation of a wFirma expense from the recognized receipt is a planned follow-up; today the user copies the data into wFirma manually or asks the AI to log it by text.

## Configuration

### Environment Variables

```env
WFIRMA_APP_KEY=your-app-key
WFIRMA_API_URL=https://api2.wfirma.pl
```

### Getting API Credentials

1. Log in to [wFirma.pl](https://wfirma.pl)
2. Go to Settings → API Access
3. Generate API keys
4. Note your Company ID from the URL

### Service Configuration

```typescript
import { WFirmaIntegrationService } from './services/wfirma-integration.service';

const service = new WFirmaIntegrationService({
  accessKey: process.env.WFIRMA_ACCESS_KEY,
  secretKey: process.env.WFIRMA_SECRET_KEY,
  appKey: process.env.WFIRMA_APP_KEY,
  companyId: process.env.WFIRMA_COMPANY_ID,
  timeout: 30000,
  retryAttempts: 3,
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WFIRMA INTEGRATION                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│    AI Agents      │────>│   wFirma Tools    │────>│  Integration      │
│                   │     │                   │     │   Service         │
│ • Contractor      │     │ • get_invoices    │     │                   │
│ • Invoice         │     │ • create_invoice  │     │ • API calls       │
│ • Financial       │     │ • get_contractors │     │ • Retry logic     │
│ • Tax             │     │ • etc (55 tools)  │     │ • Error handling  │
└───────────────────┘     └───────────────────┘     └───────────────────┘
                                    │                        │
                                    │                        ▼
                                    │              ┌───────────────────┐
                                    │              │    Cache          │
                                    │              │    Service        │
                                    │              │                   │
                                    │              │ • TTL-based       │
                                    │              │ • PostgreSQL      │
                                    │              │ • Invalidation    │
                                    │              └───────────────────┘
                                    │                        │
                                    └────────────────────────┤
                                                            ▼
                                               ┌───────────────────┐
                                               │   wFirma API      │
                                               │                   │
                                               │ api2.wfirma.pl    │
                                               └───────────────────┘
```

## Public Registry Enrichment

In addition to wFirma data, the system enriches company information with data from Polish public registries:

### MF Biała Lista (wl-api.mf.gov.pl)
- **Auth:** None required
- **Data:** REGON, KRS, VAT status (czynny/zwolniony/niezarejestrowany), verified bank accounts
- **Rate limit:** 10 req/s per IP

### KRS API (api-krs.ms.gov.pl)
- **Auth:** None required
- **Data:** Board members, share capital, legal form, registration date
- **Note:** Only covers companies (sp. z o.o., S.A.), not sole proprietors (JDG)

### Architecture

```
get_company_info (AI tool)
  ├── WFirmaCompanyService.getCompanyDetails()
  │     ├── /companies/find         → name, NIP, altname, VAT payer, tax type
  │     ├── /company_addresses/find → addresses with building/flat numbers
  │     ├── /company_accounts/find  → bank accounts
  │     └── /company_packs/find     → subscription (optional, may not be available)
  └── CompanyEnrichmentService.enrichByNip()
        ├── MF Biała Lista API  → REGON, KRS, VAT status, verified accounts
        └── KRS API             → board members, share capital, legal form
```

### Caching
- Public registry data cached with 24h TTL
- Stale cache used as fallback when APIs are unavailable
- Cache stored per-user in `wfirma_cache` table (type: `public_registry`)

### Error Handling
- APIs called via `Promise.allSettled()` — one can fail without affecting the other
- Fallback order: fresh data → stale cache → null
- `get_company_info` always returns at least wFirma data even if public APIs fail

## Integration Service

### Basic Usage

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

// Check connection
const isConnected = await wfirmaIntegrationService.checkConnection();
```

### Error Handling

```typescript
import {
  WFirmaAuthenticationError,
  WFirmaValidationError,
  WFirmaConnectionError,
} from './errors/wfirma.errors';

try {
  await wfirmaIntegrationService.getCompanyData();
} catch (error) {
  if (error instanceof WFirmaAuthenticationError) {
    console.error('Invalid API key or insufficient permissions');
  } else if (error instanceof WFirmaValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof WFirmaConnectionError) {
    console.error('Cannot connect to wFirma API');
  }
}
```

## Cache Service

The cache service reduces API calls by storing wFirma data in PostgreSQL.

### TTL Configuration

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Company | 24 hours | Rarely changes |
| Contractor | 1 hour | Occasional updates |
| Invoice | 30 minutes | Frequent updates |
| Financial | 6 hours | Daily changes |

### Usage

```typescript
import { wfirmaCacheService } from './services/wfirma-cache.instance';

// Cache data
await wfirmaCacheService.cacheData(
  'user-123',
  'company',
  'company-456',
  { name: 'Test Company', nip: '1234567890' }
);

// Get cached data
const data = await wfirmaCacheService.getCachedData(
  'user-123',
  'company',
  'company-456'
);

// Force refresh (skip cache)
const freshData = await wfirmaCacheService.getCachedData(
  'user-123',
  'company',
  'company-456',
  { forceRefresh: true }
);

// Invalidate cache
await wfirmaCacheService.invalidateCache('user-123', 'company');

// Get cache statistics
const stats = await wfirmaCacheService.getCacheStats('user-123');
```

## Available Tools (55 Total)

### Company Tools (3)

| Tool | Description |
|------|-------------|
| `get_company_info` | Company data (name, NIP, REGON, KRS, address) |
| `get_company_accounts` | Bank accounts |
| `get_company_addresses` | Company addresses |

### Contractor Tools (4)

| Tool | Description |
|------|-------------|
| `get_contractors` | List/search contractors |
| `create_contractor` | Create new contractor |
| `update_contractor` | Update contractor |
| `delete_contractor` | Delete contractor |

### Invoice Tools (10)

| Tool | Description |
|------|-------------|
| `get_invoices` | List invoices with filters |
| `get_invoice_details` | Invoice details |
| `create_invoice` | Create new invoice |
| `update_invoice` | Update invoice |
| `delete_invoice` | Delete invoice |
| `send_invoice` | Send invoice by email |
| `download_invoice` | Download invoice as PDF |
| `add_invoice_note` | Add note to invoice |
| `get_invoice_notes` | Get invoice notes |
| `delete_invoice_note` | Delete invoice note |

### Payment Tools (5)

| Tool | Description |
|------|-------------|
| `get_payments` | List payments |
| `get_payment_details` | Payment details |
| `add_payment` | Add payment |
| `update_payment` | Update payment |
| `delete_payment` | Delete payment |

### Expense Tools (2)

| Tool | Description |
|------|-------------|
| `get_expenses` | List expenses |
| `get_expense_details` | Expense details with items |

### Vehicle Tools (5)

| Tool | Description |
|------|-------------|
| `get_vehicles` | List vehicles |
| `get_vehicle_details` | Vehicle details |
| `add_vehicle` | Add vehicle |
| `update_vehicle` | Update vehicle |
| `delete_vehicle` | Delete vehicle |

### Term Tools (5)

| Tool | Description |
|------|-------------|
| `get_terms` | List appointments/deadlines |
| `get_term_details` | Term details |
| `add_term` | Add term |
| `update_term` | Update term |
| `delete_term` | Delete term |

### Term Group Tools (5)

| Tool | Description |
|------|-------------|
| `get_term_groups` | List term groups |
| `get_term_group_details` | Group details |
| `add_term_group` | Add group |
| `update_term_group` | Update group |
| `delete_term_group` | Delete group |

### User Tools (3)

| Tool | Description |
|------|-------------|
| `get_users` | List company users |
| `get_user_companies` | User-company relationships |
| `get_user_company_by_id` | Relationship details |

### Declaration Tools (2)

| Tool | Description |
|------|-------------|
| `get_jpk_vat_declaration` | JPK VAT declaration (XML) |
| `get_pit_declaration` | PIT declaration (XML) |

### Tax Register / KPiR Tools (1)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_tax_registers` | Get KPiR entries, monthly sums, and cumulative totals | `year` (required), `month` (optional) |

### Document Tools (4)

| Tool | Description |
|------|-------------|
| `get_documents` | List documents |
| `get_document_details` | Document details |
| `download_document` | Download document |
| `delete_document` | Delete document |

### Ledger Tools (4)

| Tool | Description |
|------|-------------|
| `get_fiscal_years` | List fiscal years |
| `get_fiscal_year_details` | Fiscal year details |
| `get_accounting_schemas` | List accounting schemas |
| `get_accounting_schema_details` | Schema details |

### Financial Tools (1)

| Tool | Description |
|------|-------------|
| `get_financial_summary` | Financial summary |

## Invoice Types

| Type | Code | Description |
|------|------|-------------|
| Non-VAT Invoice | `bill` | Invoice without VAT (default) |
| VAT Invoice | `normal` | Standard VAT invoice |
| Pro-forma | `proforma` | Pro-forma invoice |
| Receipt | `receipt_normal` | Receipt |
| Margin Invoice | `margin` | Margin invoice |

## Retry Logic

The service automatically retries failed requests:

- **Max attempts:** 3
- **Initial delay:** 1000ms
- **Backoff multiplier:** 2x

**Retry behavior:**
- Retries: Network errors, server errors (5xx), timeouts
- Does not retry: Authentication errors, validation errors

## Error Types

| Error | Description |
|-------|-------------|
| `WFirmaAuthenticationError` | Invalid API key or permissions (401/403) |
| `WFirmaValidationError` | Invalid request data (400/422) |
| `WFirmaConnectionError` | Connection failed or timeout |
| `WFirmaError` | Base error class |

## Performance

### Without Cache
- API call latency: ~500-1000ms
- Total time: ~500-1000ms

### With Cache (Hit)
- Database query: ~10-50ms
- Total time: ~10-50ms

**Performance improvement: 10-100x faster**

## Best Practices

1. **Always check cache first** before making API calls
2. **Invalidate cache** after mutations (create, update, delete)
3. **Use force refresh** for critical operations
4. **Handle errors gracefully** with appropriate messages
5. **Respect rate limits** - wFirma has API call limits

## Multilingual Support

All tool responses support three languages:

| Language | Code |
|----------|------|
| Polish | pl |
| English | en |
| Russian | ru |

Example response format:

```markdown
## Faktury (PL) / Invoices (EN) / Счета (RU)

| # | Numer | Klient | Kwota |
|---|-------|--------|-------|
| 1 | FV/2026/001 | ABC Corp | 5 000,00 PLN |
```

## wFirma API Documentation

For complete wFirma API documentation, visit: https://doc.wfirma.pl

## Related Documentation

- [AI Agents](./AI_AGENTS.md)
- [Database](./DATABASE.md)
- [Architecture](./ARCHITECTURE.md)
