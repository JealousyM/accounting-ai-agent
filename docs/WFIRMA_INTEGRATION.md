# wFirma Integration

This document describes the integration with the wFirma Polish accounting system.

## Overview

wFirma is a Polish online accounting system. The Accounting AI Agent integrates with wFirma to provide:

- Company data management
- Contractor/customer management
- Invoice creation and management
- Payment tracking
- Expense management
- Vehicle fleet management
- Tax declarations (JPK VAT, PIT)
- Document management

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
│ • Tax             │     │ • etc (53 tools)  │     │ • Error handling  │
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

## Available Tools (53 Total)

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
